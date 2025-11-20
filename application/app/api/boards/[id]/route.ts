import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitToBoard, emitToOrganization } from "@/lib/socket";

// GET - Get board details
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

    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        members: {
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
        },
        lists: {
          where: { archived: false },
          include: {
            tasks: {
              where: { archived: false },
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
              orderBy: {
                position: "asc",
              },
            },
          },
          orderBy: {
            position: "asc",
          },
        },
        activities: {
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
          take: 50,
        },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Check if user has access
    const userMember = board.members.find((m) => m.userId === session.user.id);
    if (!userMember && board.visibility === "private") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      ...board,
      userRole: userMember?.role || "viewer",
    });
  } catch (error) {
    console.error("❌ Error fetching board:", error);
    return NextResponse.json(
      { error: "Failed to fetch board" },
      { status: 500 }
    );
  }
}

// PATCH - Update board
export async function PATCH(
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
    const body = await request.json();

    // Check if user has admin access
    const member = await prisma.boardMember.findFirst({
      where: {
        boardId: id,
        userId: session.user.id,
        role: { in: ["owner", "admin"] },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "You need admin access to update this board" },
        { status: 403 }
      );
    }

    const board = await prisma.board.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "board_updated",
        description: `Updated board settings`,
        boardId: board.id,
        userId: session.user.id,
        metadata: JSON.stringify(body),
        createdAt: new Date(),
      },
    });

    // Émettre l'événement Socket.IO
    emitToBoard(id, "board:updated", {
      id: board.id,
      ...body,
      userId: session.user.id,
    });

    return NextResponse.json(board);
  } catch (error) {
    console.error("❌ Error updating board:", error);
    return NextResponse.json(
      { error: "Failed to update board" },
      { status: 500 }
    );
  }
}

// DELETE - Delete board
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

    const { id } = await params;

    // Check if user is owner
    const member = await prisma.boardMember.findFirst({
      where: {
        boardId: id,
        userId: session.user.id,
        role: "owner",
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Only owners can delete boards" },
        { status: 403 }
      );
    }

    const board = await prisma.board.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    // Delete board (cascade will delete lists, tasks, members)
    await prisma.board.delete({
      where: { id },
    });

    // Émettre l'événement Socket.IO
    if (board) {
      emitToOrganization(board.organizationId, "board:deleted", {
        id,
        userId: session.user.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting board:", error);
    return NextResponse.json(
      { error: "Failed to delete board" },
      { status: 500 }
    );
  }
}
