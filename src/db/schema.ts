import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["pending", "in_progress", "done", "cancelled"] })
    .notNull()
    .default("pending"),
  priority: text("priority", { enum: ["low", "medium", "high", "critical"] })
    .notNull()
    .default("medium"),
  category: text("category", { enum: ["org", "coding", "entrepreneurship", "personal"] })
    .notNull()
    .default("personal"),
  dueAt: integer("due_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  source: text("source", { enum: ["manual", "telegram", "gmail", "assistant"] }).default("manual"),
  telegramMessageId: text("telegram_message_id"),
  notes: text("notes"),
});

// ─── Opportunities ────────────────────────────────────────────────────────────
export const opportunities = sqliteTable("opportunities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type", {
    enum: ["side_hustle", "investment", "partnership", "client", "product", "service", "automation"],
  })
    .notNull()
    .default("side_hustle"),
  stage: text("stage", {
    enum: ["identified", "researching", "planning", "executing", "scaling", "paused", "completed", "rejected"],
  })
    .notNull()
    .default("identified"),
  estimatedRevenue: real("estimated_revenue"),
  actualRevenue: real("actual_revenue"),
  timeToRevenueDays: integer("time_to_revenue_days"),
  effortLevel: text("effort_level", { enum: ["low", "medium", "high"] }).default("medium"),
  notes: text("notes"),
  actionItems: text("action_items"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  source: text("source", { enum: ["manual", "telegram", "gmail", "assistant"] }).default("assistant"),
});

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  channel: text("channel", { enum: ["web", "telegram", "gmail"] }).notNull().default("web"),
  sessionId: text("session_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  metadata: text("metadata"),
});

// ─── Context memory ───────────────────────────────────────────────────────────
export const contextMemory = sqliteTable("context_memory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  category: text("category", { enum: ["preference", "goal", "fact", "skill", "contact"] })
    .notNull()
    .default("fact"),
  importance: integer("importance").default(5),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── Telegram sessions ────────────────────────────────────────────────────────
export const telegramSessions = sqliteTable("telegram_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chatId: text("chat_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  sessionData: text("session_data"),
  isAuthorized: integer("is_authorized", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── Proactive insights ───────────────────────────────────────────────────────
export const insights = sqliteTable("insights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type", {
    enum: ["opportunity_alert", "task_reminder", "daily_brief", "revenue_tip", "code_suggestion", "org_tip"],
  })
    .notNull()
    .default("opportunity_alert"),
  priority: text("priority", { enum: ["low", "medium", "high"] }).default("medium"),
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  isSentToTelegram: integer("is_sent_to_telegram", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  relatedTaskId: integer("related_task_id"),
  relatedOpportunityId: integer("related_opportunity_id"),
});
