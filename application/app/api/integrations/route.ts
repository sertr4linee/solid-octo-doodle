import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// GET - List all integrations for the user/organization
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organizations
    const memberships = await prisma.member.findMany({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    const organizationIds = memberships.map((m) => m.organizationId);

    // Get integrations for user's organizations
    const integrations = await prisma.integration.findMany({
      where: {
        OR: [
          { organizationId: { in: organizationIds } },
          { createdBy: session.user.id },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Parse config JSON for each integration
    const parsed = integrations.map((integration) => ({
      ...integration,
      config: JSON.parse(integration.config || "{}"),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("❌ Error fetching integrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}

// POST - Create a new integration
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, name, description, config, organizationId, boardId } = body;

    if (!type || !name) {
      return NextResponse.json(
        { error: "Type and name are required" },
        { status: 400 }
      );
    }

    // If organizationId provided, verify access
    if (organizationId) {
      const membership = await prisma.member.findFirst({
        where: {
          userId: session.user.id,
          organizationId,
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "No access to this organization" },
          { status: 403 }
        );
      }
    }

    // Create integration
    const integration = await prisma.integration.create({
      data: {
        id: `int_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type,
        name,
        description,
        config: JSON.stringify(config || {}),
        organizationId,
        boardId,
        createdBy: session.user.id,
        enabled: true,
      },
    });

    return NextResponse.json({
      ...integration,
      config: JSON.parse(integration.config),
    });
  } catch (error) {
    console.error("❌ Error creating integration:", error);
    return NextResponse.json(
      { error: "Failed to create integration" },
      { status: 500 }
    );
  }
}
