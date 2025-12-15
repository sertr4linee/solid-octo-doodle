import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get a single integration
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const integration = await prisma.integration.findUnique({
      where: { id },
      include: {
        webhooks: true,
        logs: {
          take: 50,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Verify access
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

    return NextResponse.json({
      ...integration,
      config: JSON.parse(integration.config || "{}"),
    });
  } catch (error) {
    console.error("❌ Error fetching integration:", error);
    return NextResponse.json(
      { error: "Failed to fetch integration" },
      { status: 500 }
    );
  }
}

// PATCH - Update an integration
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

    const integration = await prisma.integration.findUnique({
      where: { id },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Verify access
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

    const { name, description, enabled, config, accessToken, refreshToken } = body;

    const updatedIntegration = await prisma.integration.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(enabled !== undefined && { enabled }),
        ...(config !== undefined && { config: JSON.stringify(config) }),
        ...(accessToken !== undefined && { accessToken }),
        ...(refreshToken !== undefined && { refreshToken }),
      },
    });

    // Log the update
    await prisma.integrationLog.create({
      data: {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        integrationId: id,
        action: "integration_updated",
        status: "success",
        message: `Integration updated by user ${session.user.id}`,
        metadata: JSON.stringify({
          updatedFields: Object.keys(body),
        }),
      },
    });

    return NextResponse.json({
      ...updatedIntegration,
      config: JSON.parse(updatedIntegration.config || "{}"),
    });
  } catch (error) {
    console.error("❌ Error updating integration:", error);
    return NextResponse.json(
      { error: "Failed to update integration" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an integration
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const integration = await prisma.integration.findUnique({
      where: { id },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Verify access
    if (integration.organizationId) {
      const membership = await prisma.member.findFirst({
        where: {
          userId: session.user.id,
          organizationId: integration.organizationId,
          role: { in: ["owner", "admin"] },
        },
      });

      if (!membership && integration.createdBy !== session.user.id) {
        return NextResponse.json(
          { error: "No permission to delete this integration" },
          { status: 403 }
        );
      }
    }

    // Delete in transaction
    await prisma.$transaction([
      // Delete webhook deliveries
      prisma.webhookDelivery.deleteMany({
        where: {
          webhook: {
            integrationId: id,
          },
        },
      }),
      // Delete webhooks
      prisma.webhook.deleteMany({
        where: { integrationId: id },
      }),
      // Delete logs
      prisma.integrationLog.deleteMany({
        where: { integrationId: id },
      }),
      // Delete integration
      prisma.integration.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting integration:", error);
    return NextResponse.json(
      { error: "Failed to delete integration" },
      { status: 500 }
    );
  }
}
