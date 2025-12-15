import { prisma } from "@/lib/prisma";
import { verifyApiKey, hasScope, checkRateLimit } from "@/lib/api-key";
import { triggerWebhooks } from "@/lib/webhooks";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ boardId: string }>;
}

// GET /api/v1/boards/[boardId]/tasks - Get all tasks in a board
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { valid, apiKey, error } = await verifyApiKey(request);

  if (!valid || !apiKey) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: 401 }
    );
  }

  if (!hasScope(apiKey.scopes, "read:tasks")) {
    return NextResponse.json(
      { error: "Missing required scope: read:tasks" },
      { status: 403 }
    );
  }

  const { allowed, remaining, resetAt } = checkRateLimit(
    apiKey.id,
    apiKey.rateLimit
  );

  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  try {
    const { boardId } = await params;
    const { searchParams } = new URL(request.url);
    
    const listId = searchParams.get("listId");
    const archived = searchParams.get("archived");

    // Verify board access
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      return NextResponse.json(
        { error: "Board not found" },
        { status: 404 }
      );
    }

    if (apiKey.organizationId && board.organizationId !== apiKey.organizationId) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    // Build where clause
    const whereClause: Record<string, unknown> = {
      list: { boardId },
    };

    if (listId) {
      whereClause.listId = listId;
    }
    if (archived !== null) {
      whereClause.archived = archived === "true";
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        list: {
          select: {
            id: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        checklists: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                items: true,
              },
            },
          },
        },
      },
      orderBy: [
        { list: { position: "asc" } },
        { position: "asc" },
      ],
    });

    return NextResponse.json(
      {
        data: tasks,
        meta: { count: tasks.length },
      },
      {
        headers: {
          "X-RateLimit-Limit": apiKey.rateLimit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": resetAt.toString(),
        },
      }
    );
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/v1/boards/[boardId]/tasks - Create a task
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { valid, apiKey, error } = await verifyApiKey(request);

  if (!valid || !apiKey) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: 401 }
    );
  }

  if (!hasScope(apiKey.scopes, "write:tasks")) {
    return NextResponse.json(
      { error: "Missing required scope: write:tasks" },
      { status: 403 }
    );
  }

  const { allowed, remaining, resetAt } = checkRateLimit(
    apiKey.id,
    apiKey.rateLimit
  );

  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  try {
    const { boardId } = await params;
    const body = await request.json();
    const { title, description, listId, dueDate, position } = body;

    if (!title || !listId) {
      return NextResponse.json(
        { error: "Title and listId are required" },
        { status: 400 }
      );
    }

    // Verify board and list access
    const list = await prisma.list.findFirst({
      where: { id: listId, boardId },
      include: { board: true },
    });

    if (!list) {
      return NextResponse.json(
        { error: "List not found in this board" },
        { status: 404 }
      );
    }

    if (apiKey.organizationId && list.board.organizationId !== apiKey.organizationId) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    // Get max position if not provided
    let taskPosition = position;
    if (taskPosition === undefined) {
      const lastTask = await prisma.task.findFirst({
        where: { listId },
        orderBy: { position: "desc" },
      });
      taskPosition = lastTask ? lastTask.position + 1 : 0;
    }

    const task = await prisma.task.create({
      data: {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        title,
        description,
        listId,
        dueDate: dueDate ? new Date(dueDate) : null,
        position: taskPosition,
      },
      include: {
        list: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Trigger webhooks
    triggerWebhooks("task.created", {
      task,
      boardId,
      listId,
    }, {
      boardId,
      organizationId: list.board.organizationId,
    });

    return NextResponse.json(
      { data: task },
      {
        status: 201,
        headers: {
          "X-RateLimit-Limit": apiKey.rateLimit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": resetAt.toString(),
        },
      }
    );
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
