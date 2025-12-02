import { prisma } from "@/lib/prisma";

/**
 * Check if a user has access to a board
 * Access is granted if:
 * 1. User is an explicit member of the board (via BoardMember)
 * 2. User is a member of the board's organization AND board visibility is "organization"
 */
export async function canAccessBoard(
  userId: string,
  boardId: string
): Promise<boolean> {
  try {
    // Check explicit board membership
    const boardMember = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId,
      },
    });

    if (boardMember) {
      return true;
    }

    // Check organization membership + board visibility
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        organizationId: true,
        visibility: true,
      },
    });

    if (!board) {
      return false;
    }

    if (board.visibility === "organization") {
      const orgMember = await prisma.member.findFirst({
        where: {
          organizationId: board.organizationId,
          userId,
        },
      });

      return !!orgMember;
    }

    return false;
  } catch (error) {
    console.error("Error checking board access:", error);
    return false;
  }
}

/**
 * Get user's role on a board
 * Returns the role if user has access, null otherwise
 */
export async function getBoardRole(
  userId: string,
  boardId: string
): Promise<string | null> {
  try {
    // Check explicit board membership first
    const boardMember = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId,
      },
      select: { role: true },
    });

    if (boardMember) {
      return boardMember.role;
    }

    // Check via organization membership
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        organizationId: true,
        visibility: true,
      },
    });

    if (!board || board.visibility !== "organization") {
      return null;
    }

    const orgMember = await prisma.member.findFirst({
      where: {
        organizationId: board.organizationId,
        userId,
      },
      select: { role: true },
    });

    return orgMember?.role || null;
  } catch (error) {
    console.error("Error getting board role:", error);
    return null;
  }
}
