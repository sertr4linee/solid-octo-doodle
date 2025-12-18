import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitToBoard } from "@/lib/socket";
import { canAccessBoard } from "@/lib/permissions";
import { triggerAutomation } from "@/lib/automation-engine";

// POST - Create a new task
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; listId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: boardId, listId } = await params;
    const body = await request.json();
    const { title, description, assigneeId } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 }
      );
    }

    // Check if user has access to board
    const hasAccess = await canAccessBoard(session.user.id, boardId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have access to this board" },
        { status: 403 }
      );
    }

    // Get highest position in list
    const lastTask = await prisma.task.findFirst({
      where: { listId },
      orderBy: { position: "desc" },
    });

    const position = lastTask ? lastTask.position + 1 : 0;

    // Create task
    const task = await prisma.task.create({
      data: {
        id: `task_${listId}_${position}_${Date.now()}`,
        title,
        description,
        listId,
        position,
        assigneeId,
        createdAt: new Date(),
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
        type: "task_created",
        description: `Created task "${task.title}"`,
        boardId,
        taskId: task.id,
        userId: session.user.id,
        createdAt: new Date(),
      },
    });

    // Émettre l'événement Socket.IO
    console.log("📡 About to emit task:created event for board:", boardId);
    emitToBoard(boardId, "task:created", {
      data: {
        boardId,
        listId,
        task,
      },
      userId: session.user.id,
    });
    console.log("✅ Task:created event emitted successfully");

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
