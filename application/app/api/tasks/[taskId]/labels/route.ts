import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitToBoard } from "@/lib/socket";
import { canAccessBoard } from "@/lib/permissions";

// POST - Add a label to a task
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await request.json();
    const { labelId } = body;

    if (!labelId) {
      return NextResponse.json(
        { error: "Label ID is required" },
        { status: 400 }
      );
    }

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

    // Verify label belongs to same board
    const label = await prisma.label.findFirst({
      where: {
        id: labelId,
        boardId: task.list.board.id,
      },
    });

    if (!label) {
      console.error(`❌ Label ${labelId} not found for board ${task.list.board.id}`);
      return NextResponse.json(
        { error: "Label not found or doesn't belong to this board" },
        { status: 404 }
      );
    }

    // Check if label already assigned
    const existing = await prisma.taskLabel.findUnique({
      where: {
        taskId_labelId: {
          taskId,
          labelId,
        },
      },
    });

    if (existing) {
      console.error(`❌ Label ${labelId} already assigned to task ${taskId}`);
      return NextResponse.json(
        { error: "Label already assigned to this task" },
        { status: 400 }
      );
    }

    console.log(`✅ Creating task label for task ${taskId} with label ${labelId}`);

    // Create task label
    const taskLabel = await prisma.taskLabel.create({
      data: {
        id: `tasklabel_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        taskId,
        labelId,
        createdAt: new Date(),
      },
      include: {
        label: true,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "label_added",
        description: `Added label "${label.name}" to task`,
        boardId: task.list.board.id,
        taskId,
        userId: session.user.id,
        createdAt: new Date(),
      },
    });

    // Broadcast update
    emitToBoard(task.list.board.id, "task:label:added", {
      taskId,
      label,
      userId: session.user.id,
    });

    return NextResponse.json(taskLabel, { status: 201 });
  } catch (error) {
    console.error("❌ Error adding label to task:", error);
    return NextResponse.json(
      { error: "Failed to add label to task" },
      { status: 500 }
    );
  }
}

// GET - Get all labels for a task
export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

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

    const taskLabels = await prisma.taskLabel.findMany({
      where: { taskId },
      include: {
        label: true,
      },
    });

    return NextResponse.json(taskLabels);
  } catch (error) {
    console.error("❌ Error fetching task labels:", error);
    return NextResponse.json(
      { error: "Failed to fetch task labels" },
      { status: 500 }
    );
  }
}
