import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AutomationEngine, TriggerType, TriggerContext } from "@/lib/automation-engine";

// POST /api/boards/[boardId]/automations/[ruleId]/test - Test run an automation rule
export async function POST(
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
    const { taskId } = body;

    // Verify board access
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

    // Get task context if provided
    let task = null;
    if (taskId) {
      task = await prisma.task.findFirst({
        where: {
          id: taskId,
          list: { boardId },
        },
        include: {
          assignee: true,
          taskLabels: { include: { label: true } },
          checklists: { include: { items: true } },
        },
      });

      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
    }

    // Create test context
    const context: Omit<TriggerContext, "boardId"> = {
      taskId: task?.id,
      task,
      userId: session.user.id,
      user: session.user,
      listId: task?.listId,
    };

    // Execute the automation
    const engine = new AutomationEngine(boardId);
    const result = await engine.processTrigger(
      rule.triggerType as TriggerType,
      { ...context, boardId }
    );

    return NextResponse.json({
      success: true,
      testRun: true,
      result,
    });
  } catch (error) {
    console.error("Error testing automation rule:", error);
    return NextResponse.json(
      {
        error: "Failed to test automation rule",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
