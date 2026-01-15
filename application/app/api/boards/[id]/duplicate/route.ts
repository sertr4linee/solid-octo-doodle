import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitToOrganization } from "@/lib/socket";

interface DuplicateOptions {
  includeLists: boolean;
  includeTasks: boolean;
  includeMembers: boolean;
  includeLabels: boolean;
  includeAutomations: boolean;
  newName?: string;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body: DuplicateOptions = await request.json();

    const {
      includeLists = true,
      includeTasks = false,
      includeMembers = false,
      includeLabels = true,
      includeAutomations = false,
      newName,
    } = body;

    // Get source board with all data
    const sourceBoard = await prisma.board.findUnique({
      where: { id },
      include: {
        members: true,
        lists: {
          where: { archived: false },
          include: {
            tasks: {
              where: { archived: false },
              include: {
                taskLabels: true,
                checklists: {
                  include: {
                    items: true,
                  },
                },
              },
              orderBy: { position: "asc" },
            },
          },
          orderBy: { position: "asc" },
        },
        labels: true,
        automationRules: includeAutomations,
      },
    });

    if (!sourceBoard) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Check if user has access to the board
    const userMember = sourceBoard.members.find((m) => m.userId === session.user.id);
    if (!userMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Generate new board ID
    const newBoardId = generateId("board");
    const boardName = newName || `Copy of ${sourceBoard.name}`;

    // Create mappings for IDs (old -> new)
    const listIdMap = new Map<string, string>();
    const labelIdMap = new Map<string, string>();
    const taskIdMap = new Map<string, string>();

    // Start transaction
    const newBoard = await prisma.$transaction(async (tx) => {
      // 1. Create the new board
      const board = await tx.board.create({
        data: {
          id: newBoardId,
          name: boardName,
          description: sourceBoard.description,
          organizationId: sourceBoard.organizationId,
          createdById: session.user.id,
          visibility: sourceBoard.visibility,
          background: sourceBoard.background,
          backgroundType: sourceBoard.backgroundType,
          backgroundBlur: sourceBoard.backgroundBlur,
          theme: sourceBoard.theme,
          darkMode: sourceBoard.darkMode,
          defaultView: sourceBoard.defaultView,
        },
      });

      // 2. Add creator as owner
      await tx.boardMember.create({
        data: {
          id: generateId("member"),
          boardId: newBoardId,
          userId: session.user.id,
          role: "owner",
        },
      });

      // 3. Add other members if requested
      if (includeMembers) {
        const otherMembers = sourceBoard.members.filter(
          (m) => m.userId !== session.user.id
        );
        for (const member of otherMembers) {
          await tx.boardMember.create({
            data: {
              id: generateId("member"),
              boardId: newBoardId,
              userId: member.userId,
              role: member.role === "owner" ? "admin" : member.role,
            },
          });
        }
      }

      // 4. Create labels if requested
      if (includeLabels && sourceBoard.labels.length > 0) {
        for (const label of sourceBoard.labels) {
          const newLabelId = generateId("label");
          labelIdMap.set(label.id, newLabelId);

          await tx.label.create({
            data: {
              id: newLabelId,
              name: label.name,
              color: label.color,
              boardId: newBoardId,
            },
          });
        }
      }

      // 5. Create lists if requested
      if (includeLists && sourceBoard.lists.length > 0) {
        for (const list of sourceBoard.lists) {
          const newListId = generateId("list");
          listIdMap.set(list.id, newListId);

          await tx.list.create({
            data: {
              id: newListId,
              name: list.name,
              boardId: newBoardId,
              position: list.position,
              color: list.color,
              emoji: list.emoji,
            },
          });

          // 6. Create tasks if requested
          if (includeTasks && list.tasks.length > 0) {
            for (const task of list.tasks) {
              const newTaskId = generateId("task");
              taskIdMap.set(task.id, newTaskId);

              await tx.task.create({
                data: {
                  id: newTaskId,
                  title: task.title,
                  description: task.description,
                  listId: newListId,
                  position: task.position,
                  dueDate: task.dueDate,
                  coverImage: task.coverImage,
                  coverColor: task.coverColor,
                  emoji: task.emoji,
                },
              });

              // Create task labels if labels were duplicated
              if (includeLabels && task.taskLabels.length > 0) {
                for (const taskLabel of task.taskLabels) {
                  const newLabelId = labelIdMap.get(taskLabel.labelId);
                  if (newLabelId) {
                    await tx.taskLabel.create({
                      data: {
                        id: generateId("tl"),
                        taskId: newTaskId,
                        labelId: newLabelId,
                      },
                    });
                  }
                }
              }

              // Create checklists
              if (task.checklists.length > 0) {
                for (const checklist of task.checklists) {
                  const newChecklistId = generateId("checklist");

                  await tx.checklist.create({
                    data: {
                      id: newChecklistId,
                      title: checklist.title,
                      taskId: newTaskId,
                      position: checklist.position,
                    },
                  });

                  // Create checklist items
                  for (const item of checklist.items) {
                    await tx.checklistItem.create({
                      data: {
                        id: generateId("item"),
                        content: item.content,
                        checked: false, // Reset checked status
                        checklistId: newChecklistId,
                        position: item.position,
                      },
                    });
                  }
                }
              }
            }
          }
        }
      }

      // 7. Create automations if requested
      if (includeAutomations && sourceBoard.automationRules) {
        for (const rule of sourceBoard.automationRules as any[]) {
          await tx.automationRule.create({
            data: {
              id: generateId("rule"),
              name: rule.name,
              description: rule.description,
              boardId: newBoardId,
              trigger: rule.trigger,
              conditions: rule.conditions,
              actions: rule.actions,
              isActive: false, // Disabled by default for safety
              createdById: session.user.id,
            },
          });
        }
      }

      // 8. Create activity log
      await tx.activity.create({
        data: {
          id: generateId("activity"),
          type: "board_created",
          description: `Duplicated board from "${sourceBoard.name}"`,
          boardId: newBoardId,
          userId: session.user.id,
          metadata: JSON.stringify({
            sourceId: sourceBoard.id,
            sourceName: sourceBoard.name,
            options: {
              includeLists,
              includeTasks,
              includeMembers,
              includeLabels,
              includeAutomations,
            },
          }),
        },
      });

      return board;
    });

    // Get the full new board with relations
    const fullBoard = await prisma.board.findUnique({
      where: { id: newBoardId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            lists: true,
            labels: true,
          },
        },
      },
    });

    // Emit socket event
    emitToOrganization(sourceBoard.organizationId, "board:created", {
      board: fullBoard,
      userId: session.user.id,
      duplicatedFrom: sourceBoard.id,
    });

    return NextResponse.json({
      board: fullBoard,
      stats: {
        listsCreated: listIdMap.size,
        tasksCreated: taskIdMap.size,
        labelsCreated: labelIdMap.size,
      },
    });
  } catch (error) {
    console.error("Error duplicating board:", error);
    return NextResponse.json(
      { error: "Failed to duplicate board" },
      { status: 500 }
    );
  }
}
