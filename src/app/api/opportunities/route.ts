import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { opportunities } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const all = await db.select().from(opportunities).orderBy(desc(opportunities.createdAt));
    return NextResponse.json(all);
  } catch (err) {
    console.error("[opportunities GET]", err);
    return NextResponse.json({ error: "Failed to fetch opportunities" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      title: string;
      description?: string;
      type?: "side_hustle" | "investment" | "partnership" | "client" | "product" | "service" | "automation";
      estimatedRevenue?: number;
      timeToRevenueDays?: number;
      effortLevel?: "low" | "medium" | "high";
      notes?: string;
      actionItems?: string;
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const [inserted] = await db
      .insert(opportunities)
      .values({
        title: body.title.trim(),
        description: body.description ?? body.title.trim(),
        type: body.type ?? "side_hustle",
        estimatedRevenue: body.estimatedRevenue ?? null,
        timeToRevenueDays: body.timeToRevenueDays ?? null,
        effortLevel: body.effortLevel ?? "medium",
        notes: body.notes,
        actionItems: body.actionItems,
        source: "manual",
      })
      .returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (err) {
    console.error("[opportunities POST]", err);
    return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      id: number;
      stage?: "identified" | "researching" | "planning" | "executing" | "scaling" | "paused" | "completed" | "rejected";
      actualRevenue?: number;
      notes?: string;
      actionItems?: string;
    };

    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.stage) updates.stage = body.stage;
    if (body.actualRevenue !== undefined) updates.actualRevenue = body.actualRevenue;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.actionItems !== undefined) updates.actionItems = body.actionItems;

    const [updated] = await db
      .update(opportunities)
      .set(updates)
      .where(eq(opportunities.id, body.id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[opportunities PATCH]", err);
    return NextResponse.json({ error: "Failed to update opportunity" }, { status: 500 });
  }
}
