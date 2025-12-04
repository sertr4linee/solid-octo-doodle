import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// GET - List all templates
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const templates = await prisma.boardTemplate.findMany({
      where: {
        isPublic: true,
        ...(category && { category }),
      },
      include: {
        lists: {
          include: {
            tasks: true,
          },
          orderBy: {
            position: "asc",
          },
        },
      },
      orderBy: [
        { isPredefined: "desc" },
        { usageCount: "desc" },
        { rating: "desc" },
      ],
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("❌ Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST - Create template from existing board
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { boardId, name, description, category, icon, isPublic } = body;

    // Get board with all its data
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        lists: {
          include: {
            tasks: true,
          },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Create template
    const template = await prisma.boardTemplate.create({
      data: {
        id: `template_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: name || board.name,
        description: description || board.description,
        category: category || "custom",
        icon: icon,
        coverImage: board.background,
        isPredefined: false,
        isPublic: isPublic !== false,
        createdById: session.user.id,
        organizationId: board.organizationId,
        lists: {
          create: board.lists.map((list: any, listIndex: number) => ({
            id: `tlist_${Date.now()}_${listIndex}_${Math.random().toString(36).substring(7)}`,
            name: list.name,
            position: list.position,
            color: list.color,
            emoji: list.emoji,
            tasks: {
              create: list.tasks.map((task: any, taskIndex: number) => ({
                id: `ttask_${Date.now()}_${listIndex}_${taskIndex}_${Math.random().toString(36).substring(7)}`,
                title: task.title,
                description: task.description,
                position: task.position,
                emoji: task.emoji,
                coverColor: task.coverColor,
                coverImage: task.coverImage,
              })),
            },
          })),
        },
      },
      include: {
        lists: {
          include: {
            tasks: true,
          },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
