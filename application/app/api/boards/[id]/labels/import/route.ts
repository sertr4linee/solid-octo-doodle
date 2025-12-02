import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { canAccessBoard } from "@/lib/permissions";

// POST - Import labels from JSON
export async function POST(
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
        { error: "You don't have permission to import labels" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { labels, mode = "merge" } = body; // mode: merge or replace

    if (!Array.isArray(labels)) {
      return NextResponse.json(
        { error: "Labels must be an array" },
        { status: 400 }
      );
    }

    // Validate labels
    for (const label of labels) {
      if (!label.name || !label.color) {
        return NextResponse.json(
          { error: "Each label must have name and color" },
          { status: 400 }
        );
      }
    }

    // If replace mode, delete existing labels
    if (mode === "replace") {
      await prisma.label.deleteMany({
        where: { boardId },
      });
    }

    // Get max position
    const maxPosition = await prisma.label.findFirst({
      where: { boardId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    let startPosition = (maxPosition?.position ?? -1) + 1;
    const createdLabels = [];

    // Import labels
    for (const labelData of labels) {
      try {
        // Check if label with same name exists
        const existingLabel = await prisma.label.findUnique({
          where: {
            boardId_name: {
              boardId,
              name: labelData.name,
            },
          },
        });

        if (existingLabel) {
          if (mode === "merge") {
            // Update existing label
            const updated = await prisma.label.update({
              where: { id: existingLabel.id },
              data: {
                description: labelData.description,
                color: labelData.color,
                updatedAt: new Date(),
              },
            });
            createdLabels.push(updated);
          }
        } else {
          // Create new label
          const label = await prisma.label.create({
            data: {
              id: `label_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              name: labelData.name,
              description: labelData.description,
              color: labelData.color,
              boardId,
              position: startPosition++,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          createdLabels.push(label);
        }
      } catch (error) {
        console.error(`Error importing label ${labelData.name}:`, error);
      }
    }

    // Create activity
    await prisma.activity.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "labels_imported",
        description: `Imported ${createdLabels.length} label(s)`,
        boardId,
        userId: session.user.id,
        createdAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      imported: createdLabels.length,
      labels: createdLabels,
    });
  } catch (error) {
    console.error("❌ Error importing labels:", error);
    return NextResponse.json(
      { error: "Failed to import labels" },
      { status: 500 }
    );
  }
}
