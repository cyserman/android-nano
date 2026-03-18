import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { insights } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const all = await db.select().from(insights).orderBy(desc(insights.createdAt)).limit(50);
    return NextResponse.json(all);
  } catch (err) {
    console.error("[insights GET]", err);
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { id: number; isRead?: boolean };
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (body.isRead !== undefined) updates.isRead = body.isRead;

    const [updated] = await db
      .update(insights)
      .set(updates)
      .where(eq(insights.id, body.id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[insights PATCH]", err);
    return NextResponse.json({ error: "Failed to update insight" }, { status: 500 });
  }
}
