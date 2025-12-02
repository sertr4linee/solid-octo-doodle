import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitToBoard } from "@/lib/socket";
import { canAccessBoard } from "@/lib/permissions";

// GET - Get lists for a board
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

    const { id: boardId } = await params;

    const lists = await prisma.list.findMany({
      where: {
        boardId,
        archived: false,
      },
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
    });

    return NextResponse.json(lists);
  } catch (error) {
    console.error("❌ Error fetching lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch lists" },
      { status: 500 }
    );
  }
}

// POST - Create a new list
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
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "List name is required" },
        { status: 400 }
      );
    }

    // Check if user is member of board
    // Check if user has access to board
    const hasAccess = await canAccessBoard(session.user.id, boardId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have access to this board" },
        { status: 403 }
      );
    }

    // Get highest position
    const lastList = await prisma.list.findFirst({
      where: { boardId },
      orderBy: { position: "desc" },
    });

    const position = lastList ? lastList.position + 1 : 0;

    // Create list
    const list = await prisma.list.create({
      data: {
        id: `list_${boardId}_${position}_${Date.now()}`,
        name,
        boardId,
        position,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "list_created",
        description: `Created list "${list.name}"`,
        boardId,
        userId: session.user.id,
        createdAt: new Date(),
      },
    });

    // Émettre l'événement Socket.IO
    emitToBoard(boardId, "list:created", {
      boardId,
      list,
      userId: session.user.id,
    });

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating list:", error);
    return NextResponse.json(
      { error: "Failed to create list" },
      { status: 500 }
    );
  }
}
