import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
    };
    message?: {
      chat: {
        id: number;
      };
    };
    data?: string;
  };
}

// POST /api/integrations/telegram/webhook/[integrationId] - Receive Telegram updates
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await params;

    // Find the integration
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      include: {
        organization: true,
        board: true,
      },
    });

    if (!integration || integration.type !== "telegram") {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    if (!integration.enabled) {
      return NextResponse.json({ ok: true }); // Acknowledge but don't process
    }

    const update: TelegramUpdate = await request.json();
    const botToken = integration.accessToken;

    if (!botToken) {
      return NextResponse.json({ error: "Bot token not found" }, { status: 500 });
    }

    // Log the incoming webhook
    await prisma.integrationLog.create({
      data: {
        id: nanoid(),
        integrationId: integration.id,
        action: "webhook_received",
        status: "success",
        message: `Received update ${update.update_id}`,
        metadata: JSON.stringify({ updateId: update.update_id }),
      },
    });

    // Handle messages
    if (update.message?.text) {
      const text = update.message.text;
      const chatId = update.message.chat.id;

      // Handle /start command
      if (text === "/start") {
        await sendTelegramMessage(botToken, chatId, 
          "👋 Bonjour! Je suis connecté à votre projet.\n\n" +
          "Commandes disponibles:\n" +
          "/newtask [titre] - Créer une nouvelle tâche\n" +
          "/tasks - Voir les tâches en cours\n" +
          "/help - Afficher l'aide"
        );
      }
      // Handle /newtask command
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
          } else {
            await sendTelegramMessage(botToken, chatId,
              "❌ Aucune liste trouvée dans le board. Créez d'abord une liste."
            );
          }
        } else if (!integration.boardId) {
          await sendTelegramMessage(botToken, chatId,
            "❌ Ce bot n'est pas lié à un board spécifique."
          );
        } else {
          await sendTelegramMessage(botToken, chatId,
            "Usage: /newtask [titre de la tâche]"
          );
        }
      }
      // Handle /tasks command
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
        } else {
          await sendTelegramMessage(botToken, chatId,
            "❌ Ce bot n'est pas lié à un board spécifique."
          );
        }
      }
      // Handle /help command
      else if (text === "/help") {
        await sendTelegramMessage(botToken, chatId,
          "🤖 *Aide du bot*\n\n" +
          "Ce bot vous permet d'interagir avec votre projet directement depuis Telegram.\n\n" +
          "*Commandes:*\n" +
          "/newtask [titre] - Créer une nouvelle tâche\n" +
          "/tasks - Afficher les tâches du board\n" +
          "/help - Afficher ce message\n\n" +
          "Vous recevrez également des notifications pour les événements importants.",
          "Markdown"
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error processing Telegram webhook:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
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
