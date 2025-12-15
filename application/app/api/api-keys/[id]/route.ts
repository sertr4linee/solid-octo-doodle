import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get API key details
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        rateLimit: true,
        lastUsedAt: true,
        expiresAt: true,
        enabled: true,
        createdAt: true,
        organizationId: true,
        userId: true,
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    // Verify access
    if (apiKey.userId !== session.user.id) {
      if (apiKey.organizationId) {
        const membership = await prisma.member.findFirst({
          where: {
            userId: session.user.id,
            organizationId: apiKey.organizationId,
          },
        });

        if (!membership) {
          return NextResponse.json(
            { error: "No access to this API key" },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "No access to this API key" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(apiKey);
  } catch (error) {
    console.error("❌ Error fetching API key:", error);
    return NextResponse.json(
      { error: "Failed to fetch API key" },
      { status: 500 }
    );
  }
}

// PATCH - Update API key
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    // Verify access
    if (apiKey.userId !== session.user.id) {
      if (apiKey.organizationId) {
        const membership = await prisma.member.findFirst({
          where: {
            userId: session.user.id,
            organizationId: apiKey.organizationId,
            role: { in: ["owner", "admin"] },
          },
        });

        if (!membership) {
          return NextResponse.json(
            { error: "No permission to update this API key" },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "No permission to update this API key" },
          { status: 403 }
        );
      }
    }

    const { name, scopes, enabled, rateLimit } = body;

    const updatedApiKey = await prisma.apiKey.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(scopes !== undefined && { scopes: JSON.stringify(scopes) }),
        ...(enabled !== undefined && { enabled }),
        ...(rateLimit !== undefined && { rateLimit }),
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        rateLimit: true,
        lastUsedAt: true,
        expiresAt: true,
        enabled: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedApiKey);
  } catch (error) {
    console.error("❌ Error updating API key:", error);
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 }
    );
  }
}

// DELETE - Revoke API key
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    // Verify access
    if (apiKey.userId !== session.user.id) {
      if (apiKey.organizationId) {
        const membership = await prisma.member.findFirst({
          where: {
            userId: session.user.id,
            organizationId: apiKey.organizationId,
            role: { in: ["owner", "admin"] },
          },
        });

        if (!membership) {
          return NextResponse.json(
            { error: "No permission to delete this API key" },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "No permission to delete this API key" },
          { status: 403 }
        );
      }
    }

    await prisma.apiKey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting API key:", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}
