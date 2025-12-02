import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { broadcast } from "@/lib/socket";

// GET - List all boards for the current user
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const filter = searchParams.get("filter") || "all"; // all, my, shared, archived

    // Get user's organizations
    const userOrganizations = await prisma.member.findMany({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    const userOrgIds = userOrganizations.map((m) => m.organizationId);

    let whereClause: any = {
      OR: [
        // Boards where user is explicit member
        {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
        // Boards in user's organizations with organization visibility
        {
          organizationId: { in: userOrgIds },
          visibility: "organization",
        },
      ],
    };

    // Filter by organization
    if (organizationId) {
      whereClause.organizationId = organizationId;
      // Remove OR clause when filtering by specific org
      delete whereClause.OR;
      whereClause.OR = [
        {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
        {
          visibility: "organization",
        },
      ];
    }

    // Filter by type
    if (filter === "my") {
      whereClause.createdById = session.user.id;
    } else if (filter === "shared") {
      whereClause.createdById = { not: session.user.id };
    } else if (filter === "archived") {
      whereClause.archived = true;
    } else {
      whereClause.archived = false;
    }

    const boards = await prisma.board.findMany({
      where: whereClause,
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
        },
        _count: {
          select: {
            lists: true,
            members: true,
          },
        },
      },
      orderBy: [
        { starred: "desc" },
        { updatedAt: "desc" },
      ],
    });

    // Add user role to each board
    const boardsWithRole = boards.map((board) => {
      const userMember = board.members.find((m) => m.userId === session.user.id);
      return {
        ...board,
        userRole: userMember?.role || "member",
      };
    });

    return NextResponse.json(boardsWithRole);
  } catch (error) {
    console.error("❌ Error fetching boards:", error);
    return NextResponse.json(
      { error: "Failed to fetch boards" },
      { status: 500 }
    );
  }
}

// POST - Create a new board
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, organizationId, visibility, background } = body;

    if (!name || !organizationId) {
      return NextResponse.json(
        { error: "Name and organization are required" },
        { status: 400 }
      );
    }

    // Check if user is member of organization
    const member = await prisma.member.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "You must be a member of the organization" },
        { status: 403 }
      );
    }

    // Create board
    const board = await prisma.board.create({
      data: {
        id: `board_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name,
        description,
        organizationId,
        createdById: session.user.id,
        visibility: visibility || "organization", // Default to organization visibility
        background,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Add creator as owner
    await prisma.boardMember.create({
      data: {
        id: `${board.id}-${session.user.id}`,
        boardId: board.id,
        userId: session.user.id,
        role: "owner",
        createdAt: new Date(),
      },
    });

    // Create default lists
    const defaultLists = ["To Do", "In Progress", "Done"];
    for (let i = 0; i < defaultLists.length; i++) {
      await prisma.list.create({
        data: {
          id: `list_${board.id}_${i}_${Date.now()}`,
          name: defaultLists[i],
          boardId: board.id,
          position: i,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "board_created",
        description: `Created board "${board.name}"`,
        boardId: board.id,
        userId: session.user.id,
        createdAt: new Date(),
      },
    });

    // Émettre l'événement Socket.IO
    broadcast("board:created", {
      id: board.id,
      name: board.name,
      organizationId: board.organizationId,
      userId: session.user.id,
    });

    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating board:", error);
    return NextResponse.json(
      { error: "Failed to create board" },
      { status: 500 }
    );
  }
}
