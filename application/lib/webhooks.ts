import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export type WebhookEvent =
  | "board.created"
  | "board.updated"
  | "board.deleted"
  | "list.created"
  | "list.updated"
  | "list.deleted"
  | "task.created"
  | "task.updated"
  | "task.deleted"
  | "task.moved"
  | "task.assigned"
  | "checklist.created"
  | "checklist.completed"
  | "comment.created"
  | "member.added"
  | "member.removed";

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
  organizationId?: string;
  boardId?: string;
}

// Sign webhook payload with secret
function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

// Send webhook to a single endpoint
async function sendWebhook(
  webhook: {
    id: string;
    url: string;
    secret: string;
    maxRetries: number;
    integrationId: string;
  },
  payload: WebhookPayload,
  retryCount = 0
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const payloadString = JSON.stringify(payload);
  const signature = signPayload(payloadString, webhook.secret);
  const timestamp = Date.now().toString();

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": timestamp,
        "X-Webhook-Id": webhook.id,
        "User-Agent": "TekTres-Webhooks/1.0",
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const statusCode = response.status;
    const success = statusCode >= 200 && statusCode < 300;

    // Log delivery attempt
    await prisma.webhookDelivery.create({
      data: {
        id: `del_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        webhookId: webhook.id,
        event: payload.event,
        payload: payloadString,
        statusCode,
        status: success ? "success" : "failed",
        response: await response.text().catch(() => null),
        attempts: retryCount + 1,
      },
    });

    if (!success && retryCount < webhook.maxRetries) {
      // Retry with exponential backoff
      const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s...
      setTimeout(() => {
        sendWebhook(webhook, payload, retryCount + 1);
      }, delay);
    }

    return { success, statusCode };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Log failed delivery
    await prisma.webhookDelivery.create({
      data: {
        id: `del_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        webhookId: webhook.id,
        event: payload.event,
        payload: payloadString,
        statusCode: null,
        status: "failed",
        response: errorMessage,
        attempts: retryCount + 1,
      },
    });

    if (retryCount < webhook.maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000;
      setTimeout(() => {
        sendWebhook(webhook, payload, retryCount + 1);
      }, delay);
    }

    return { success: false, error: errorMessage };
  }
}

// Trigger webhooks for an event
export async function triggerWebhooks(
  event: WebhookEvent,
  data: Record<string, unknown>,
  options?: {
    organizationId?: string;
    boardId?: string;
  }
): Promise<void> {
  try {
    // Find all enabled webhooks that subscribe to this event
    const whereClause: Record<string, unknown> = {
      enabled: true,
      events: {
        has: event,
      },
      integration: {
        enabled: true,
      },
    };

    // Filter by organization or board if provided
    if (options?.organizationId) {
      whereClause.integration = {
        ...whereClause.integration as object,
        organizationId: options.organizationId,
      };
    }

    if (options?.boardId) {
      whereClause.integration = {
        ...whereClause.integration as object,
        boardId: options.boardId,
      };
    }

    const webhooks = await prisma.webhook.findMany({
      where: whereClause,
      select: {
        id: true,
        url: true,
        secret: true,
        maxRetries: true,
        integrationId: true,
      },
    });

    if (webhooks.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      organizationId: options?.organizationId,
      boardId: options?.boardId,
    };

    // Send webhooks in parallel (fire and forget)
    Promise.all(
      webhooks
        .filter((webhook) => webhook.secret !== null)
        .map((webhook) => sendWebhook(webhook as { id: string; url: string; secret: string; maxRetries: number; integrationId: string }, payload))
    ).catch((error) => {
      console.error("❌ Error sending webhooks:", error);
    });

    // Log webhook trigger
    for (const webhook of webhooks) {
      await prisma.integrationLog.create({
        data: {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          integrationId: webhook.integrationId,
          action: "webhook_triggered",
          status: "success",
          message: `Webhook triggered for event: ${event}`,
          metadata: JSON.stringify({
            webhookId: webhook.id,
            event,
          }),
        },
      });
    }
  } catch (error) {
    console.error("❌ Error triggering webhooks:", error);
  }
}

// Verify incoming webhook signature
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = signPayload(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
