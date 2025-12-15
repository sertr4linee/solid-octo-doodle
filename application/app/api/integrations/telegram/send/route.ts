import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

// POST /api/integrations/telegram/send - Send a message via Telegram bot
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { integrationId, chatId, message, parseMode } = body;

    if (!integrationId || !chatId || !message) {
      return NextResponse.json(
        { error: "integrationId, chatId, and message are required" },
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

    if (!integration.enabled) {
      return NextResponse.json(
        { error: "Integration is disabled" },
        { status: 400 }
      );
    }

    const botToken = integration.accessToken;

    if (!botToken) {
      return NextResponse.json(
        { error: "Bot token not configured" },
        { status: 500 }
      );
    }

    // Send the message
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parseMode || "HTML",
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      // Log the error
      await prisma.integrationLog.create({
        data: {
          id: nanoid(),
          integrationId: integration.id,
          action: "send_message",
          status: "error",
          message: result.description || "Failed to send message",
          metadata: JSON.stringify({ chatId, error: result }),
        },
      });

      return NextResponse.json(
        { error: result.description || "Failed to send message" },
        { status: 400 }
      );
    }

    // Log success
    await prisma.integrationLog.create({
      data: {
        id: nanoid(),
        integrationId: integration.id,
        action: "send_message",
        status: "success",
        message: `Message sent to chat ${chatId}`,
        metadata: JSON.stringify({ chatId, messageId: result.result?.message_id }),
      },
    });

    // Update last used
    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastUsedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      messageId: result.result?.message_id,
    });
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
