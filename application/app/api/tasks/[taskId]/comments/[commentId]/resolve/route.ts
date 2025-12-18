import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// POST /api/tasks/[taskId]/comments/[commentId]/resolve - Resolve/unresolve thread
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
    const { resolved } = body;

    // Verify comment exists and user has access
    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
        parentId: null, // Only top-level comments can be resolved (thread roots)
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
        user: { select: { id: true, name: true } },
      },
    });

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found, access denied, or comment is a reply (only thread roots can be resolved)" },
        { status: 404 }
      );
    }

    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        isResolved: resolved,
        resolvedAt: resolved ? new Date() : null,
        resolvedById: resolved ? session.user.id : null,
      },
      include: {
        resolvedBy: { select: { id: true, name: true, image: true } },
        _count: { select: { replies: true } },
      },
    });

    // Notify comment author if resolved by someone else
    if (resolved && comment.userId !== session.user.id) {
      await prisma.notification.create({
        data: {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          userId: comment.userId,
          type: "thread_resolved",
          title: "Your thread was resolved",
          message: `${session.user.name} resolved your thread on "${comment.task.title}"`,
          data: JSON.stringify({
            taskId,
            commentId,
            boardId: comment.task.list.boardId,
            resolvedBy: session.user.id,
          }),
        },
      });
    }

    // Log activity
    await prisma.activity.create({
      data: {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: resolved ? "thread_resolved" : "thread_reopened",
        description: `${session.user.name} ${resolved ? "resolved" : "reopened"} a thread on "${comment.task.title}"`,
        userId: session.user.id,
        boardId: comment.task.list.boardId,
        taskId,
        metadata: JSON.stringify({ commentId }),
      },
    });

    return NextResponse.json({
      success: true,
      isResolved: updatedComment.isResolved,
      resolvedAt: updatedComment.resolvedAt,
      resolvedBy: updatedComment.resolvedBy,
    });
  } catch (error) {
    console.error("Error resolving thread:", error);
    return NextResponse.json({ error: "Failed to resolve thread" }, { status: 500 });
  }
}
