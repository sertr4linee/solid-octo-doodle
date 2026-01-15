import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// GET - Search for tasks to link (for autocomplete)
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const excludeTaskId = searchParams.get("excludeTaskId");
    const boardId = searchParams.get("boardId"); // Optional: filter by board
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Get boards the user has access to
    const userBoards = await prisma.boardMember.findMany({
      where: { userId: session.user.id },
      select: { boardId: true },
    });

    const accessibleBoardIds = userBoards.map((b) => b.boardId);

    // Build where clause
    const whereClause: any = {
      archived: false,
      list: {
        board: {
          id: { in: accessibleBoardIds },
          archived: false,
        },
      },
    };

    // Add search query if provided
    if (query.trim()) {
      whereClause.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    // Exclude specific task
    if (excludeTaskId) {
      whereClause.id = { not: excludeTaskId };
    }

    // Filter by board if specified
    if (boardId) {
      whereClause.list = {
        ...whereClause.list,
        boardId,
      };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        list: {
          include: {
            board: {
              select: {
                id: true,
                name: true,
                background: true,
              },
            },
          },
        },
      },
      take: limit,
      orderBy: [
        { updatedAt: "desc" },
      ],
    });

    const results = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      emoji: task.emoji,
      listName: task.list.name,
      boardId: task.list.board.id,
      boardName: task.list.board.name,
      boardColor: task.list.board.background,
    }));

    return NextResponse.json({ tasks: results });
  } catch (error) {
    console.error("❌ Error searching tasks:", error);
    return NextResponse.json(
      { error: "Failed to search tasks" },
      { status: 500 }
    );
  }
}
