import { prisma } from "@/lib/prisma";
import { verifyApiKey, hasScope, checkRateLimit } from "@/lib/api-key";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ boardId: string }>;
}

// GET /api/v1/boards/[boardId] - Get board details
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { valid, apiKey, error } = await verifyApiKey(request);

  if (!valid || !apiKey) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: 401 }
    );
  }

  if (!hasScope(apiKey.scopes, "read:boards")) {
    return NextResponse.json(
      { error: "Missing required scope: read:boards" },
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

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        lists: {
          orderBy: { position: "asc" },
          include: {
            tasks: {
              orderBy: { position: "asc" },
              select: {
                id: true,
                title: true,
                description: true,
                position: true,
                dueDate: true,
                archived: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        members: {
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!board) {
      return NextResponse.json(
        { error: "Board not found" },
        { status: 404 }
      );
    }

    // Check access
    if (apiKey.organizationId) {
      if (board.organizationId !== apiKey.organizationId) {
        return NextResponse.json(
          { error: "No access to this board" },
          { status: 403 }
        );
      }
    } else {
      const isMember = board.members.some((m) => m.user.id === apiKey.userId);
      if (!isMember) {
        return NextResponse.json(
          { error: "No access to this board" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { data: board },
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

// PATCH /api/v1/boards/[boardId] - Update board
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { valid, apiKey, error } = await verifyApiKey(request);

  if (!valid || !apiKey) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: 401 }
    );
  }

  if (!hasScope(apiKey.scopes, "write:boards")) {
    return NextResponse.json(
      { error: "Missing required scope: write:boards" },
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

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { members: true },
    });

    if (!board) {
      return NextResponse.json(
        { error: "Board not found" },
        { status: 404 }
      );
    }

    // Check access
    if (apiKey.organizationId && board.organizationId !== apiKey.organizationId) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    const { name, description, visibility } = body;

    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(visibility !== undefined && { visibility }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      { data: updatedBoard },
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

// DELETE /api/v1/boards/[boardId] - Delete board
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { valid, apiKey, error } = await verifyApiKey(request);

  if (!valid || !apiKey) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: 401 }
    );
  }

  if (!hasScope(apiKey.scopes, "delete:boards")) {
    return NextResponse.json(
      { error: "Missing required scope: delete:boards" },
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

    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      return NextResponse.json(
        { error: "Board not found" },
        { status: 404 }
      );
    }

    // Check access
    if (apiKey.organizationId && board.organizationId !== apiKey.organizationId) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    await prisma.board.delete({
      where: { id: boardId },
    });

    return NextResponse.json(
      { success: true },
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
