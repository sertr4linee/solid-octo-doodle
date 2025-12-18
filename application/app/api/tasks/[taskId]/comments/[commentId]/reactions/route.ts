import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// POST /api/tasks/[taskId]/comments/[commentId]/reactions - Add/toggle reaction
// DELETE /api/tasks/[taskId]/comments/[commentId]/reactions - Remove reaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; commentId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, commentId } = await params;
    const body = await request.json();
    const { emoji } = body;

    if (!emoji) {
      return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
    }

    // Verify comment exists and user has access
    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
        task: {
          list: {
            board: {
              OR: [
                { createdById: session.user.id },
                { members: { some: { userId: session.user.id } } },
              ],
            },
          },
        },
      },
      include: {
        task: { include: { list: { include: { board: true } } } },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found or access denied" }, { status: 404 });
    }

    // Check if reaction already exists
    const existingReaction = await prisma.commentReaction.findFirst({
      where: {
        commentId,
        userId: session.user.id,
        emoji,
      },
    });

    if (existingReaction) {
      // Toggle off - remove reaction
      await prisma.commentReaction.delete({
        where: { id: existingReaction.id },
      });
      return NextResponse.json({ success: true, action: "removed" });
    }

    // Add reaction
    const reaction = await prisma.commentReaction.create({
      data: {
        id: `react_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        commentId,
        userId: session.user.id,
        emoji,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    // Notify comment author (if not self)
    if (comment.userId !== session.user.id) {
      await prisma.notification.create({
        data: {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          userId: comment.userId,
          type: "reaction",
          title: "Someone reacted to your comment",
          message: `${session.user.name} reacted ${emoji} to your comment`,
          data: JSON.stringify({
            taskId,
            commentId,
            boardId: comment.task.list.boardId,
            reactedBy: session.user.id,
            emoji,
          }),
        },
      });
    }

    return NextResponse.json({ success: true, action: "added", reaction });
  } catch (error) {
    console.error("Error managing reaction:", error);
    return NextResponse.json({ error: "Failed to manage reaction" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; commentId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, commentId } = await params;
    const { searchParams } = new URL(request.url);
    const emoji = searchParams.get("emoji");

    if (!emoji) {
      return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
    }

    // Verify comment exists
    const comment = await prisma.comment.findFirst({
      where: { id: commentId, taskId },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Remove reaction
    const deleted = await prisma.commentReaction.deleteMany({
      where: {
        commentId,
        userId: session.user.id,
        emoji,
      },
    });

    return NextResponse.json({ success: true, deleted: deleted.count > 0 });
  } catch (error) {
    console.error("Error removing reaction:", error);
    return NextResponse.json({ error: "Failed to remove reaction" }, { status: 500 });
  }
}

// GET - Get all reactions for a comment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; commentId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, commentId } = await params;

    // Verify access
    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
        task: {
          list: {
            board: {
              OR: [
                { createdById: session.user.id },
                { members: { some: { userId: session.user.id } } },
              ],
            },
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found or access denied" }, { status: 404 });
    }

    const reactions = await prisma.commentReaction.findMany({
      where: { commentId },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    // Group by emoji
    const groups: Record<string, { emoji: string; count: number; users: any[]; hasReacted: boolean }> = {};
    
    for (const reaction of reactions) {
      if (!groups[reaction.emoji]) {
        groups[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
          hasReacted: false,
        };
      }
      groups[reaction.emoji].count++;
      groups[reaction.emoji].users.push(reaction.user);
      if (reaction.userId === session.user.id) {
        groups[reaction.emoji].hasReacted = true;
      }
    }

    return NextResponse.json({ reactions: Object.values(groups) });
  } catch (error) {
    console.error("Error fetching reactions:", error);
    return NextResponse.json({ error: "Failed to fetch reactions" }, { status: 500 });
  }
}
