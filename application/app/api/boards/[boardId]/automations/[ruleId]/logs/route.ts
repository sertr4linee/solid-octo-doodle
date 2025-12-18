import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// GET /api/boards/[boardId]/automations/[ruleId]/logs - Get automation execution logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; ruleId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId, ruleId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");

    // Verify board access
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
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const where: any = { ruleId };
    if (status) {
      where.status = status;
    }

    const logs = await prisma.automationLog.findMany({
      where,
      take: limit,
      orderBy: { startedAt: "desc" },
    });

    // Parse JSON fields
    const logsWithParsed = logs.map((log) => ({
      ...log,
      triggerData: log.triggerData ? JSON.parse(log.triggerData) : null,
      actionsExecuted: log.actionsExecuted ? JSON.parse(log.actionsExecuted) : null,
    }));

    return NextResponse.json({ logs: logsWithParsed });
  } catch (error) {
    console.error("Error fetching automation logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch automation logs" },
      { status: 500 }
    );
  }
}
