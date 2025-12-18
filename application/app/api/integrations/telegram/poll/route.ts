import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

// POST /api/integrations/telegram/poll - Poll for updates (for development without webhooks)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { integrationId } = body;

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

    // Get last processed update_id from config
    let config: any = {};
    try {
      config = JSON.parse(integration.config || "{}");
    } catch {
      config = {};
    }
    const lastUpdateId = config.lastUpdateId || 0;

    // Get updates from Telegram
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offset: lastUpdateId + 1,
        limit: 100,
        timeout: 0,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      return NextResponse.json(
        { error: result.description || "Failed to get updates" },
        { status: 400 }
      );
    }

    const updates = result.result || [];
    let processedCount = 0;
    let newLastUpdateId = lastUpdateId;

    for (const update of updates) {
      newLastUpdateId = Math.max(newLastUpdateId, update.update_id);

      // Process message
      if (update.message?.text) {
        const text = update.message.text;
        const chatId = update.message.chat.id;
        const chatType = update.message.chat.type;
        const firstName = update.message.from?.first_name || "User";

        // Log the received message
        await prisma.integrationLog.create({
          data: {
            id: nanoid(),
            integrationId: integration.id,
            action: "message_received",
            status: "success",
            message: `Received: ${text.substring(0, 50)}...`,
            metadata: JSON.stringify({ 
              chatId, 
              chatType,
              updateId: update.update_id,
              from: firstName,
            }),
          },
        });

        // Handle commands
        if (text === "/start") {
          await sendTelegramMessage(botToken, chatId,
            `👋 Bonjour ${firstName}! Je suis connecté à votre projet.\n\n` +
            `Votre Chat ID est: \`${chatId}\`\n\n` +
            "Commandes disponibles:\n" +
            "/newtask [titre] - Créer une nouvelle tâche\n" +
            "/tasks - Voir les tâches en cours\n" +
            "/help - Afficher l'aide\n" +
            "/chatid - Obtenir votre Chat ID",
            "Markdown"
          );
          processedCount++;
        }
        else if (text === "/help") {
          await sendTelegramMessage(botToken, chatId,
            "🤖 *Aide du bot*\n\n" +
            "Ce bot vous permet d'interagir avec votre projet directement depuis Telegram.\n\n" +
            "*Commandes:*\n" +
            "/start - Initialiser le bot\n" +
            "/newtask [titre] - Créer une nouvelle tâche\n" +
            "/tasks - Afficher les tâches du board\n" +
            "/chatid - Obtenir votre Chat ID\n" +
            "/help - Afficher ce message\n\n" +
            "Vous recevrez également des notifications pour les événements importants.",
            "Markdown"
          );
          processedCount++;
        }
        else if (text === "/chatid") {
          await sendTelegramMessage(botToken, chatId,
            `📍 Votre Chat ID est: \`${chatId}\`\n\n` +
            "Utilisez ce Chat ID pour envoyer des messages de test depuis l'application.",
            "Markdown"
          );
          processedCount++;
        }
        else if (text.startsWith("/newtask ")) {
          const taskTitle = text.substring(9).trim();
          
          if (taskTitle && integration.boardId) {
            // Find the first list in the board
            const list = await prisma.list.findFirst({
              where: { boardId: integration.boardId },
              orderBy: { position: "asc" },
            });

            if (list) {
              // Get max position
              const maxTask = await prisma.task.findFirst({
                where: { listId: list.id },
                orderBy: { position: "desc" },
              });

              // Create the task
              const task = await prisma.task.create({
                data: {
                  id: nanoid(),
                  title: taskTitle,
                  position: (maxTask?.position || 0) + 1,
                  listId: list.id,
                },
              });

              await sendTelegramMessage(botToken, chatId,
                `✅ Tâche créée: "${taskTitle}"\n📋 Dans: ${list.name}`
              );

              // Log the action
              await prisma.integrationLog.create({
                data: {
                  id: nanoid(),
                  integrationId: integration.id,
                  action: "task_created",
                  status: "success",
                  message: `Created task: ${taskTitle}`,
                  metadata: JSON.stringify({ taskId: task.id, listId: list.id }),
                },
              });
              processedCount++;
            } else {
              await sendTelegramMessage(botToken, chatId,
                "❌ Aucune liste trouvée dans le board. Créez d'abord une liste."
              );
            }
          } else if (!integration.boardId) {
            await sendTelegramMessage(botToken, chatId,
              "❌ Ce bot n'est pas lié à un board spécifique.\n\n" +
              "Allez dans Integrations > Configure pour lier un board."
            );
          } else {
            await sendTelegramMessage(botToken, chatId,
              "Usage: /newtask [titre de la tâche]"
            );
          }
        }
        else if (text === "/tasks") {
          if (integration.boardId) {
            const lists = await prisma.list.findMany({
              where: { boardId: integration.boardId },
              include: {
                tasks: {
                  take: 5,
                  orderBy: { position: "asc" },
                },
              },
              orderBy: { position: "asc" },
            });

            let message = "📋 *Tâches en cours:*\n\n";
            
            for (const list of lists) {
              message += `*${list.name}*\n`;
              if (list.tasks.length === 0) {
                message += "  _Aucune tâche_\n";
              } else {
                for (const task of list.tasks) {
                  message += `  • ${task.title}\n`;
                }
              }
              message += "\n";
            }

            await sendTelegramMessage(botToken, chatId, message, "Markdown");
            processedCount++;
          } else {
            await sendTelegramMessage(botToken, chatId,
              "❌ Ce bot n'est pas lié à un board spécifique.\n\n" +
              "Allez dans Integrations > Configure pour lier un board."
            );
          }
        }
      }
    }

    // Update last processed update_id
    if (newLastUpdateId > lastUpdateId) {
      config.lastUpdateId = newLastUpdateId;
      await prisma.integration.update({
        where: { id: integration.id },
        data: { 
          config: JSON.stringify(config),
          lastUsedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      updatesReceived: updates.length,
      messagesProcessed: processedCount,
      lastUpdateId: newLastUpdateId,
    });
  } catch (error) {
    console.error("Error polling Telegram:", error);
    return NextResponse.json(
      { error: "Failed to poll updates" },
      { status: 500 }
    );
  }
}

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
  parseMode?: string
) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  });

  return response.json();
}
