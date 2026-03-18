import { NextRequest, NextResponse } from "next/server";
import { listUnreadMessages, sendEmail, markAsRead, summarizeEmail } from "@/lib/gmail";
import { chat } from "@/lib/nanoclaw-engine";

export async function GET() {
  try {
    const messages = await listUnreadMessages(10);
    return NextResponse.json({ messages, count: messages.length });
  } catch (err) {
    console.error("[gmail GET]", err);
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action: "process" | "send" | "mark_read";
      messageId?: string;
      to?: string;
      subject?: string;
      emailBody?: string;
      replyToThreadId?: string;
    };

    if (body.action === "process" && body.messageId) {
      // Use NanoClaw to analyze email and suggest next action
      const messages = await listUnreadMessages(20);
      const email = messages.find((m) => m.id === body.messageId);
      if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 });

      const summary = summarizeEmail(email);
      const response = await chat(
        `I received this email, what should I do?\n\n${summary}`,
        `gmail_${email.threadId}`,
        "gmail"
      );

      return NextResponse.json({ suggestion: response.message, skill: response.skill });
    }

    if (body.action === "send") {
      if (!body.to || !body.subject || !body.emailBody) {
        return NextResponse.json({ error: "to, subject, emailBody required" }, { status: 400 });
      }
      const ok = await sendEmail({
        to: body.to,
        subject: body.subject,
        body: body.emailBody,
        replyToThreadId: body.replyToThreadId,
      });
      return NextResponse.json({ success: ok });
    }

    if (body.action === "mark_read" && body.messageId) {
      const ok = await markAsRead(body.messageId);
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[gmail POST]", err);
    return NextResponse.json({ error: "Gmail error" }, { status: 500 });
  }
}
