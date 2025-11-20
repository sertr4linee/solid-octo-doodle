import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitToOrganization, broadcast } from "@/lib/socket";

// GET - List all organizations for the current user
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organizations where user is a member
    const members = await prisma.member.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        organization: {
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
            },
            _count: {
              select: {
                members: true,
                team: true,
              },
            },
          },
        },
      },
    });

    const organizations = members.map((member) => ({
      ...member.organization,
      role: member.role,
      memberCount: member.organization._count.members,
      teamCount: member.organization._count.team,
    }));

    return NextResponse.json(organizations);
  } catch (error) {
    console.error("❌ Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

// POST - Create a new organization
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, logo, metadata } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Organization slug already exists" },
        { status: 409 }
      );
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        id: `org_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name,
        slug,
        logo,
        metadata: metadata ? JSON.stringify(metadata) : null,
        createdAt: new Date(),
      },
    });

    // Add creator as owner
    await prisma.member.create({
      data: {
        id: `${organization.id}-${session.user.id}`,
        organizationId: organization.id,
        userId: session.user.id,
        role: "owner",
        createdAt: new Date(),
      },
    });

    // Émettre l'événement Socket.IO
    broadcast("organization:created", {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      userId: session.user.id,
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating organization:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an organization
export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Check if user is owner
    const member = await prisma.member.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: "owner",
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Only owners can delete organizations" },
        { status: 403 }
      );
    }

    // Delete organization (cascade will delete members, invitations, teams)
    await prisma.organization.delete({
      where: { id: organizationId },
    });

    // Émettre l'événement Socket.IO
    emitToOrganization(organizationId, "organization:deleted", {
      id: organizationId,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting organization:", error);
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    );
  }
}
