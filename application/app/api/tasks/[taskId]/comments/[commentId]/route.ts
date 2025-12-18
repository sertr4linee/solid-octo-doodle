import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// GET /api/tasks/[taskId]/comments/[commentId] - Get single comment with replies
// PUT /api/tasks/[taskId]/comments/[commentId] - Update comment
// DELETE /api/tasks/[taskId]/comments/[commentId] - Delete comment
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

    // Verify access to task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        list: {
          board: {
            OR: [
              { createdById: session.user.id },
              { members: { some: { userId: session.user.id } } },
            ],
          },
        },
      },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
    }

    const comment = await prisma.comment.findFirst({
      where: { id: commentId, taskId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
        mentions: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
        attachments: {
          include: {
            uploadedBy: { select: { id: true, name: true, image: true } },
          },
        },
        editHistory: {
          include: {
            editedBy: { select: { id: true, name: true, image: true } },
          },
          orderBy: { editedAt: "desc" },
        },
        resolvedBy: {
          select: { id: true, name: true, image: true },
        },
        replies: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            reactions: {
              include: {
                user: { select: { id: true, name: true, image: true } },
              },
            },
            _count: { select: { replies: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("Error fetching comment:", error);
    return NextResponse.json({ error: "Failed to fetch comment" }, { status: 500 });
  }
}

export async function PUT(
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
    const { content, mentionedUserIds } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Get existing comment
    const existingComment = await prisma.comment.findFirst({
      where: { id: commentId, taskId },
      include: { 
        task: { 
          include: { 
            list: { include: { board: true } } 
          } 
        },
        mentions: true,
      },
    });

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only author can edit
    if (existingComment.userId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized to edit this comment" }, { status: 403 });
    }

    // Save edit history
    await prisma.commentEdit.create({
      data: {
        id: `edit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        commentId,
        previousContent: existingComment.content,
        editedById: session.user.id,
      },
    });

    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content,
        isEdited: true,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        reactions: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
        mentions: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
        editHistory: {
          include: { editedBy: { select: { id: true, name: true, image: true } } },
          orderBy: { editedAt: "desc" },
        },
      },
    });

    // Handle new mentions
    if (mentionedUserIds?.length > 0) {
      const existingMentionIds = existingComment.mentions.map((m) => m.userId);
      const newMentions = mentionedUserIds.filter(
        (id: string) => !existingMentionIds.includes(id)
      );

      for (const userId of newMentions) {
        await prisma.commentMention.create({
          data: {
            id: `mention_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            commentId,
            userId,
          },
        });

        await prisma.notification.create({
          data: {
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            userId,
            type: "mention",
            title: "You were mentioned in a comment",
            message: `${session.user.name} mentioned you in a comment on "${existingComment.task.title}"`,
            data: JSON.stringify({
              taskId,
              commentId,
              boardId: existingComment.task.list.boardId,
              mentionedBy: session.user.id,
            }),
          },
        });
      }
    }

    return NextResponse.json({ success: true, comment: updatedComment });
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
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

    // Get comment
    const comment = await prisma.comment.findFirst({
      where: { id: commentId, taskId },
      include: {
        task: { include: { list: { include: { board: true } } } },
        attachments: true,
        _count: { select: { replies: true } },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only author or board owner can delete
    const isOwner = comment.userId === session.user.id;
    const isBoardOwner = comment.task.list.board.createdById === session.user.id;

    if (!isOwner && !isBoardOwner) {
      return NextResponse.json({ error: "Not authorized to delete this comment" }, { status: 403 });
    }

    // Delete related data first (cascade might not handle all)
    await prisma.commentReaction.deleteMany({ where: { commentId } });
    await prisma.commentMention.deleteMany({ where: { commentId } });
    await prisma.commentEdit.deleteMany({ where: { commentId } });
    await prisma.commentAttachment.deleteMany({ where: { commentId } });

    // If has replies, mark as deleted instead
    if (comment._count.replies > 0) {
      await prisma.comment.update({
        where: { id: commentId },
        data: {
          content: "[This comment has been deleted]",
          isEdited: true,
        },
      });
      return NextResponse.json({ success: true, softDeleted: true });
    }

    // Delete comment
    await prisma.comment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
