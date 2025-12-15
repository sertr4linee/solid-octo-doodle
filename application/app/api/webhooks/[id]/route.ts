import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get webhook details
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const webhook = await prisma.webhook.findUnique({
      where: { id },
      include: {
        integration: {
          select: {
            id: true,
            name: true,
            type: true,
            organizationId: true,
            createdBy: true,
          },
        },
        deliveries: {
          take: 20,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    // Verify access
    if (webhook.integration.organizationId) {
      const membership = await prisma.member.findFirst({
        where: {
          userId: session.user.id,
          organizationId: webhook.integration.organizationId,
        },
      });

      if (!membership && webhook.integration.createdBy !== session.user.id) {
        return NextResponse.json(
          { error: "No access to this webhook" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(webhook);
  } catch (error) {
    console.error("❌ Error fetching webhook:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook" },
      { status: 500 }
    );
  }
}

// PATCH - Update webhook
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const webhook = await prisma.webhook.findUnique({
      where: { id },
      include: {
        integration: true,
      },
    });

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    // Verify access
    if (webhook.integration.organizationId) {
      const membership = await prisma.member.findFirst({
        where: {
          userId: session.user.id,
          organizationId: webhook.integration.organizationId,
        },
      });

      if (!membership && webhook.integration.createdBy !== session.user.id) {
        return NextResponse.json(
          { error: "No access to this webhook" },
          { status: 403 }
        );
      }
    }

    const { url, events, enabled, description, maxRetries } = body;

    const updatedWebhook = await prisma.webhook.update({
      where: { id },
      data: {
        ...(url !== undefined && { url }),
        ...(events !== undefined && { events }),
        ...(enabled !== undefined && { enabled }),
        ...(description !== undefined && { description }),
        ...(maxRetries !== undefined && { maxRetries }),
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

    // Log update
    await prisma.integrationLog.create({
      data: {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        integrationId: webhook.integrationId,
        action: "webhook_updated",
        status: "success",
        message: `Webhook ${id} updated`,
        metadata: JSON.stringify({
          webhookId: id,
          updatedFields: Object.keys(body),
        }),
      },
    });

    return NextResponse.json(updatedWebhook);
  } catch (error) {
    console.error("❌ Error updating webhook:", error);
    return NextResponse.json(
      { error: "Failed to update webhook" },
      { status: 500 }
    );
  }
}

// DELETE - Delete webhook
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const webhook = await prisma.webhook.findUnique({
      where: { id },
      include: {
        integration: true,
      },
    });

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    // Verify access
    if (webhook.integration.organizationId) {
      const membership = await prisma.member.findFirst({
        where: {
          userId: session.user.id,
          organizationId: webhook.integration.organizationId,
          role: { in: ["owner", "admin"] },
        },
      });

      if (!membership && webhook.integration.createdBy !== session.user.id) {
        return NextResponse.json(
          { error: "No permission to delete this webhook" },
          { status: 403 }
        );
      }
    }

    // Delete deliveries first, then webhook
    await prisma.$transaction([
      prisma.webhookDelivery.deleteMany({
        where: { webhookId: id },
      }),
      prisma.webhook.delete({
        where: { id },
      }),
    ]);

    // Log deletion
    await prisma.integrationLog.create({
      data: {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        integrationId: webhook.integrationId,
        action: "webhook_deleted",
        status: "success",
        message: `Webhook ${id} deleted`,
        metadata: JSON.stringify({
          webhookId: id,
          url: webhook.url,
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting webhook:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 }
    );
  }
}
