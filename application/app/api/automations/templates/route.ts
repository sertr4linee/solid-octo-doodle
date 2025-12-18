import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// GET /api/automations/templates - Get automation templates
// POST /api/automations/templates - Create a new template (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const where: any = { isPublic: true };
    if (category) {
      where.category = category;
    }

    const templates = await prisma.automationTemplate.findMany({
      where,
      orderBy: [{ usageCount: "desc" }, { name: "asc" }],
    });

    // Parse JSON fields
    const templatesWithParsed = templates.map((template) => ({
      ...template,
      triggerConfig: JSON.parse(template.triggerConfig || "{}"),
      conditions: JSON.parse(template.conditions || "[]"),
      actions: JSON.parse(template.actions),
    }));

    return NextResponse.json({ templates: templatesWithParsed });
  } catch (error) {
    console.error("Error fetching automation templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      icon,
      triggerType,
      triggerConfig = {},
      conditions = [],
      actions,
      isPublic = false,
    } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!category?.trim()) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    if (!triggerType) {
      return NextResponse.json({ error: "Trigger type is required" }, { status: 400 });
    }
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json({ error: "At least one action is required" }, { status: 400 });
    }

    const template = await prisma.automationTemplate.create({
      data: {
        id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name,
        description: description || "",
        category,
        icon,
        triggerType,
        triggerConfig: JSON.stringify(triggerConfig),
        conditions: JSON.stringify(conditions),
        actions: JSON.stringify(actions),
        isPublic,
        isPredefined: false,
      },
    });

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        triggerConfig: JSON.parse(template.triggerConfig),
        conditions: JSON.parse(template.conditions),
        actions: JSON.parse(template.actions),
      },
    });
  } catch (error) {
    console.error("Error creating automation template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
