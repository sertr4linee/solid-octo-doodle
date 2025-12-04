import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// GET - Get a specific saved search
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

    const { id } = await params;

    const search = await prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!search || search.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Increment usage count
    await prisma.savedSearch.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });

    return NextResponse.json(search);
  } catch (error) {
    console.error("❌ Error fetching saved search:", error);
    return NextResponse.json(
      { error: "Failed to fetch search" },
      { status: 500 }
    );
  }
}

// PATCH - Update a saved search (pin/unpin, rename)
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

    const { id } = await params;
    const body = await request.json();
    const { name, isPinned } = body;

    const search = await prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!search || search.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.savedSearch.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(isPinned !== undefined && { isPinned }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("❌ Error updating saved search:", error);
    return NextResponse.json(
      { error: "Failed to update search" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a saved search
export async function DELETE(
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

    const { id } = await params;

    const search = await prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!search || search.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.savedSearch.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting saved search:", error);
    return NextResponse.json(
      { error: "Failed to delete search" },
      { status: 500 }
    );
  }
}
