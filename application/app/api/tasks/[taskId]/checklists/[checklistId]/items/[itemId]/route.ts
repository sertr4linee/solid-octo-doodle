import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { canAccessBoard } from "@/lib/permissions";
import { emitToBoard } from "@/lib/socket";

// PATCH - Update checklist item
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string; checklistId: string; itemId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;
    const body = await request.json();
    const { content, assigneeId, dueDate, position } = body;

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        checklist: {
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
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Check board access
    const hasAccess = await canAccessBoard(
      session.user.id,
      item.checklist.task.list.board.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        ...(content !== undefined && { content }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(position !== undefined && { position }),
      },
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
    });

    // Emit event
    emitToBoard(item.checklist.task.list.board.id, "checklist:item:updated", {
      taskId: item.checklist.taskId,
      checklistId: item.checklistId,
      item: updated,
      userId: session.user.id,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("❌ Error updating checklist item:", error);
    return NextResponse.json(
      { error: "Failed to update checklist item" },
      { status: 500 }
    );
  }
}

// DELETE - Delete checklist item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string; checklistId: string; itemId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        checklist: {
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
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Check board access
    const hasAccess = await canAccessBoard(
      session.user.id,
      item.checklist.task.list.board.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    await prisma.checklistItem.delete({
      where: { id: itemId },
    });

    // Emit event
    emitToBoard(item.checklist.task.list.board.id, "checklist:item:deleted", {
      taskId: item.checklist.taskId,
      checklistId: item.checklistId,
      itemId,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting checklist item:", error);
    return NextResponse.json(
      { error: "Failed to delete checklist item" },
      { status: 500 }
    );
  }
}
