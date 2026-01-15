import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitToBoard } from "@/lib/socket";
import { canAccessBoard } from "@/lib/permissions";

// Link types for card relationships
export const LINK_TYPES = {
  related_to: { label: "Related to", icon: "link", inverse: "related_to" },
  follow_up_of: { label: "Follow-up of", icon: "corner-down-right", inverse: "has_follow_up" },
  has_follow_up: { label: "Has follow-up", icon: "corner-up-left", inverse: "follow_up_of" },
  duplicate: { label: "Duplicate of", icon: "copy", inverse: "has_duplicate" },
  has_duplicate: { label: "Has duplicate", icon: "copy", inverse: "duplicate" },
  blocks: { label: "Blocks", icon: "ban", inverse: "blocked_by" },
  blocked_by: { label: "Blocked by", icon: "octagon", inverse: "blocks" },
} as const;

// GET - Fetch all links for a task (both outgoing and incoming)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    // Get task and verify access
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        list: {
          include: {
            board: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const hasAccess = await canAccessBoard(session.user.id, task.list.board.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    // Get outgoing links (this task links to other tasks)
    const outgoingLinks = await prisma.cardLink.findMany({
      where: { fromTaskId: taskId },
      include: {
        toTask: {
          include: {
            list: {
              include: {
                board: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Get incoming links (other tasks link to this task)
    const incomingLinks = await prisma.cardLink.findMany({
      where: { toTaskId: taskId },
      include: {
        fromTask: {
          include: {
            list: {
              include: {
                board: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Transform links with proper direction context
    const links = [
      ...outgoingLinks.map((link) => ({
        id: link.id,
        direction: "outgoing" as const,
        linkType: link.linkType,
        linkedTask: {
          id: link.toTask.id,
          title: link.toTask.title,
          emoji: link.toTask.emoji,
          listName: link.toTask.list.name,
          boardId: link.toTask.list.board.id,
          boardName: link.toTask.list.board.name,
        },
        createdBy: link.createdBy,
        createdAt: link.createdAt,
      })),
      ...incomingLinks.map((link) => ({
        id: link.id,
        direction: "incoming" as const,
        linkType: LINK_TYPES[link.linkType as keyof typeof LINK_TYPES]?.inverse || link.linkType,
        linkedTask: {
          id: link.fromTask.id,
          title: link.fromTask.title,
          emoji: link.fromTask.emoji,
          listName: link.fromTask.list.name,
          boardId: link.fromTask.list.board.id,
          boardName: link.fromTask.list.board.name,
        },
        createdBy: link.createdBy,
        createdAt: link.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ links, linkTypes: LINK_TYPES });
  } catch (error) {
    console.error("❌ Error fetching task links:", error);
    return NextResponse.json(
      { error: "Failed to fetch task links" },
      { status: 500 }
    );
  }
}

// POST - Create a new link between tasks
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await request.json();
    const { targetTaskId, linkType } = body;

    if (!targetTaskId || !linkType) {
      return NextResponse.json(
        { error: "Target task ID and link type are required" },
        { status: 400 }
      );
    }

    // Prevent self-linking
    if (taskId === targetTaskId) {
      return NextResponse.json(
        { error: "Cannot link a task to itself" },
        { status: 400 }
      );
    }

    // Validate link type
    if (!LINK_TYPES[linkType as keyof typeof LINK_TYPES]) {
      return NextResponse.json(
        { error: "Invalid link type" },
        { status: 400 }
      );
    }

    // Get source task and verify access
    const sourceTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        list: {
          include: { board: true },
        },
      },
    });

    if (!sourceTask) {
      return NextResponse.json({ error: "Source task not found" }, { status: 404 });
    }

    const hasAccess = await canAccessBoard(session.user.id, sourceTask.list.board.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    // Verify target task exists
    const targetTask = await prisma.task.findUnique({
      where: { id: targetTaskId },
      include: {
        list: {
          include: { board: true },
        },
      },
    });

    if (!targetTask) {
      return NextResponse.json({ error: "Target task not found" }, { status: 404 });
    }

    // Check if link already exists (in either direction for symmetric types)
    const existingLink = await prisma.cardLink.findFirst({
      where: {
        OR: [
          { fromTaskId: taskId, toTaskId: targetTaskId, linkType },
          // For symmetric relationships like "related_to"
          ...(linkType === "related_to"
            ? [{ fromTaskId: targetTaskId, toTaskId: taskId, linkType }]
            : []),
        ],
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: "Link already exists between these tasks" },
        { status: 400 }
      );
    }

    // Create the link
    const link = await prisma.cardLink.create({
      data: {
        id: `cardlink_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        fromTaskId: taskId,
        toTaskId: targetTaskId,
        linkType,
        createdById: session.user.id,
        createdAt: new Date(),
      },
      include: {
        toTask: {
          include: {
            list: {
              include: {
                board: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "task_linked",
        description: `Linked task to "${targetTask.title}"`,
        boardId: sourceTask.list.board.id,
        taskId,
        userId: session.user.id,
        createdAt: new Date(),
      },
    });

    // Broadcast updates to both boards if different
    emitToBoard(sourceTask.list.board.id, "task:link:created", {
      taskId,
      link: {
        id: link.id,
        linkType,
        linkedTask: {
          id: link.toTask.id,
          title: link.toTask.title,
          emoji: link.toTask.emoji,
        },
      },
      userId: session.user.id,
    });

    if (targetTask.list.board.id !== sourceTask.list.board.id) {
      emitToBoard(targetTask.list.board.id, "task:link:created", {
        taskId: targetTaskId,
        link: {
          id: link.id,
          linkType: LINK_TYPES[linkType as keyof typeof LINK_TYPES]?.inverse || linkType,
          linkedTask: {
            id: sourceTask.id,
            title: sourceTask.title,
            emoji: sourceTask.emoji,
          },
        },
        userId: session.user.id,
      });
    }

    return NextResponse.json(
      {
        id: link.id,
        direction: "outgoing",
        linkType: link.linkType,
        linkedTask: {
          id: link.toTask.id,
          title: link.toTask.title,
          emoji: link.toTask.emoji,
          listName: link.toTask.list.name,
          boardId: link.toTask.list.board.id,
          boardName: link.toTask.list.board.name,
        },
        createdBy: link.createdBy,
        createdAt: link.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating task link:", error);
    return NextResponse.json(
      { error: "Failed to create task link" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a link
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("linkId");

    if (!linkId) {
      return NextResponse.json(
        { error: "Link ID is required" },
        { status: 400 }
      );
    }

    // Get the link
    const link = await prisma.cardLink.findUnique({
      where: { id: linkId },
      include: {
        fromTask: {
          include: {
            list: {
              include: { board: true },
            },
          },
        },
        toTask: {
          include: {
            list: {
              include: { board: true },
            },
          },
        },
      },
    });

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // Verify user has access to either task's board
    const hasAccessFrom = await canAccessBoard(session.user.id, link.fromTask.list.board.id);
    const hasAccessTo = await canAccessBoard(session.user.id, link.toTask.list.board.id);

    if (!hasAccessFrom && !hasAccessTo) {
      return NextResponse.json(
        { error: "No access to linked boards" },
        { status: 403 }
      );
    }

    // Delete the link
    await prisma.cardLink.delete({
      where: { id: linkId },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "task_unlinked",
        description: `Removed link to "${link.toTask.title}"`,
        boardId: link.fromTask.list.board.id,
        taskId,
        userId: session.user.id,
        createdAt: new Date(),
      },
    });

    // Broadcast updates
    emitToBoard(link.fromTask.list.board.id, "task:link:deleted", {
      taskId: link.fromTaskId,
      linkId,
      userId: session.user.id,
    });

    if (link.toTask.list.board.id !== link.fromTask.list.board.id) {
      emitToBoard(link.toTask.list.board.id, "task:link:deleted", {
        taskId: link.toTaskId,
        linkId,
        userId: session.user.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting task link:", error);
    return NextResponse.json(
      { error: "Failed to delete task link" },
      { status: 500 }
    );
  }
}
