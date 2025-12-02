import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { canAccessBoard } from "@/lib/permissions";

// GET - Export labels to JSON
export async function GET(
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

    const { id: boardId } = await params;

    // Check if user has access to board
    const hasAccess = await canAccessBoard(session.user.id, boardId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have access to this board" },
        { status: 403 }
      );
    }

    const labels = await prisma.label.findMany({
      where: { boardId },
      select: {
        name: true,
        description: true,
        color: true,
        position: true,
      },
      orderBy: { position: "asc" },
    });

    return NextResponse.json({
      boardId,
      exportedAt: new Date().toISOString(),
      labels,
    });
  } catch (error) {
    console.error("❌ Error exporting labels:", error);
    return NextResponse.json(
      { error: "Failed to export labels" },
      { status: 500 }
    );
  }
}
