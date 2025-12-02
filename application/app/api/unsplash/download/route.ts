import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!UNSPLASH_ACCESS_KEY) {
      return NextResponse.json(
        { error: "Unsplash API key not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { downloadLocation } = body;

    if (!downloadLocation) {
      return NextResponse.json(
        { error: "Download location is required" },
        { status: 400 }
      );
    }

    // Trigger download endpoint as per Unsplash API guidelines
    await fetch(downloadLocation, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error triggering Unsplash download:", error);
    return NextResponse.json(
      { error: "Failed to trigger download" },
      { status: 500 }
    );
  }
}
