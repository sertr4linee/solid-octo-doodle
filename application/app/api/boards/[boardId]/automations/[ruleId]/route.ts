import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// GET /api/boards/[boardId]/automations/[ruleId] - Get automation rule details
// PUT /api/boards/[boardId]/automations/[ruleId] - Update automation rule
// DELETE /api/boards/[boardId]/automations/[ruleId] - Delete automation rule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; ruleId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId, ruleId } = await params;

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

    const rule = await prisma.automationRule.findFirst({
      where: { id: ruleId, boardId },
      include: {
        createdBy: {
          select: { id: true, name: true, image: true },
        },
        logs: {
          take: 20,
          orderBy: { startedAt: "desc" },
        },
      },
    });

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({
      rule: {
        ...rule,
        triggerConfig: JSON.parse(rule.triggerConfig || "{}"),
        conditions: JSON.parse(rule.conditions || "[]"),
        actions: JSON.parse(rule.actions),
        logs: rule.logs.map((log) => ({
          ...log,
          triggerData: log.triggerData ? JSON.parse(log.triggerData) : null,
          actionsExecuted: log.actionsExecuted ? JSON.parse(log.actionsExecuted) : null,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching automation rule:", error);
    return NextResponse.json(
      { error: "Failed to fetch automation rule" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; ruleId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId, ruleId } = await params;
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

    const existingRule = await prisma.automationRule.findFirst({
      where: { id: ruleId, boardId },
    });

    if (!existingRule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const {
      name,
      description,
      triggerType,
      triggerConfig,
      conditions,
      actions,
      enabled,
      priority,
      delay,
      maxExecutions,
    } = body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (triggerType !== undefined) updateData.triggerType = triggerType;
    if (triggerConfig !== undefined) updateData.triggerConfig = JSON.stringify(triggerConfig);
    if (conditions !== undefined) updateData.conditions = JSON.stringify(conditions);
    if (actions !== undefined) updateData.actions = JSON.stringify(actions);
    if (enabled !== undefined) updateData.enabled = enabled;
    if (priority !== undefined) updateData.priority = priority;
    if (delay !== undefined) updateData.delay = delay;
    if (maxExecutions !== undefined) updateData.maxExecutions = maxExecutions;

    const rule = await prisma.automationRule.update({
      where: { id: ruleId },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      rule: {
        ...rule,
        triggerConfig: JSON.parse(rule.triggerConfig || "{}"),
        conditions: JSON.parse(rule.conditions || "[]"),
        actions: JSON.parse(rule.actions),
      },
    });
  } catch (error) {
    console.error("Error updating automation rule:", error);
    return NextResponse.json(
      { error: "Failed to update automation rule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; ruleId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId, ruleId } = await params;

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

    const rule = await prisma.automationRule.findFirst({
      where: { id: ruleId, boardId },
    });

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    await prisma.automationRule.delete({
      where: { id: ruleId },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "automation_deleted",
        description: `${session.user.name} deleted automation "${rule.name}"`,
        userId: session.user.id,
        boardId,
        metadata: JSON.stringify({ ruleName: rule.name }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting automation rule:", error);
    return NextResponse.json(
      { error: "Failed to delete automation rule" },
      { status: 500 }
    );
  }
}
