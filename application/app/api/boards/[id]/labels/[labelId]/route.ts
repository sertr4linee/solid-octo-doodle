import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitToBoard } from "@/lib/socket";

// GET - Get a specific label
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: boardId, labelId } = await params;

    // Check if user has access to board
    const boardMember = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
      },
    });

    if (!boardMember) {
      return NextResponse.json(
        { error: "You don't have access to this board" },
        { status: 403 }
      );
    }

    const label = await prisma.label.findFirst({
      where: {
        id: labelId,
        boardId,
      },
      include: {
        _count: {
          select: {
            taskLabels: true,
          },
        },
      },
    });

    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    return NextResponse.json(label);
  } catch (error) {
    console.error("❌ Error fetching label:", error);
    return NextResponse.json(
      { error: "Failed to fetch label" },
      { status: 500 }
    );
  }
}

// PATCH - Update a label
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: boardId, labelId } = await params;

    // Check if user has admin or owner access
    const boardMember = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
        role: { in: ["owner", "admin"] },
      },
    });

    if (!boardMember) {
      return NextResponse.json(
        { error: "You don't have permission to update labels" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, color, position } = body;

    // Check if label exists
    const existingLabel = await prisma.label.findFirst({
      where: {
        id: labelId,
        boardId,
      },
    });

    if (!existingLabel) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    // If name is being changed, check for duplicates
    if (name && name !== existingLabel.name) {
      const duplicate = await prisma.label.findUnique({
        where: {
          boardId_name: {
            boardId,
            name,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "A label with this name already exists" },
          { status: 400 }
        );
      }
    }

    const label = await prisma.label.update({
      where: { id: labelId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(position !== undefined && { position }),
        updatedAt: new Date(),
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "label_updated",
        description: `Updated label "${label.name}"`,
        boardId,
        userId: session.user.id,
        createdAt: new Date(),
      },
    });

    // Broadcast update
    emitToBoard(boardId, "label:updated", {
      label,
      userId: session.user.id,
    });

    return NextResponse.json(label);
  } catch (error) {
    console.error("❌ Error updating label:", error);
    return NextResponse.json(
      { error: "Failed to update label" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a label
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: boardId, labelId } = await params;

    // Check if user has admin or owner access
    const boardMember = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
        role: { in: ["owner", "admin"] },
      },
    });

    if (!boardMember) {
      return NextResponse.json(
        { error: "You don't have permission to delete labels" },
        { status: 403 }
      );
    }

    // Check if label exists
    const label = await prisma.label.findFirst({
      where: {
        id: labelId,
        boardId,
      },
    });

    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    // Delete label (cascade will delete taskLabels)
    await prisma.label.delete({
      where: { id: labelId },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "label_deleted",
        description: `Deleted label "${label.name}"`,
        boardId,
        userId: session.user.id,
        createdAt: new Date(),
      },
    });

    // Broadcast update
    emitToBoard(boardId, "label:deleted", {
      labelId,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting label:", error);
    return NextResponse.json(
      { error: "Failed to delete label" },
      { status: 500 }
    );
  }
}
