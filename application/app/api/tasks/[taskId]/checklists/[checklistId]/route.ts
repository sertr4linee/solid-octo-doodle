import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { canAccessBoard } from "@/lib/permissions";
import { emitToBoard } from "@/lib/socket";

// GET - Get a specific checklist
export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string; checklistId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { checklistId } = await params;

    const checklist = await prisma.checklist.findUnique({
      where: { id: checklistId },
      include: {
        task: {
          include: {
            list: {
              include: {
                board: true,
              },
            },
          },
        },
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
          where: { parentId: null },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    // Check board access
    const hasAccess = await canAccessBoard(
      session.user.id,
      checklist.task.list.board.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    return NextResponse.json(checklist);
  } catch (error) {
    console.error("❌ Error fetching checklist:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist" },
      { status: 500 }
    );
  }
}

// PATCH - Update checklist
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string; checklistId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { checklistId } = await params;
    const body = await request.json();
    const { name, position } = body;

    const checklist = await prisma.checklist.findUnique({
      where: { id: checklistId },
      include: {
        task: {
          include: {
            list: {
              include: {
                board: true,
              },
            },
          },
        },
      },
    });

    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    // Check board access
    const hasAccess = await canAccessBoard(
      session.user.id,
      checklist.task.list.board.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    const updated = await prisma.checklist.update({
      where: { id: checklistId },
      data: {
        ...(name !== undefined && { name }),
        ...(position !== undefined && { position }),
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
          where: { parentId: null },
          orderBy: { position: "asc" },
        },
      },
    });

    // Emit event
    emitToBoard(checklist.task.list.board.id, "checklist:updated", {
      taskId: checklist.taskId,
      checklist: updated,
      userId: session.user.id,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("❌ Error updating checklist:", error);
    return NextResponse.json(
      { error: "Failed to update checklist" },
      { status: 500 }
    );
  }
}

// DELETE - Delete checklist
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string; checklistId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { checklistId } = await params;

    const checklist = await prisma.checklist.findUnique({
      where: { id: checklistId },
      include: {
        task: {
          include: {
            list: {
              include: {
                board: true,
              },
            },
          },
        },
      },
    });

    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    // Check board access
    const hasAccess = await canAccessBoard(
      session.user.id,
      checklist.task.list.board.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    await prisma.checklist.delete({
      where: { id: checklistId },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "checklist_deleted",
        description: `Deleted checklist "${checklist.name}"`,
        boardId: checklist.task.list.board.id,
        taskId: checklist.taskId,
        userId: session.user.id,
      },
    });

    // Emit event
    emitToBoard(checklist.task.list.board.id, "checklist:deleted", {
      taskId: checklist.taskId,
      checklistId,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting checklist:", error);
    return NextResponse.json(
      { error: "Failed to delete checklist" },
      { status: 500 }
    );
  }
}
