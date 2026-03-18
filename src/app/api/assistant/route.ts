import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/nanoclaw-engine";
import { nanoid } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      message: string;
      sessionId?: string;
      channel?: "web" | "telegram" | "gmail";
    };

    if (!body.message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const sessionId = body.sessionId ?? nanoid();
    const channel = body.channel ?? "web";

    const response = await chat(body.message, sessionId, channel);

    return NextResponse.json({ ...response, sessionId });
  } catch (err) {
    console.error("[assistant]", err);
    return NextResponse.json({ error: "Assistant error" }, { status: 500 });
  }
}
