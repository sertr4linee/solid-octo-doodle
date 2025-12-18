import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// GET /api/boards/[id]/lists/[listId]/tasks/[taskId]/attachments - List attachments for a task
// POST /api/boards/[id]/lists/[listId]/tasks/[taskId]/attachments - Add external link attachment

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; listId: string; taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: boardId, taskId } = await params;

    // Verify access to board
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { createdById: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found or access denied" }, { status: 404 });
    }

    // Get attachments
    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error("Error fetching attachments:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; listId: string; taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: boardId, listId, taskId } = await params;
    const body = await request.json();
    const { name, url, thumbnailUrl } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: "Missing required fields: name, url" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Verify access to board
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        listId,
        list: {
          boardId,
          board: {
            OR: [
              { createdById: session.user.id },
              { members: { some: { userId: session.user.id } } },
            ],
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
    }

    // Determine mime type from URL extension
    const extension = url.split(".").pop()?.toLowerCase().split("?")[0];
    const mimeTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      zip: "application/zip",
      mp4: "video/mp4",
      mp3: "audio/mpeg",
    };
    const mimeType = mimeTypeMap[extension || ""] || "application/octet-stream";

    // Create attachment record
    const attachment = await prisma.attachment.create({
      data: {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        taskId,
        name,
        mimeType,
        size: 0, // Unknown for external links
        storageType: "external_link",
        url,
        thumbnailUrl: thumbnailUrl || (mimeType.startsWith("image/") ? url : null),
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      attachment,
    });
  } catch (error) {
    console.error("Error creating attachment:", error);
    return NextResponse.json(
      { error: "Failed to create attachment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; listId: string; taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: boardId, listId, taskId } = await params;
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("attachmentId");

    if (!attachmentId) {
      return NextResponse.json(
        { error: "Missing attachmentId" },
        { status: 400 }
      );
    }

    // Get attachment and verify permissions
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        taskId,
        task: {
          listId,
          list: {
            boardId,
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
        task: {
          include: {
            list: {
              include: {
                board: {
                  include: { members: true },
                },
              },
            },
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found or access denied" },
        { status: 404 }
      );
    }

    // Check permissions
    const board = attachment.task.list.board;
    const membership = board.members.find((m) => m.userId === session.user.id);
    const isUploader = attachment.uploadedById === session.user.id;
    const isOwner = board.createdById === session.user.id;
    const isAdmin = membership?.role === "admin";

    if (!isUploader && !isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to delete this attachment" },
        { status: 403 }
      );
    }

    // For Google Drive files, use the dedicated delete endpoint
    if (attachment.storageType === "google_drive") {
      // Redirect to Google Drive delete endpoint
      const deleteResponse = await fetch(
        `${request.nextUrl.origin}/api/integrations/google/drive/delete?attachmentId=${attachmentId}`,
        {
          method: "DELETE",
          headers: {
            Cookie: request.headers.get("cookie") || "",
          },
        }
      );

      if (!deleteResponse.ok) {
        const error = await deleteResponse.json();
        return NextResponse.json(error, { status: deleteResponse.status });
      }

      return NextResponse.json({ success: true });
    }

    // For external links, just delete the record
    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
