import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitToBoard } from "@/lib/socket";
import { canAccessBoard } from "@/lib/permissions";

// GET - Get task details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; listId: string; taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        list: {
          include: {
            board: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("❌ Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

// PATCH - Update task
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; listId: string; taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: boardId, taskId } = await params;
    const body = await request.json();

    // Check if user has access to board
    const hasAccess = await canAccessBoard(session.user.id, boardId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have access to this board" },
        { status: 403 }
      );
    }

    // Update task
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...body,
        updatedAt: new Date(),
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "task_updated",
        description: `Updated task "${task.title}"`,
        boardId,
        taskId: task.id,
        userId: session.user.id,
        metadata: JSON.stringify(body),
        createdAt: new Date(),
      },
    });

    // Émettre l'événement Socket.IO
    emitToBoard(boardId, "task:updated", {
      boardId,
      task,
      userId: session.user.id,
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("❌ Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE - Delete task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; listId: string; taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: boardId, taskId } = await params;

    // Check if user has access to board
    const hasAccess = await canAccessBoard(session.user.id, boardId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have access to this board" },
        { status: 403 }
      );
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true },
    });

    // Delete task
    await prisma.task.delete({
      where: { id: taskId },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "task_deleted",
        description: `Deleted task "${task?.title}"`,
        boardId,
        userId: session.user.id,
        createdAt: new Date(),
      },
    });

    // Émettre l'événement Socket.IO
    emitToBoard(boardId, "task:deleted", {
      boardId,
      taskId,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
