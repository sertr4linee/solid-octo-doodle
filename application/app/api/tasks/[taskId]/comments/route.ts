import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { triggerAutomation } from "@/lib/automation-engine";

// GET /api/tasks/[taskId]/comments - List comments with threads
// POST /api/tasks/[taskId]/comments - Create a new comment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId"); // For getting replies
    const authorId = searchParams.get("authorId"); // Filter by author
    const search = searchParams.get("search"); // Search in content
    const resolved = searchParams.get("resolved"); // Filter by resolved status

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

    // Build where clause
    const where: any = {
      taskId,
      parentId: parentId || null, // Get top-level comments or replies
    };

    if (authorId) {
      where.userId = authorId;
    }

    if (search) {
      where.content = { contains: search, mode: "insensitive" };
    }

    if (resolved !== null) {
      where.isResolved = resolved === "true";
    }

    // Get comments with relations
    const comments = await prisma.comment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
        mentions: {
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
        attachments: {
          include: {
            uploadedBy: {
              select: { id: true, name: true, image: true },
            },
          },
        },
        resolvedBy: {
          select: { id: true, name: true, image: true },
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group reactions by emoji
    const commentsWithGroupedReactions = comments.map((comment) => {
      const reactionGroups: Record<string, { emoji: string; count: number; users: any[]; hasReacted: boolean }> = {};
      
      for (const reaction of comment.reactions) {
        if (!reactionGroups[reaction.emoji]) {
          reactionGroups[reaction.emoji] = {
            emoji: reaction.emoji,
            count: 0,
            users: [],
            hasReacted: false,
          };
        }
        reactionGroups[reaction.emoji].count++;
        reactionGroups[reaction.emoji].users.push(reaction.user);
        if (reaction.userId === session.user.id) {
          reactionGroups[reaction.emoji].hasReacted = true;
        }
      }

      return {
        ...comment,
        reactionGroups: Object.values(reactionGroups),
      };
    });

    return NextResponse.json({ comments: commentsWithGroupedReactions });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ 
      error: "Failed to fetch comments",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await request.json();
    const { content, parentId, mentionedUserIds } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

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
      include: {
        list: {
          include: {
            board: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
    }

    // If replying, verify parent exists
    if (parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: parentId, taskId },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        id: `cmt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        content,
        taskId,
        userId: session.user.id,
        parentId: parentId || null,
      },
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
    });

    // Create mentions and notifications
    if (mentionedUserIds?.length > 0) {
      for (const userId of mentionedUserIds) {
        // Create mention record
        await prisma.commentMention.create({
          data: {
            id: `mention_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            commentId: comment.id,
            userId,
          },
        });

        // Create notification
        await prisma.notification.create({
          data: {
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            userId,
            type: "mention",
            title: "You were mentioned in a comment",
            message: `${session.user.name} mentioned you in a comment on "${task.title}"`,
            data: JSON.stringify({
              taskId,
              commentId: comment.id,
              boardId: task.list.boardId,
              mentionedBy: session.user.id,
            }),
          },
        });
      }
    }

    // Log activity
    await prisma.activity.create({
      data: {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "comment_added",
        description: `${session.user.name} commented on "${task.title}"`,
        userId: session.user.id,
        boardId: task.list.boardId,
        taskId,
        metadata: JSON.stringify({ commentId: comment.id }),
      },
    });

    // Déclencher les automatisations
    try {
      // Trigger comment_added
      await triggerAutomation(task.list.boardId, "comment_added", {
        taskId,
        task,
        commentId: comment.id,
        comment,
        userId: session.user.id,
      });

      // Trigger comment_mention si des utilisateurs sont mentionnés
      if (mentionedUserIds?.length > 0) {
        await triggerAutomation(task.list.boardId, "comment_mention", {
          taskId,
          task,
          commentId: comment.id,
          comment,
          userId: session.user.id,
          mentionedUserIds,
        });
      }
    } catch (automationError) {
      console.error("⚠️ Automation trigger error:", automationError);
    }

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
