import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

// POST /api/integrations/telegram/connect - Connect a Telegram bot
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { botToken, organizationId, boardId } = body;

    if (!botToken) {
      return NextResponse.json({ error: "Bot token is required" }, { status: 400 });
    }

    // Validate the bot token by calling Telegram API
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const telegramData = await telegramResponse.json();

    if (!telegramData.ok) {
      return NextResponse.json(
        { error: "Invalid bot token. Please check your token from @BotFather" },
        { status: 400 }
      );
    }

    const botInfo = telegramData.result;

    // Check if integration already exists for this bot
    const existingIntegrations = await prisma.integration.findMany({
      where: {
        type: "telegram",
        createdBy: session.user.id,
      },
    });

    // Check if this bot is already connected
    for (const integration of existingIntegrations) {
      try {
        const config = JSON.parse(integration.config || "{}");
        if (config.botId === botInfo.id) {
          return NextResponse.json(
            { error: "This bot is already connected" },
            { status: 400 }
          );
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Create the integration config
    const config = {
      botId: botInfo.id,
      botUsername: botInfo.username,
      botFirstName: botInfo.first_name,
      canJoinGroups: botInfo.can_join_groups,
      canReadAllGroupMessages: botInfo.can_read_all_group_messages,
      supportsInlineQueries: botInfo.supports_inline_queries,
    };

    // Create the integration
    const integration = await prisma.integration.create({
      data: {
        id: nanoid(),
        type: "telegram",
        name: `Telegram: @${botInfo.username}`,
        description: botInfo.first_name || "Telegram Bot",
        enabled: true,
        config: JSON.stringify(config),
        accessToken: botToken, // Store bot token here
        createdBy: session.user.id,
        organizationId: organizationId || null,
        boardId: boardId || null,
      },
    });

    // Set up webhook for receiving messages (optional - for receiving updates)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const webhookUrl = `${appUrl}/api/integrations/telegram/webhook/${integration.id}`;
    
    // Only set webhook in production (requires HTTPS)
    if (appUrl.startsWith("https://")) {
      await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
    }

    // Log the connection
    await prisma.integrationLog.create({
      data: {
        id: nanoid(),
        integrationId: integration.id,
        action: "connected",
        status: "success",
        message: `Connected Telegram bot @${botInfo.username}`,
      },
    });

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        type: integration.type,
        name: integration.name,
        enabled: integration.enabled,
        botUsername: botInfo.username,
      },
    });
  } catch (error) {
    console.error("Error connecting Telegram bot:", error);
    return NextResponse.json(
      { error: "Failed to connect Telegram bot" },
      { status: 500 }
    );
  }
}
