import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

// Generate webhook secret
function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString("hex")}`;
}

// GET - List all webhooks
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get("integrationId");

    // Get user's organizations
    const memberships = await prisma.member.findMany({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    const organizationIds = memberships.map((m) => m.organizationId);

    // Build query
    const whereClause: Record<string, unknown> = {
      integration: {
        OR: [
          { organizationId: { in: organizationIds } },
          { createdBy: session.user.id },
        ],
      },
    };

    if (integrationId) {
      whereClause.integrationId = integrationId;
    }

    const webhooks = await prisma.webhook.findMany({
      where: whereClause,
      include: {
        integration: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        deliveries: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            statusCode: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(webhooks);
  } catch (error) {
    console.error("❌ Error fetching webhooks:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
      { status: 500 }
    );
  }
}

// POST - Create a new webhook
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { integrationId, url, events } = body;

    if (!integrationId || !url || !events?.length) {
      return NextResponse.json(
        { error: "integrationId, url, and events are required" },
        { status: 400 }
      );
    }

    // Verify access to integration
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    if (integration.organizationId) {
      const membership = await prisma.member.findFirst({
        where: {
          userId: session.user.id,
          organizationId: integration.organizationId,
        },
      });

      if (!membership && integration.createdBy !== session.user.id) {
        return NextResponse.json(
          { error: "No access to this integration" },
          { status: 403 }
        );
      }
    }

    // Generate secret
    const secret = generateWebhookSecret();

    // Create webhook
    const webhook = await prisma.webhook.create({
      data: {
        id: `wh_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        integrationId,
        url,
        secret,
        events: JSON.stringify(events),
        enabled: true,
        maxRetries: 3,
      },
      include: {
        integration: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    // Log webhook creation
    await prisma.integrationLog.create({
      data: {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        integrationId,
        action: "webhook_created",
        status: "success",
        message: `Webhook created for events: ${events.join(", ")}`,
        metadata: JSON.stringify({
          webhookId: webhook.id,
          url,
          events,
        }),
      },
    });

    return NextResponse.json({
      ...webhook,
      secret, // Show secret only once
      message: "Webhook created. Save the secret securely - it won't be shown again.",
    });
  } catch (error) {
    console.error("❌ Error creating webhook:", error);
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 }
    );
  }
}
