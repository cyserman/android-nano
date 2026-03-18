/**
 * Gmail utilities for NanoClaw
 * Uses Gmail API via OAuth2 to read/send emails
 * Account: andycodebot@gmail.com
 */

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  body: string;
  isUnread: boolean;
}

function accessToken(): string {
  return process.env.GMAIL_ACCESS_TOKEN ?? "";
}

async function gmailFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = accessToken();
  return fetch(`${GMAIL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
}

export async function listUnreadMessages(maxResults = 10): Promise<GmailMessage[]> {
  if (!accessToken()) return [];

  const res = await gmailFetch(
    `/users/me/messages?labelIds=INBOX&q=is:unread&maxResults=${maxResults}`
  );

  if (!res.ok) return [];

  const data = (await res.json()) as { messages?: Array<{ id: string }> };
  const ids = data.messages ?? [];

  const messages = await Promise.all(ids.map((m) => getMessageById(m.id)));
  return messages.filter((m): m is GmailMessage => m !== null);
}

export async function getMessageById(id: string): Promise<GmailMessage | null> {
  if (!accessToken()) return null;

  const res = await gmailFetch(`/users/me/messages/${id}?format=full`);
  if (!res.ok) return null;

  const data = (await res.json()) as {
    id: string;
    threadId: string;
    snippet: string;
    labelIds: string[];
    payload: {
      headers: Array<{ name: string; value: string }>;
      body?: { data?: string };
      parts?: Array<{ mimeType: string; body: { data?: string } }>;
    };
  };

  const headers = data.payload.headers ?? [];
  const subject = headers.find((h) => h.name === "Subject")?.value ?? "(no subject)";
  const from = headers.find((h) => h.name === "From")?.value ?? "";
  const date = headers.find((h) => h.name === "Date")?.value ?? "";

  // Decode body
  let body = "";
  const parts = data.payload.parts ?? [];
  const textPart = parts.find((p) => p.mimeType === "text/plain");
  const rawData = textPart?.body?.data ?? data.payload.body?.data ?? "";
  if (rawData) {
    body = Buffer.from(rawData, "base64").toString("utf-8");
  }

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet,
    subject,
    from,
    date,
    body: body.slice(0, 2000),
    isUnread: (data.labelIds ?? []).includes("UNREAD"),
  };
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  replyToThreadId?: string;
}): Promise<boolean> {
  if (!accessToken()) return false;

  const from = "andycodebot@gmail.com";
  const raw = [
    `From: NanoClaw <${from}>`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    params.body,
  ].join("\r\n");

  const encoded = Buffer.from(raw).toString("base64url");

  const body: Record<string, unknown> = { raw: encoded };
  if (params.replyToThreadId) body.threadId = params.replyToThreadId;

  const res = await gmailFetch("/users/me/messages/send", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return res.ok;
}

export async function markAsRead(messageId: string): Promise<boolean> {
  if (!accessToken()) return false;

  const res = await gmailFetch(`/users/me/messages/${messageId}/modify`, {
    method: "POST",
    body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
  });

  return res.ok;
}

export function summarizeEmail(email: GmailMessage): string {
  return `From: ${email.from}\nSubject: ${email.subject}\nDate: ${email.date}\n\n${email.snippet}`;
}
