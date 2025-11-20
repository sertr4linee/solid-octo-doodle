import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all invitations for the current user's email
    const invitations = await prisma.invitation.findMany({
      where: {
        email: session.user.email,
      },
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    // Get inviter details separately
    const formattedInvitations = await Promise.all(
      invitations.map(async (inv) => {
        const inviter = await prisma.user.findUnique({
          where: { id: inv.inviterId },
          select: { email: true, name: true },
        });

        return {
          id: inv.id,
          organizationId: inv.organizationId,
          organizationName: inv.organization.name,
          organizationSlug: inv.organization.slug,
          inviterEmail: inviter?.email || "Unknown",
          inviterName: inviter?.name || "Unknown",
          email: inv.email,
          role: inv.role,
          status: inv.status,
          expiresAt: inv.expiresAt,
        };
      })
    );

    return NextResponse.json(formattedInvitations);
  } catch (error) {
    console.error("❌ Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}
