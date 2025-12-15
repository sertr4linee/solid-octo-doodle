import { prisma } from "@/lib/prisma";
import { verifyApiKey, hasScope, checkRateLimit } from "@/lib/api-key";
import { NextRequest, NextResponse } from "next/server";

// GET /api/v1/boards - List boards accessible by API key
export async function GET(request: NextRequest) {
  // Verify API key
  const { valid, apiKey, error } = await verifyApiKey(request);

  if (!valid || !apiKey) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: 401 }
    );
  }

  // Check scope
  if (!hasScope(apiKey.scopes, "read:boards")) {
    return NextResponse.json(
      { error: "Missing required scope: read:boards" },
      { status: 403 }
    );
  }

  // Check rate limit
  const { allowed, remaining, resetAt } = checkRateLimit(
    apiKey.id,
    apiKey.rateLimit
  );

  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": apiKey.rateLimit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": resetAt.toString(),
        },
      }
    );
  }

  try {
    // Get boards based on organization or user
    const whereClause: Record<string, unknown> = {};

    if (apiKey.organizationId) {
      whereClause.organizationId = apiKey.organizationId;
    } else {
      // Get boards where user is a member
      whereClause.members = {
        some: { userId: apiKey.userId },
      };
    }

    const boards = await prisma.board.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            lists: true,
            members: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(
      {
        data: boards,
        meta: {
          count: boards.length,
        },
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

// POST /api/v1/boards - Create a new board
export async function POST(request: NextRequest) {
  // Verify API key
  const { valid, apiKey, error } = await verifyApiKey(request);

  if (!valid || !apiKey) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: 401 }
    );
  }

  // Check scope
  if (!hasScope(apiKey.scopes, "write:boards")) {
    return NextResponse.json(
      { error: "Missing required scope: write:boards" },
      { status: 403 }
    );
  }

  // Check rate limit
  const { allowed, remaining, resetAt } = checkRateLimit(
    apiKey.id,
    apiKey.rateLimit
  );

  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": apiKey.rateLimit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": resetAt.toString(),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { name, description, visibility } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!apiKey.organizationId) {
      return NextResponse.json(
        { error: "Organization API key required to create boards" },
        { status: 400 }
      );
    }

    const board = await prisma.board.create({
      data: {
        id: `board_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name,
        description,
        visibility: visibility || "private",
        organizationId: apiKey.organizationId,
        createdById: apiKey.userId,
        members: {
          create: {
            id: `bm_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            userId: apiKey.userId,
            role: "admin",
          },
        },
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
      { data: board },
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
