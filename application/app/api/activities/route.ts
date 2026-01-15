import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// GET - Fetch activities with filters and pagination
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // all, personal, team, board
    const boardId = searchParams.get("boardId");
    const organizationId = searchParams.get("organizationId");
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build where clause based on filter
    const where: any = {};

    if (filter === "personal") {
      where.userId = session.user.id;
    } else if (filter === "board" && boardId) {
      where.boardId = boardId;
    } else if (filter === "organization" && organizationId) {
      // Get all boards from this organization
      const orgBoards = await prisma.board.findMany({
        where: { organizationId },
        select: { id: true },
      });
      where.boardId = { in: orgBoards.map((b) => b.id) };
    } else {
      // "all" - get activities from boards user has access to
      const userBoards = await prisma.boardMember.findMany({
        where: { userId: session.user.id },
        select: { boardId: true },
      });
      where.boardId = { in: userBoards.map((b) => b.boardId) };
    }

    // Add cursor for pagination
    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        board: {
          select: {
            id: true,
            name: true,
            background: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            emoji: true,
            listId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Take one extra to check if there are more
    });

    // Check if there are more results
    const hasMore = activities.length > limit;
    const items = hasMore ? activities.slice(0, -1) : activities;
    const nextCursor = hasMore ? items[items.length - 1]?.createdAt.toISOString() : null;

    return NextResponse.json({
      activities: items,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

// POST - Mark activities as read
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, activityIds } = body;

    if (action === "mark_read") {
      // For now, we'll just return success
      // In the future, we can add a read status table
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing activity action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
