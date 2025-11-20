import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// GET - List all members of an organization
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = params.id;

    // Check if user is a member
    const userMember = await prisma.member.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
      },
    });

    if (!userMember) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      );
    }

    // Get all members
    const members = await prisma.member.findMany({
      where: {
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("❌ Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

// PATCH - Update member role
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = params.id;
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "User ID and role are required" },
        { status: 400 }
      );
    }

    if (!["owner", "admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if current user is owner or admin
    const currentMember = await prisma.member.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ["owner", "admin"] },
      },
    });

    if (!currentMember) {
      return NextResponse.json(
        { error: "Only owners and admins can update member roles" },
        { status: 403 }
      );
    }

    // Check if target member exists
    const targetMember = await prisma.member.findFirst({
      where: {
        organizationId,
        userId,
      },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Prevent demoting the last owner
    if (targetMember.role === "owner" && role !== "owner") {
      const ownerCount = await prisma.member.count({
        where: {
          organizationId,
          role: "owner",
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the last owner" },
          { status: 400 }
        );
      }
    }

    // Admins cannot promote to owner or modify owners
    if (currentMember.role === "admin") {
      if (role === "owner" || targetMember.role === "owner") {
        return NextResponse.json(
          { error: "Admins cannot manage owners" },
          { status: 403 }
        );
      }
    }

    // Update member role
    const updatedMember = await prisma.member.update({
      where: {
        id: targetMember.id,
      },
      data: {
        role,
      },
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
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("❌ Error updating member:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}

// DELETE - Remove member from organization
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if current user is owner or admin
    const currentMember = await prisma.member.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ["owner", "admin"] },
      },
    });

    // Allow users to remove themselves
    const isSelfRemoval = userId === session.user.id;

    if (!currentMember && !isSelfRemoval) {
      return NextResponse.json(
        { error: "Only owners and admins can remove members" },
        { status: 403 }
      );
    }

    // Check if target member exists
    const targetMember = await prisma.member.findFirst({
      where: {
        organizationId,
        userId,
      },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Prevent removing the last owner
    if (targetMember.role === "owner") {
      const ownerCount = await prisma.member.count({
        where: {
          organizationId,
          role: "owner",
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last owner" },
          { status: 400 }
        );
      }
    }

    // Admins cannot remove owners
    if (currentMember?.role === "admin" && targetMember.role === "owner") {
      return NextResponse.json(
        { error: "Admins cannot remove owners" },
        { status: 403 }
      );
    }

    // Delete member
    await prisma.member.delete({
      where: {
        id: targetMember.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
