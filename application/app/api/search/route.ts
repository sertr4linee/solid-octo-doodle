import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// POST - Advanced search across boards and tasks
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      query,
      filters = {},
      scope = "all", // "all", "boards", "tasks"
      boardId,
      saveToHistory = true,
    } = body;

    const userId = session.user.id;

    // Build search conditions
    const searchTerms = query?.trim() || "";
    const {
      labels = [],
      members = [],
      dateFrom,
      dateTo,
      status = [],
      archived = false,
    } = filters;

    // Search in boards
    let boardResults: any[] = [];
    if (scope === "all" || scope === "boards") {
      const boardWhere: any = {
        archived,
        OR: searchTerms
          ? [
              { name: { contains: searchTerms, mode: "insensitive" } },
              { description: { contains: searchTerms, mode: "insensitive" } },
            ]
          : undefined,
        members: {
          some: {
            userId,
          },
        },
      };

      if (members.length > 0) {
        boardWhere.members = {
          some: {
            userId: { in: members },
          },
        };
      }

      boardResults = await prisma.board.findMany({
        where: boardWhere,
        include: {
          organization: {
            select: { id: true, name: true },
          },
          members: {
            select: {
              user: {
                select: { id: true, name: true, image: true },
              },
            },
          },
          _count: {
            select: { lists: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      });
    }

    // Search in tasks
    let taskResults: any[] = [];
    if (scope === "all" || scope === "tasks") {
      const taskWhere: any = {
        archived,
        OR: searchTerms
          ? [
              { title: { contains: searchTerms, mode: "insensitive" } },
              { description: { contains: searchTerms, mode: "insensitive" } },
            ]
          : undefined,
        list: {
          board: {
            members: {
              some: {
                userId,
              },
            },
          },
        },
      };

      if (boardId) {
        taskWhere.list = {
          ...taskWhere.list,
          boardId,
        };
      }

      if (labels.length > 0) {
        taskWhere.taskLabels = {
          some: {
            labelId: { in: labels },
          },
        };
      }

      if (members.length > 0) {
        taskWhere.assigneeId = { in: members };
      }

      if (status.length > 0) {
        taskWhere.list = {
          ...taskWhere.list,
          name: { in: status },
        };
      }

      if (dateFrom || dateTo) {
        taskWhere.dueDate = {};
        if (dateFrom) taskWhere.dueDate.gte = new Date(dateFrom);
        if (dateTo) taskWhere.dueDate.lte = new Date(dateTo);
      }

      taskResults = await prisma.task.findMany({
        where: taskWhere,
        include: {
          list: {
            select: {
              id: true,
              name: true,
              emoji: true,
              color: true,
              board: {
                select: {
                  id: true,
                  name: true,
                  organization: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
          assignee: {
            select: { id: true, name: true, image: true },
          },
          taskLabels: {
            include: {
              label: true,
            },
          },
          _count: {
            select: { comments: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      });
    }

    // Search in comments (if query provided)
    let commentResults: any[] = [];
    if ((scope === "all" || scope === "tasks") && searchTerms) {
      const comments = await prisma.comment.findMany({
        where: {
          content: { contains: searchTerms, mode: "insensitive" },
          task: {
            list: {
              board: {
                members: {
                  some: { userId },
                },
              },
            },
          },
        },
        include: {
          task: {
            include: {
              list: {
                select: {
                  id: true,
                  name: true,
                  board: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          user: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      commentResults = comments;
    }

    // Save to search history
    if (saveToHistory && searchTerms) {
      await prisma.searchHistory.create({
        data: {
          id: `search_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          userId,
          query: searchTerms,
          filters: JSON.stringify(filters),
          resultCount: boardResults.length + taskResults.length + commentResults.length,
        },
      });
    }

    return NextResponse.json({
      boards: boardResults,
      tasks: taskResults,
      comments: commentResults,
      totalResults: boardResults.length + taskResults.length + commentResults.length,
    });
  } catch (error) {
    console.error("❌ Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
