import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telegramSessions, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { chat, generateDailyBrief } from "@/lib/nanoclaw-engine";
import {
  sendMessage,
  sendTyping,
  buildMainMenu,
  buildTaskKeyboard,
  type TelegramUpdate,
} from "@/lib/telegram";

const AUTHORIZED_CHAT_ID = process.env.TELEGRAM_AUTHORIZED_CHAT_ID ?? "";

async function isAuthorized(chatId: string): Promise<boolean> {
  if (AUTHORIZED_CHAT_ID && chatId !== AUTHORIZED_CHAT_ID) return false;

  const [session] = await db
    .select()
    .from(telegramSessions)
    .where(eq(telegramSessions.chatId, chatId))
    .limit(1);

  return session?.isAuthorized ?? false;
}

async function ensureSession(
  chatId: string,
  username?: string,
  firstName?: string
): Promise<void> {
  const [existing] = await db
    .select()
    .from(telegramSessions)
    .where(eq(telegramSessions.chatId, chatId))
    .limit(1);

  if (existing) {
    await db
      .update(telegramSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(telegramSessions.chatId, chatId));
  } else {
    const autoAuth = !AUTHORIZED_CHAT_ID || chatId === AUTHORIZED_CHAT_ID;
    await db.insert(telegramSessions).values({
      chatId,
      username,
      firstName,
      isAuthorized: autoAuth,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const update = (await req.json()) as TelegramUpdate;

    // Handle callback queries (inline button presses)
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = String(cq.message?.chat.id ?? cq.from.id);
      const data = cq.data ?? "";

      if (data.startsWith("task_done_")) {
        const taskId = parseInt(data.replace("task_done_", ""));
        await db.update(tasks).set({ status: "done", completedAt: new Date() }).where(eq(tasks.id, taskId));
        await sendMessage(chatId, "✅ Task marked as done!");
      } else if (data.startsWith("task_skip_")) {
        await sendMessage(chatId, "⏭ Task skipped.");
      }

      return NextResponse.json({ ok: true });
    }

    const msg = update.message;
    if (!msg?.text) return NextResponse.json({ ok: true });

    const chatId = String(msg.chat.id);
    const text = msg.text.trim();
    const username = msg.from.username;
    const firstName = msg.from.first_name;

    await ensureSession(chatId, username, firstName);

    // Handle /start
    if (text === "/start") {
      await sendMessage(
        chatId,
        `🧠 *NanoClaw Online*\n\nHey ${firstName ?? "there"} — I'm your persistent AI assistant.\n\nI handle:\n• 📋 Tasks & organization\n• 💰 Opportunities & revenue\n• 💻 Coding & automation\n• 🔔 Proactive insights\n\nJust talk to me naturally, or use the menu below.`,
        { replyMarkup: buildMainMenu() }
      );
      return NextResponse.json({ ok: true });
    }

    // Handle /brief
    if (text === "/brief" || text === "📊 Daily Brief") {
      const brief = await generateDailyBrief();
      await sendMessage(chatId, brief);
      return NextResponse.json({ ok: true });
    }

    // Handle /tasks
    if (text === "/tasks" || text === "📋 Tasks") {
      const taskList = await db.select().from(tasks).where(eq(tasks.status, "pending")).limit(5);
      if (taskList.length === 0) {
        await sendMessage(chatId, "📋 No pending tasks. You're clear!");
      } else {
        for (const task of taskList) {
          await sendMessage(
            chatId,
            `📌 *${task.title}*\nPriority: ${task.priority} | Category: ${task.category}`,
            { replyMarkup: buildTaskKeyboard(task.id) }
          );
        }
      }
      return NextResponse.json({ ok: true });
    }

    // Handle /help
    if (text === "/help" || text === "❓ Help") {
      await sendMessage(
        chatId,
        `*NanoClaw Commands*\n\n/brief — daily summary\n/tasks — pending tasks\n\nOr just type anything — I'll respond intelligently.\n\nSkills: org • coding • entrepreneurship`
      );
      return NextResponse.json({ ok: true });
    }

    // Authorize if needed
    const authorized = await isAuthorized(chatId);
    if (!authorized && AUTHORIZED_CHAT_ID) {
      await sendMessage(chatId, "🔒 Unauthorized. Set TELEGRAM_AUTHORIZED_CHAT_ID to your chat ID.");
      return NextResponse.json({ ok: true });
    }

    // Regular chat — send to NanoClaw engine
    await sendTyping(chatId);

    const response = await chat(text, `tg_${chatId}`, "telegram");

    // Split long responses
    const chunks = response.message.match(/[\s\S]{1,4000}/g) ?? [response.message];
    for (const chunk of chunks) {
      await sendMessage(chatId, chunk);
    }

    // Notify about auto-created actions
    if (response.actions && response.actions.length > 0) {
      const actionSummary = response.actions
        .map((a) => {
          if (a.type === "create_task") return `✅ Task created: ${String(a.payload.title)}`;
          if (a.type === "create_opportunity") return `💡 Opportunity logged: ${String(a.payload.title)}`;
          return null;
        })
        .filter(Boolean)
        .join("\n");

      if (actionSummary) {
        await sendMessage(chatId, actionSummary);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram webhook]", err);
    return NextResponse.json({ ok: true }); // Always 200 to Telegram
  }
}

// GET endpoint to verify webhook setup
export async function GET() {
  return NextResponse.json({
    status: "NanoClaw Telegram webhook active",
    hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
  });
}
