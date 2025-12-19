import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { canAccessBoard } from "@/lib/permissions";
import { emitToBoard } from "@/lib/socket";
import { triggerAutomation, checkChecklistCompletion } from "@/lib/automation-engine";

// POST - Toggle checklist item checked status
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string; checklistId: string; itemId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        checklist: {
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
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Check board access
    const hasAccess = await canAccessBoard(
      session.user.id,
      item.checklist.task.list.board.id
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No access to this board" },
        { status: 403 }
      );
    }

    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        checked: !item.checked,
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
    emitToBoard(item.checklist.task.list.board.id, "checklist:item:checked", {
      taskId: item.checklist.taskId,
      checklistId: item.checklistId,
      item: updated,
      userId: session.user.id,
    });

    // Déclencher les automatisations
    try {
      const boardId = item.checklist.task.list.board.id;
      const taskId = item.checklist.taskId;

      // Trigger checklist_item_checked si item coché
      if (updated.checked) {
        await triggerAutomation(boardId, "checklist_item_checked", {
          taskId,
          task: item.checklist.task,
          checklistId: item.checklistId,
          checklist: item.checklist,
          checklistItemId: updated.id,
          checklistItem: updated,
          userId: session.user.id,
        });

        // Vérifier si la checklist entière est complète
        await checkChecklistCompletion(item.checklistId);
      }
    } catch (automationError) {
      console.error("⚠️ Automation trigger error:", automationError);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("❌ Error toggling checklist item:", error);
    return NextResponse.json(
      { error: "Failed to toggle checklist item" },
      { status: 500 }
    );
  }
}
