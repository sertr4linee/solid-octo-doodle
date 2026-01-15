import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// GET /api/boards/[boardId]/automations/webhooks - List automation webhooks
// POST /api/boards/[boardId]/automations/webhooks - Create a new webhook endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: boardId } = await params;

    // Verify board access
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { createdById: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const webhooks = await prisma.automationWebhook.findMany({
      where: { boardId },
      include: {
        createdBy: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Parse JSON fields and mask secrets
    const webhooksWithParsed = webhooks.map((webhook) => ({
      ...webhook,
      secret: webhook.secret.substring(0, 8) + "...", // Mask secret
      actions: JSON.parse(webhook.actions),
      allowedIps: webhook.allowedIps ? JSON.parse(webhook.allowedIps) : null,
      // Generate full webhook URL
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/webhooks/automation/${webhook.endpoint}`,
    }));

    return NextResponse.json({ webhooks: webhooksWithParsed });
  } catch (error) {
    console.error("Error fetching automation webhooks:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: boardId } = await params;
    const body = await request.json();

    // Verify board access (admin/owner only)
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { createdById: session.user.id },
          {
            members: {
              some: {
                userId: session.user.id,
                role: { in: ["owner", "admin"] },
              },
            },
          },
        ],
      },
    });

    if (!board) {
      return NextResponse.json(
        { error: "Board not found or insufficient permissions" },
        { status: 404 }
      );
    }

    const {
      name,
      description,
      actions,
      enabled = true,
      allowedIps,
      requireSignature = true,
    } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { error: "At least one action is required" },
        { status: 400 }
      );
    }

    // Generate unique endpoint and secret
    const endpoint = `whk_${crypto.randomBytes(16).toString("hex")}`;
    const secret = `whks_${crypto.randomBytes(32).toString("hex")}`;

    const webhook = await prisma.automationWebhook.create({
      data: {
        id: `awh_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        boardId,
        name,
        description,
        endpoint,
        secret,
        actions: JSON.stringify(actions),
        enabled,
        allowedIps: allowedIps ? JSON.stringify(allowedIps) : null,
        requireSignature,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Return with full secret (only shown once)
    return NextResponse.json({
      success: true,
      webhook: {
        ...webhook,
        actions: JSON.parse(webhook.actions),
        allowedIps: webhook.allowedIps ? JSON.parse(webhook.allowedIps) : null,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/webhooks/automation/${webhook.endpoint}`,
      },
      // Secret is only shown once on creation
      secretWarning: "Save this secret now. It won't be shown again.",
    });
  } catch (error) {
    console.error("Error creating automation webhook:", error);
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 }
    );
  }
}
