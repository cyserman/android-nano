/**
 * WhatsApp Business API utilities for NanoClaw
 * Uses Meta WhatsApp Business API (Cloud API)
 * 
 * Setup:
 * 1. Create app at developers.facebook.com
 * 2. Add WhatsApp product
 * 3. Get Phone Number ID and Access Token
 * 4. Configure webhook verify token
 */

const WHATSAPP_API = "https://graph.facebook.com/v21.0";

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: { body: string };
  image?: { caption?: string; id?: string; mime_type?: string };
  button?: { payload: string; text: string };
  interactive?: { type: string; button_reply?: { id: string; title: string } };
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: { display_phone_number: string; phone_number_id: string };
      messages?: WhatsAppMessage[];
    };
    field: string;
  }>;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

function phoneNumberId(): string {
  return process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
}

function accessToken(): string {
  return process.env.WHATSAPP_ACCESS_TOKEN ?? "";
}

function verifyToken(): string {
  return process.env.WHATSAPP_VERIFY_TOKEN ?? "nanoclaw_verify_token";
}

export async function sendMessage(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const pnId = phoneNumberId();
  const token = accessToken();

  if (!pnId || !token) {
    return { success: false, error: "Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN" };
  }

  try {
    const res = await fetch(`${WHATSAPP_API}/${pnId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });

    const data = (await res.json()) as { messages?: Array<{ id: string }>; error?: { message: string } };

    if (!res.ok) {
      return { success: false, error: data.error?.message ?? `HTTP ${res.status}` };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  components?: Record<string, unknown>[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const pnId = phoneNumberId();
  const token = accessToken();

  if (!pnId || !token) {
    return { success: false, error: "Missing credentials" };
  }

  try {
    const res = await fetch(`${WHATSAPP_API}/${pnId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en_US" },
          components,
        },
      }),
    });

    const data = (await res.json()) as { messages?: Array<{ id: string }>; error?: { message: string } };

    if (!res.ok) {
      return { success: false, error: data.error?.message ?? `HTTP ${res.status}` };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function sendReaction(to: string, messageId: string, emoji: string): Promise<boolean> {
  const pnId = phoneNumberId();
  const token = accessToken();

  if (!pnId || !token) return false;

  try {
    const res = await fetch(`${WHATSAPP_API}/${pnId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "reaction",
        reaction: { message_id: messageId, emoji },
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

export function verifyWebhookMode(mode: string, token: string, verifyToken: string): boolean {
  return mode === "subscribe" && token === verifyToken;
}

export function parseIncomingMessage(payload: WhatsAppWebhookPayload): Array<{ from: string; text: string; messageId: string }> {
  const messages: Array<{ from: string; text: string; messageId: string }> = [];

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const msgs = change.value.messages;
      if (!msgs) continue;

      for (const msg of msgs) {
        const text = msg.text?.body ?? msg.button?.text ?? msg.interactive?.button_reply?.title;
        if (text) {
          messages.push({
            from: msg.from,
            text,
            messageId: msg.id,
          });
        }
      }
    }
  }

  return messages;
}

export function formatBriefForWhatsApp(text: string): string {
  return text;
}

export function buildInteractiveButtons(buttons: Array<{ id: string; title: string }>) {
  return {
    type: "button",
    header: { type: "text", text: "NanoClaw" },
    body: { text: "Choose an action:" },
    footer: { text: "Your AI assistant" },
    action: {
      buttons: buttons.map((b) => ({
        type: "reply",
        reply: { id: b.id, title: b.title.slice(0, 20) },
      })),
    },
  };
}

export function buildListMenu(
  header: string,
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>
) {
  return {
    type: "list",
    header: { type: "text", text: header },
    body: { text: "Select an option:" },
    footer: { text: "Powered by NanoClaw" },
    action: { sections },
  };
}
