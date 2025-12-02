import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { canAccessBoard } from "@/lib/permissions";
import { emitToBoard } from "@/lib/socket";

// GET - Get all reactions for a task
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

    // Check board access
    const hasAccess = await canAccessBoard(session.user.id, task.list.board.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    const reactions = await prisma.taskReaction.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group reactions by emoji
    const grouped = reactions.reduce((acc: any, reaction: any) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
          userReacted: false,
        };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].users.push(reaction.user);
      if (reaction.userId === session.user.id) {
        acc[reaction.emoji].userReacted = true;
      }
      return acc;
    }, {});

    return NextResponse.json(Object.values(grouped));
  } catch (error) {
    console.error("❌ Error fetching task reactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch reactions" },
      { status: 500 }
    );
  }
}

// POST - Add a reaction to a task
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
    const { emoji } = body;

    if (!emoji) {
      return NextResponse.json(
        { error: "Emoji is required" },
        { status: 400 }
      );
    }

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

    // Check board access
    const hasAccess = await canAccessBoard(session.user.id, task.list.board.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    // Check if reaction already exists
    const existing = await prisma.taskReaction.findUnique({
      where: {
        taskId_userId_emoji: {
          taskId,
          userId: session.user.id,
          emoji,
        },
      },
    });

    if (existing) {
      // Remove reaction if it exists (toggle)
      await prisma.taskReaction.delete({
        where: { id: existing.id },
      });

      emitToBoard(task.list.board.id, "task:reaction:removed", {
        taskId,
        emoji,
        userId: session.user.id,
      });

      return NextResponse.json({ removed: true });
    }

    // Create reaction
    const reaction = await prisma.taskReaction.create({
      data: {
        id: `reaction_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        taskId,
        userId: session.user.id,
        emoji,
        createdAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Broadcast update
    emitToBoard(task.list.board.id, "task:reaction:added", {
      taskId,
      reaction,
      userId: session.user.id,
    });

    return NextResponse.json(reaction, { status: 201 });
  } catch (error) {
    console.error("❌ Error adding reaction:", error);
    return NextResponse.json(
      { error: "Failed to add reaction" },
      { status: 500 }
    );
  }
}
