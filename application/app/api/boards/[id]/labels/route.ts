import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitToBoard } from "@/lib/socket";
import { canAccessBoard } from "@/lib/permissions";

// GET - List all labels for a board
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

    // Check if user has access to board
    const hasAccess = await canAccessBoard(session.user.id, boardId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have access to this board" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";

    const labels = await prisma.label.findMany({
      where: { boardId },
      include: includeStats
        ? {
            _count: {
              select: {
                taskLabels: true,
              },
            },
            taskLabels: {
              select: {
                task: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          }
        : undefined,
      orderBy: { position: "asc" },
    });

    return NextResponse.json(labels);
  } catch (error) {
    console.error("❌ Error fetching labels:", error);
    return NextResponse.json(
      { error: "Failed to fetch labels" },
      { status: 500 }
    );
  }
}

// POST - Create a new label
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

    // Check if user has access to board
    const hasAccess = await canAccessBoard(session.user.id, boardId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have permission to create labels" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, color } = body;

    if (!name || !color) {
      return NextResponse.json(
        { error: "Name and color are required" },
        { status: 400 }
      );
    }

    // Check if label with same name already exists
    const existingLabel = await prisma.label.findUnique({
      where: {
        boardId_name: {
          boardId,
          name,
        },
      },
    });

    if (existingLabel) {
      return NextResponse.json(
        { error: "A label with this name already exists" },
        { status: 400 }
      );
    }

    // Get max position
    const maxPosition = await prisma.label.findFirst({
      where: { boardId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const label = await prisma.label.create({
      data: {
        id: `label_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name,
        description,
        color,
        boardId,
        position: (maxPosition?.position ?? -1) + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "label_created",
        description: `Created label "${label.name}"`,
        boardId,
        userId: session.user.id,
        createdAt: new Date(),
      },
    });

    // Broadcast update
    emitToBoard(boardId, "label:created", {
      label,
      userId: session.user.id,
    });

    return NextResponse.json(label, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating label:", error);
    return NextResponse.json(
      { error: "Failed to create label" },
      { status: 500 }
    );
  }
}
