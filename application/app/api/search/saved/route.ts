import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// GET - List saved searches
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searches = await prisma.savedSearch.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { isPinned: "desc" },
        { usageCount: "desc" },
        { updatedAt: "desc" },
      ],
    });

    return NextResponse.json(searches);
  } catch (error) {
    console.error("❌ Error fetching saved searches:", error);
    return NextResponse.json(
      { error: "Failed to fetch searches" },
      { status: 500 }
    );
  }
}

// POST - Save a search
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, query, filters, isGlobal } = body;

    const search = await prisma.savedSearch.create({
      data: {
        id: `saved_search_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        userId: session.user.id,
        name,
        query,
        filters: JSON.stringify(filters || {}),
        isGlobal: isGlobal || false,
      },
    });

    return NextResponse.json(search, { status: 201 });
  } catch (error) {
    console.error("❌ Error saving search:", error);
    return NextResponse.json(
      { error: "Failed to save search" },
      { status: 500 }
    );
  }
}
