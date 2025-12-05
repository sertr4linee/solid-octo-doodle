import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { canAccessBoard } from "@/lib/permissions";
import { emitToBoard } from "@/lib/socket";

// POST - Create checklist item
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string; checklistId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { checklistId } = await params;
    const body = await request.json();
    const { content, assigneeId, dueDate, parentId } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const checklist = await prisma.checklist.findUnique({
      where: { id: checklistId },
      include: {
        task: {
          include: {
            list: {
              include: {
                board: true,
              },
            },
          },
        },
      },
    });

    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    // Check board access
    const hasAccess = await canAccessBoard(
      session.user.id,
      checklist.task.list.board.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    // Get max position
    const maxPosition = await prisma.checklistItem.findFirst({
      where: { checklistId, parentId: parentId || null },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const position = (maxPosition?.position ?? -1) + 1;

    const item = await prisma.checklistItem.create({
      data: {
        id: `checkitem_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        checklistId,
        content,
        position,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        parentId: parentId || null,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Emit event
    emitToBoard(checklist.task.list.board.id, "checklist:item:created", {
      taskId: checklist.taskId,
      checklistId,
      item,
      userId: session.user.id,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating checklist item:", error);
    return NextResponse.json(
      { error: "Failed to create checklist item" },
      { status: 500 }
    );
  }
}
