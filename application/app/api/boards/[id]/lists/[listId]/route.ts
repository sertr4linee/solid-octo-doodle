import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitToBoard } from "@/lib/socket";
import { canAccessBoard } from "@/lib/permissions";

// PATCH - Update list
export async function PATCH(
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

    // Check if user has access to board
    const hasAccess = await canAccessBoard(session.user.id, boardId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have access to this board" },
        { status: 403 }
      );
    }

    // Update list
    const list = await prisma.list.update({
      where: { id: listId },
      data: {
        ...body,
        updatedAt: new Date(),
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "list_updated",
        description: `Updated list "${list.name}"`,
        boardId,
        userId: session.user.id,
        metadata: JSON.stringify(body),
        createdAt: new Date(),
      },
    });

    // Émettre l'événement Socket.IO
    emitToBoard(boardId, "list:updated", {
      boardId,
      list,
      userId: session.user.id,
    });

    return NextResponse.json(list);
  } catch (error) {
    console.error("❌ Error updating list:", error);
    return NextResponse.json(
      { error: "Failed to update list" },
      { status: 500 }
    );
  }
}

// DELETE - Delete list
export async function DELETE(
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

    // Check if user has access to board
    const hasAccess = await canAccessBoard(session.user.id, boardId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have access to this board" },
        { status: 403 }
      );
    }

    const list = await prisma.list.findUnique({
      where: { id: listId },
      select: { name: true },
    });

    // Archive list instead of deleting (safer)
    await prisma.list.update({
      where: { id: listId },
      data: { archived: true },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "list_deleted",
        description: `Archived list "${list?.name}"`,
        boardId,
        userId: session.user.id,
        createdAt: new Date(),
      },
    });

    // Émettre l'événement Socket.IO
    emitToBoard(boardId, "list:deleted", {
      boardId,
      listId,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting list:", error);
    return NextResponse.json(
      { error: "Failed to delete list" },
      { status: 500 }
    );
  }
}
