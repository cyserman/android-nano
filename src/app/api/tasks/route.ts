import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const all = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    return NextResponse.json(all);
  } catch (err) {
    console.error("[tasks GET]", err);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      title: string;
      description?: string;
      priority?: "low" | "medium" | "high" | "critical";
      category?: "org" | "coding" | "entrepreneurship" | "personal";
      dueAt?: string;
      notes?: string;
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const [inserted] = await db
      .insert(tasks)
      .values({
        title: body.title.trim(),
        description: body.description,
        priority: body.priority ?? "medium",
        category: body.category ?? "personal",
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        notes: body.notes,
        source: "manual",
      })
      .returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (err) {
    console.error("[tasks POST]", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      id: number;
      status?: "pending" | "in_progress" | "done" | "cancelled";
      priority?: "low" | "medium" | "high" | "critical";
      title?: string;
      notes?: string;
    };

    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status) {
      updates.status = body.status;
      if (body.status === "done") updates.completedAt = new Date();
    }
    if (body.priority) updates.priority = body.priority;
    if (body.title) updates.title = body.title;
    if (body.notes !== undefined) updates.notes = body.notes;

    const [updated] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, body.id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[tasks PATCH]", err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await db.delete(tasks).where(eq(tasks.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[tasks DELETE]", err);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
