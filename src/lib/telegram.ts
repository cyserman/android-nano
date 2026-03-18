/**
 * Telegram Bot utilities for NanoClaw
 * Sends/receives messages via Telegram Bot API
 */

const TELEGRAM_API = "https://api.telegram.org/bot";

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from: { id: number; username?: string; first_name?: string };
  chat: { id: number; type: string };
  text?: string;
  date: number;
}

export interface TelegramCallbackQuery {
  id: string;
  from: { id: number; username?: string };
  data?: string;
  message?: TelegramMessage;
}

function token(): string {
  return process.env.TELEGRAM_BOT_TOKEN ?? "";
}

export async function sendMessage(
  chatId: string | number,
  text: string,
  options?: {
    parseMode?: "Markdown" | "HTML";
    replyMarkup?: Record<string, unknown>;
  }
): Promise<boolean> {
  const tok = token();
  if (!tok) return false;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: options?.parseMode ?? "Markdown",
  };

  if (options?.replyMarkup) {
    body.reply_markup = options.replyMarkup;
  }

  const res = await fetch(`${TELEGRAM_API}${tok}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return res.ok;
}

export async function sendTyping(chatId: string | number): Promise<void> {
  const tok = token();
  if (!tok) return;

  await fetch(`${TELEGRAM_API}${tok}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  });
}

export async function setWebhook(url: string): Promise<boolean> {
  const tok = token();
  if (!tok) return false;

  const res = await fetch(`${TELEGRAM_API}${tok}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  return res.ok;
}

export async function getWebhookInfo(): Promise<Record<string, unknown>> {
  const tok = token();
  if (!tok) return { error: "No token" };

  const res = await fetch(`${TELEGRAM_API}${tok}/getWebhookInfo`);
  return res.json() as Promise<Record<string, unknown>>;
}

export function formatBriefForTelegram(text: string): string {
  // Convert plain-text brief to Telegram markdown
  return text
    .replace(/^(🧠.+)$/m, "*$1*")
    .replace(/^(📋.+)$/m, "\n*$1*")
    .replace(/^(💡.+)$/m, "\n*$1*")
    .replace(/^(🔔.+)$/m, "\n*$1*");
}

export function buildTaskKeyboard(taskId: number) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Done", callback_data: `task_done_${taskId}` },
        { text: "⏭ Skip", callback_data: `task_skip_${taskId}` },
        { text: "📋 Details", callback_data: `task_detail_${taskId}` },
      ],
    ],
  };
}

export function buildMainMenu() {
  return {
    keyboard: [
      ["📋 Tasks", "💡 Opportunities"],
      ["🔔 Insights", "📊 Daily Brief"],
      ["⚙️ Settings", "❓ Help"],
    ],
    resize_keyboard: true,
    persistent: true,
  };
}
