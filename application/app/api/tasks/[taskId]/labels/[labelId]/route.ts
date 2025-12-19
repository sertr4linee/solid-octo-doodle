import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitToBoard } from "@/lib/socket";
import { canAccessBoard } from "@/lib/permissions";
import { triggerAutomation } from "@/lib/automation-engine";

// DELETE - Remove a label from a task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string; labelId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, labelId } = await params;

    // Get task and verify access
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        list: {
          include: {
            board: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Check board access
    const hasAccess = await canAccessBoard(session.user.id, task.list.board.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    // Check if label is assigned
    const taskLabel = await prisma.taskLabel.findUnique({
      where: {
        taskId_labelId: {
          taskId,
          labelId,
        },
      },
      include: {
        label: true,
      },
    });

    if (!taskLabel) {
      return NextResponse.json(
        { error: "Label not assigned to this task" },
        { status: 404 }
      );
    }

    // Remove label
    await prisma.taskLabel.delete({
      where: {
        taskId_labelId: {
          taskId,
          labelId,
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "label_removed",
        description: `Removed label "${taskLabel.label.name}" from task`,
        boardId: task.list.board.id,
        taskId,
        userId: session.user.id,
        createdAt: new Date(),
      },
    });

    // Broadcast update
    emitToBoard(task.list.board.id, "task:label:removed", {
      taskId,
      labelId,
      userId: session.user.id,
    });

    // Déclencher l'automatisation pour la suppression de label
    try {
      await triggerAutomation(task.list.board.id, "label_removed", {
        taskId,
        task,
        labelId,
        labelName: taskLabel.label.name,
        label: taskLabel.label,
        userId: session.user.id,
      });
    } catch (automationError) {
      console.error("⚠️ Automation trigger error:", automationError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error removing label from task:", error);
    return NextResponse.json(
      { error: "Failed to remove label from task" },
      { status: 500 }
    );
  }
}
