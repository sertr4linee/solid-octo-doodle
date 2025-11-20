import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// GET - Get organization details
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

    const { id: organizationId } = await params;

    // Check if user is a member
    const member = await prisma.member.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      );
    }

    // Get organization with all details
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: {
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
          orderBy: {
            createdAt: "asc",
          },
        },
        invitations: {
          where: {
            status: "pending",
          },
          orderBy: {
            expiresAt: "desc",
          },
        },
        team: {
          include: {
            _count: {
              select: {
                teamMember: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            team: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...organization,
      currentUserRole: member.role,
    });
  } catch (error) {
    console.error("❌ Error fetching organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

// PATCH - Update organization
export async function PATCH(
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

    const { id: organizationId } = await params;

    // Check if user is owner or admin
    const member = await prisma.member.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ["owner", "admin"] },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Only owners and admins can update organizations" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, logo, metadata } = body;

    // Update organization
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(name && { name }),
        ...(logo !== undefined && { logo }),
        ...(metadata && { metadata: JSON.stringify(metadata) }),
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error("❌ Error updating organization:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}
