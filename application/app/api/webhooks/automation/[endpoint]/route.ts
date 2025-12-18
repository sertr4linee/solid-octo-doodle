import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AutomationEngine } from "@/lib/automation-engine";
import crypto from "crypto";

// POST /api/webhooks/automation/[endpoint] - Receive incoming webhook
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ endpoint: string }> }
) {
  try {
    const { endpoint } = await params;

    // Find the webhook configuration
    const webhook = await prisma.automationWebhook.findFirst({
      where: { endpoint, enabled: true },
      include: {
        board: true,
      },
    });

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found or disabled" },
        { status: 404 }
      );
    }

    // Check IP allowlist if configured
    if (webhook.allowedIps) {
      const allowedIps = JSON.parse(webhook.allowedIps) as string[];
      const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
        || request.headers.get("x-real-ip") 
        || "unknown";
      
      if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
        return NextResponse.json(
          { error: "IP not allowed" },
          { status: 403 }
        );
      }
    }

    // Verify signature if required
    if (webhook.requireSignature) {
      const signature = request.headers.get("x-webhook-signature");
      const timestamp = request.headers.get("x-webhook-timestamp");
      
      if (!signature || !timestamp) {
        return NextResponse.json(
          { error: "Missing signature or timestamp" },
          { status: 401 }
        );
      }

      // Check timestamp is within 5 minutes
      const timestampMs = parseInt(timestamp);
      const now = Date.now();
      if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
        return NextResponse.json(
          { error: "Timestamp expired" },
          { status: 401 }
        );
      }

      // Verify HMAC signature
      const body = await request.text();
      const expectedSignature = crypto
        .createHmac("sha256", webhook.secret)
        .update(`${timestamp}.${body}`)
        .digest("hex");

      if (signature !== `sha256=${expectedSignature}`) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }

      // Re-parse body since we consumed it
      var payload = JSON.parse(body);
    } else {
      var payload = await request.json();
    }

    // Update webhook stats
    await prisma.automationWebhook.update({
      where: { id: webhook.id },
      data: {
        callCount: { increment: 1 },
        lastCalledAt: new Date(),
      },
    });

    // Parse actions and execute them
    const actions = JSON.parse(webhook.actions);
    const engine = new AutomationEngine(webhook.boardId);

    // Execute actions with webhook payload as context
    const results = await engine.processTrigger("webhook_received", {
      boardId: webhook.boardId,
      webhookPayload: payload,
      metadata: {
        webhookId: webhook.id,
        webhookName: webhook.name,
      },
    });

    return NextResponse.json({
      success: true,
      received: true,
      actionsExecuted: results.rulesExecuted,
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      {
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET for webhook verification (some services require this)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ endpoint: string }> }
) {
  try {
    const { endpoint } = await params;
    const { searchParams } = new URL(request.url);

    // Handle verification challenges
    const challenge = searchParams.get("challenge");
    if (challenge) {
      return new NextResponse(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Check if webhook exists
    const webhook = await prisma.automationWebhook.findFirst({
      where: { endpoint },
      select: { id: true, name: true, enabled: true },
    });

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "active",
      enabled: webhook.enabled,
    });
  } catch (error) {
    console.error("Error verifying webhook:", error);
    return NextResponse.json(
      { error: "Failed to verify webhook" },
      { status: 500 }
    );
  }
}
