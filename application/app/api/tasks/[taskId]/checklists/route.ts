import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { canAccessBoard } from "@/lib/permissions";
import { emitToBoard } from "@/lib/socket";

// GET - Get all checklists for a task
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
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check board access
    const hasAccess = await canAccessBoard(session.user.id, task.list.board.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    const checklists = await prisma.checklist.findMany({
      where: { taskId },
      include: {
        items: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            children: {
              include: {
                assignee: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
              },
              orderBy: { position: "asc" },
            },
          },
          where: { parentId: null }, // Only top-level items
          orderBy: { position: "asc" },
        },
      },
      orderBy: { position: "asc" },
    });

    return NextResponse.json(checklists);
  } catch (error) {
    console.error("❌ Error fetching checklists:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklists" },
      { status: 500 }
    );
  }
}

// POST - Create a new checklist
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
    const { name, items = [] } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Checklist name is required" },
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
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check board access
    const hasAccess = await canAccessBoard(session.user.id, task.list.board.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    // Get max position
    const maxPosition = await prisma.checklist.findFirst({
      where: { taskId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const position = (maxPosition?.position ?? -1) + 1;

    // Create checklist
    const checklist = await prisma.checklist.create({
      data: {
        id: `checklist_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        taskId,
        name,
        position,
        items: {
          create: items.map((item: any, index: number) => ({
            id: `checkitem_${Date.now()}_${index}_${Math.random().toString(36).substring(7)}`,
            content: item.content,
            checked: item.checked || false,
            position: index,
            assigneeId: item.assigneeId,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
          })),
        },
      },
      include: {
        items: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "checklist_created",
        description: `Created checklist "${name}"`,
        boardId: task.list.board.id,
        taskId,
        userId: session.user.id,
      },
    });

    // Emit event
    emitToBoard(task.list.board.id, "checklist:created", {
      taskId,
      checklist,
      userId: session.user.id,
    });

    return NextResponse.json(checklist, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating checklist:", error);
    return NextResponse.json(
      { error: "Failed to create checklist" },
      { status: 500 }
    );
  }
}
