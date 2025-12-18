import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// GET /api/boards/[boardId]/automations - List automation rules
// POST /api/boards/[boardId]/automations - Create a new automation rule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId } = await params;
    const { searchParams } = new URL(request.url);
    const enabled = searchParams.get("enabled");
    const triggerType = searchParams.get("triggerType");

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

    // Build where clause
    const where: any = { boardId };
    if (enabled !== null) {
      where.enabled = enabled === "true";
    }
    if (triggerType) {
      where.triggerType = triggerType;
    }

    const rules = await prisma.automationRule.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, image: true },
        },
        _count: {
          select: { logs: true },
        },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    // Parse JSON fields for response
    const rulesWithParsed = rules.map((rule) => ({
      ...rule,
      triggerConfig: JSON.parse(rule.triggerConfig || "{}"),
      conditions: JSON.parse(rule.conditions || "[]"),
      actions: JSON.parse(rule.actions),
    }));

    return NextResponse.json({ rules: rulesWithParsed });
  } catch (error) {
    console.error("Error fetching automation rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch automation rules" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId } = await params;
    const body = await request.json();

    // Verify board access (only admin/owner can create automations)
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
      triggerType,
      triggerConfig = {},
      conditions = [],
      actions,
      enabled = true,
      priority = 0,
      delay,
      maxExecutions,
      templateId,
    } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!triggerType) {
      return NextResponse.json(
        { error: "Trigger type is required" },
        { status: 400 }
      );
    }
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { error: "At least one action is required" },
        { status: 400 }
      );
    }

    const rule = await prisma.automationRule.create({
      data: {
        id: `auto_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name,
        description,
        boardId,
        triggerType,
        triggerConfig: JSON.stringify(triggerConfig),
        conditions: JSON.stringify(conditions),
        actions: JSON.stringify(actions),
        enabled,
        priority,
        delay,
        maxExecutions,
        templateId,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "automation_created",
        description: `${session.user.name} created automation "${name}"`,
        userId: session.user.id,
        boardId,
        metadata: JSON.stringify({ ruleId: rule.id, triggerType }),
      },
    });

    return NextResponse.json({
      success: true,
      rule: {
        ...rule,
        triggerConfig: JSON.parse(rule.triggerConfig),
        conditions: JSON.parse(rule.conditions),
        actions: JSON.parse(rule.actions),
      },
    });
  } catch (error) {
    console.error("Error creating automation rule:", error);
    return NextResponse.json(
      { error: "Failed to create automation rule" },
      { status: 500 }
    );
  }
}
