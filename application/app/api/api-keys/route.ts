import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

// Generate a secure API key
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = "tk";
  const randomBytes = crypto.randomBytes(32).toString("hex");
  const key = `${prefix}_${randomBytes}`;
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  return { key, prefix, hash };
}

// GET - List all API keys for the user
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

    // Get API keys for user or their organizations
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { organizationId: { in: organizationIds } },
        ],
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
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(apiKeys);
  } catch (error) {
    console.error("❌ Error fetching API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

// POST - Create a new API key
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, scopes, organizationId, expiresAt, rateLimit } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // If organizationId provided, verify access
    if (organizationId) {
      const membership = await prisma.member.findFirst({
        where: {
          userId: session.user.id,
          organizationId,
          role: { in: ["owner", "admin"] },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "No permission to create API keys for this organization" },
          { status: 403 }
        );
      }
    }

    // Generate API key
    const { key, prefix, hash } = generateApiKey();

    // Create API key record
    const apiKey = await prisma.apiKey.create({
      data: {
        id: `key_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name,
        key: hash, // Store only the hash
        prefix,
        scopes: JSON.stringify(scopes || ["read:boards", "read:tasks"]),
        rateLimit: rateLimit || 1000,
        userId: session.user.id,
        organizationId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        enabled: true,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        rateLimit: true,
        expiresAt: true,
        enabled: true,
        createdAt: true,
        organizationId: true,
      },
    });

    // Return the full key only once (it won't be stored)
    return NextResponse.json({
      ...apiKey,
      key, // Full key only shown once
      message: "API key created. Save this key securely - it won't be shown again.",
    });
  } catch (error) {
    console.error("❌ Error creating API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
