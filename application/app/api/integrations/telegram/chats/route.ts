import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// GET /api/integrations/telegram/chats - Get recent chats/updates for a bot
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get("integrationId");

    if (!integrationId) {
      return NextResponse.json(
        { error: "integrationId is required" },
        { status: 400 }
      );
    }

    // Find the integration
    const integration = await prisma.integration.findFirst({
      where: {
        id: integrationId,
        createdBy: session.user.id,
        type: "telegram",
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const botToken = integration.accessToken;

    if (!botToken) {
      return NextResponse.json(
        { error: "Bot token not configured" },
        { status: 500 }
      );
    }

    // Get updates (this only works if webhook is not set)
    // For webhook mode, we store chats from incoming messages
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        limit: 100,
        timeout: 0,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      // If webhook is set, get chats from logs instead
      const logs = await prisma.integrationLog.findMany({
        where: {
          integrationId: integration.id,
          action: { in: ["webhook_received", "send_message"] },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      // Extract unique chat IDs from metadata
      const chats = new Map<number, any>();
      for (const log of logs) {
        try {
          const metadata = JSON.parse(log.metadata || "{}");
          if (metadata?.chatId) {
            chats.set(metadata.chatId, {
              id: metadata.chatId,
              lastActivity: log.createdAt,
            });
          }
        } catch {
          // Ignore parse errors
        }
      }

      return NextResponse.json({
        success: true,
        chats: Array.from(chats.values()),
        source: "logs",
      });
    }

    // Extract unique chats from updates
    const chats = new Map<number, any>();
    for (const update of result.result || []) {
      const chat = update.message?.chat || update.callback_query?.message?.chat;
      if (chat) {
        chats.set(chat.id, {
          id: chat.id,
          type: chat.type,
          title: chat.title,
          username: chat.username,
          firstName: chat.first_name,
        });
      }
    }

    return NextResponse.json({
      success: true,
      chats: Array.from(chats.values()),
      source: "updates",
    });
  } catch (error) {
    console.error("Error getting Telegram chats:", error);
    return NextResponse.json(
      { error: "Failed to get chats" },
      { status: 500 }
    );
  }
}
