/**
 * WhatsApp Business API webhook for NanoClaw
 * Replaces Telegram - handles incoming messages and sends responses
 * 
 * Endpoint: POST /api/telegram (kept for compatibility, now routes to WhatsApp)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telegramSessions, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { chat, generateDailyBrief } from "@/lib/nanoclaw-engine";
import {
  sendMessage,
  parseIncomingMessage,
  verifyWebhookMode,
  buildInteractiveButtons,
  type WhatsAppWebhookPayload,
} from "@/lib/whatsapp";

const AUTHORIZED_PHONE = process.env.WHATSAPP_AUTHORIZED_PHONE ?? "";
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "nanoclaw_verify_token";

async function isAuthorized(phone: string): Promise<boolean> {
  if (AUTHORIZED_PHONE && phone !== AUTHORIZED_PHONE) return false;
  return true;
}

async function ensureSession(phone: string): Promise<void> {
  const [existing] = await db
    .select()
    .from(telegramSessions)
    .where(eq(telegramSessions.chatId, phone))
    .limit(1);

  if (existing) {
    await db
      .update(telegramSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(telegramSessions.chatId, phone));
  } else {
    const autoAuth = !AUTHORIZED_PHONE || phone === AUTHORIZED_PHONE;
    await db.insert(telegramSessions).values({
      chatId: phone,
      username: phone,
      isAuthorized: autoAuth,
    });
  }
}

// GET: Webhook verification (WhatsApp requires this for setup)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (verifyWebhookMode(mode ?? "", token ?? "", VERIFY_TOKEN)) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST: Handle incoming WhatsApp messages
export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as WhatsAppWebhookPayload;
    const incomingMessages = parseIncomingMessage(payload);

    if (incomingMessages.length === 0) {
      return NextResponse.json({ status: "ok" });
    }

    for (const { from, text, messageId } of incomingMessages) {
      await ensureSession(from);

      // Check authorization
      const authorized = await isAuthorized(from);
      if (!authorized && AUTHORIZED_PHONE) {
        await sendMessage(from, "🔒 Unauthorized. Set WHATSAPP_AUTHORIZED_PHONE to your number.");
        continue;
      }

      const trimmedText = text.trim();

      // Handle commands
      if (trimmedText === "/start" || trimmedText.toLowerCase() === "hi" || trimmedText.toLowerCase() === "hello") {
        await sendMessage(
          from,
          `🧠 *NanoClaw Online*\n\nHey! I'm your persistent AI assistant.\n\nI handle:\n• 📋 Tasks & organization\n• 💰 Opportunities & revenue\n• 💻 Coding & automation\n• 🔔 Proactive insights\n\nJust chat with me naturally.`
        );
        continue;
      }

      if (trimmedText === "/brief" || trimmedText.toLowerCase().includes("daily brief")) {
        const brief = await generateDailyBrief();
        await sendMessage(from, brief);
        continue;
      }

      if (trimmedText === "/tasks" || trimmedText.toLowerCase().includes("show tasks")) {
        const taskList = await db.select().from(tasks).where(eq(tasks.status, "pending")).limit(5);
        if (taskList.length === 0) {
          await sendMessage(from, "📋 No pending tasks. You're clear!");
        } else {
          const taskText = taskList.map((t) => `📌 ${t.title}\n   Priority: ${t.priority} | ${t.category}`).join("\n\n");
          await sendMessage(from, taskText);
        }
        continue;
      }

      if (trimmedText === "/help") {
        await sendMessage(
          from,
          `*NanoClaw Commands*\n\n/brief — daily summary\n/tasks — pending tasks\n\nOr just chat naturally — I'll help with org, coding, and business.`
        );
        continue;
      }

      // Regular chat — send to NanoClaw engine
      const response = await chat(trimmedText, `wa_${from}`, "whatsapp");

      // Split long responses (WhatsApp limit ~4096 chars)
      const chunks = response.message.match(/[\s\S]{1,4000}/g) ?? [response.message];
      for (const chunk of chunks) {
        await sendMessage(from, chunk);
      }

      // Notify about auto-created actions
      if (response.actions && response.actions.length > 0) {
        const actionSummary = response.actions
          .map((a) => {
            if (a.type === "create_task") return `✅ Task: ${String(a.payload.title)}`;
            if (a.type === "create_opportunity") return `💡 Opportunity: ${String(a.payload.title)}`;
            return null;
          })
          .filter(Boolean)
          .join("\n");

        if (actionSummary) {
          await sendMessage(from, actionSummary);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[whatsapp webhook]", err);
    return NextResponse.json({ status: "received" }, { status: 200 });
  }
}
