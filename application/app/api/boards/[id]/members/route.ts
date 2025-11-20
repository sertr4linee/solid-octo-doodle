import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitToBoard } from "@/lib/socket";

// GET - List board members
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const members = await prisma.boardMember.findMany({
      where: { boardId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("❌ Error fetching board members:", error);
    return NextResponse.json(
      { error: "Failed to fetch board members" },
      { status: 500 }
    );
  }
}

// POST - Add member to board
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: boardId } = await params;
    const body = await request.json();
    const { userId, role = "member" } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if requester has admin access
    const requesterMember = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
        role: { in: ["owner", "admin"] },
      },
    });

    if (!requesterMember) {
      return NextResponse.json(
        { error: "You need admin access to add members" },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 409 }
      );
    }

    // Add member
    const member = await prisma.boardMember.create({
      data: {
        id: `${boardId}-${userId}`,
        boardId,
        userId,
        role,
        createdAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "board_member_added",
        description: `Added ${member.user.name} to the board`,
        boardId,
        userId: session.user.id,
        createdAt: new Date(),
      },
    });

    // Émettre l'événement Socket.IO
    emitToBoard(boardId, "board:member-added", {
      boardId,
      member,
      userId: session.user.id,
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("❌ Error adding board member:", error);
    return NextResponse.json(
      { error: "Failed to add board member" },
      { status: 500 }
    );
  }
}

// DELETE - Remove member from board
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: boardId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if requester has admin access
    const requesterMember = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
        role: { in: ["owner", "admin"] },
      },
    });

    if (!requesterMember) {
      return NextResponse.json(
        { error: "You need admin access to remove members" },
        { status: 403 }
      );
    }

    // Cannot remove owner
    const targetMember = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId,
      },
    });

    if (targetMember?.role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove board owner" },
        { status: 403 }
      );
    }

    // Remove member
    await prisma.boardMember.delete({
      where: {
        id: `${boardId}-${userId}`,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "board_member_removed",
        description: `Removed member from the board`,
        boardId,
        userId: session.user.id,
        createdAt: new Date(),
      },
    });

    // Émettre l'événement Socket.IO
    emitToBoard(boardId, "board:member-removed", {
      boardId,
      userId: userId,
      removedBy: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error removing board member:", error);
    return NextResponse.json(
      { error: "Failed to remove board member" },
      { status: 500 }
    );
  }
}
