import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { canAccessOrganization } from "@/lib/permissions";
import { emitToOrganization } from "@/lib/socket";

// POST - Create board from template
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

    const { id: templateId } = await params;
    const body = await request.json();
    const { organizationId, name, variables } = body;

    // Check organization access
    const hasAccess = await canAccessOrganization(session.user.id, organizationId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No access to this organization" },
        { status: 403 }
      );
    }

    // Get template
    const template = await prisma.boardTemplate.findUnique({
      where: { id: templateId },
      include: {
        lists: {
          include: {
            tasks: true,
          },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Function to replace variables
    const replaceVariables = (text: string | null, vars: any = {}): string => {
      if (!text) return '';
      let result = text;
      
      // Replace {{date}} with current date
      result = result.replace(/\{\{date\}\}/g, new Date().toISOString().split('T')[0]);
      
      // Replace {{assignee}} with variable or empty
      if (vars.assignee) {
        result = result.replace(/\{\{assignee\}\}/g, vars.assignee);
      } else {
        result = result.replace(/\{\{assignee\}\}/g, '');
      }
      
      // Replace {{organization}} with org name
      if (vars.organizationName) {
        result = result.replace(/\{\{organization\}\}/g, vars.organizationName);
      }
      
      return result;
    };

    // Get organization name for variables
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    const vars = {
      ...variables,
      organizationName: organization?.name,
    };

    // Create board from template
    const boardId = `board_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const board = await prisma.board.create({
      data: {
        id: boardId,
        name: name || template.name,
        description: replaceVariables(template.description, vars),
        organization: {
          connect: { id: organizationId },
        },
        createdBy: {
          connect: { id: session.user.id },
        },
        background: template.coverImage,
        createdAt: new Date(),
        updatedAt: new Date(),
        lists: {
          create: template.lists.map((list: any) => ({
            id: `list_${boardId}_${list.position}_${Date.now()}`,
            name: replaceVariables(list.name, vars),
            position: list.position,
            color: list.color,
            emoji: list.emoji,
            createdAt: new Date(),
            tasks: {
              create: list.tasks.map((task: any) => ({
                id: `task_list_${boardId}_${list.position}_${task.position}_${Date.now()}`,
                title: replaceVariables(task.title, vars),
                description: replaceVariables(task.description, vars),
                position: task.position,
                emoji: task.emoji,
                coverColor: task.coverColor,
                coverImage: task.coverImage,
                createdAt: new Date(),
              })),
            },
          })),
        },
        members: {
          create: {
            id: `member_${boardId}_${session.user.id}`,
            userId: session.user.id,
            role: "owner",
          },
        },
      },
      include: {
        lists: {
          include: {
            tasks: true,
          },
        },
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "board_created",
        description: `Created board "${board.name}" from template "${template.name}"`,
        boardId: board.id,
        userId: session.user.id,
        createdAt: new Date(),
      },
    });

    // Increment template usage count
    await prisma.boardTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: { increment: 1 },
      },
    });

    // Emit event
    emitToOrganization(organizationId, "board:created", {
      board,
      userId: session.user.id,
    });

    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating board from template:", error);
    return NextResponse.json(
      { error: "Failed to create board from template" },
      { status: 500 }
    );
  }
}
