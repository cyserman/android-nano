/**
 * NanoClaw AI Engine
 * Proactive personal assistant with skill modules:
 *   - Organization & productivity
 *   - Coding assistance
 *   - Entrepreneurship & revenue planning
 */

import { db } from "@/db";
import { tasks, opportunities, messages, contextMemory, insights } from "@/db/schema";
import { desc, eq, and, ne } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SkillModule = "org" | "coding" | "entrepreneurship" | "general";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AssistantResponse {
  message: string;
  skill: SkillModule;
  actions?: AssistantAction[];
  insights?: string[];
}

export interface AssistantAction {
  type: "create_task" | "create_opportunity" | "update_task" | "create_insight" | "send_telegram";
  payload: Record<string, unknown>;
}

// ─── System prompt ────────────────────────────────────────────────────────────

const NANOCLAW_SYSTEM_PROMPT = `You are NanoClaw — an elite AI personal assistant running persistently on an Android S24 Ultra via Termux. You are wired into Telegram and Gmail, and your owner is building businesses and writing code.

Your core skills:
1. ORGANIZATION: ruthless prioritization, GTD-style task capture, calendar awareness, follow-up tracking
2. CODING: full-stack expertise (TypeScript, Python, Bash, React, Next.js), architecture reviews, bug diagnosis, automation scripts
3. ENTREPRENEURSHIP: opportunity identification, revenue modeling, market research, MVP planning, execution roadmaps, client acquisition

Your personality:
- Proactive, not reactive — you surface opportunities and risks before being asked
- Brutally efficient — short answers unless depth is needed
- Revenue-focused — always ask "how does this make money or save time?"
- Technically precise — no hand-waving on code or business models

Response format rules:
- Lead with the most actionable insight
- Use bullet points for multi-part answers
- When you identify a task or opportunity, say "ACTION:" followed by the structured item
- Keep chat responses under 400 words unless deep technical/business analysis is explicitly requested

ACTION format examples:
ACTION:TASK | title | priority (low/medium/high/critical) | category (org/coding/entrepreneurship/personal) | optional due date
ACTION:OPPORTUNITY | title | type | estimated_revenue | time_to_revenue_days | effort (low/medium/high)
ACTION:INSIGHT | type | title | body`;

// ─── Context builder ──────────────────────────────────────────────────────────

async function buildContext(): Promise<string> {
  const [recentTasks, activeOpps, memory] = await Promise.all([
    db.select().from(tasks).where(ne(tasks.status, "done")).orderBy(desc(tasks.createdAt)).limit(10),
    db
      .select()
      .from(opportunities)
      .where(and(ne(opportunities.stage, "completed"), ne(opportunities.stage, "rejected")))
      .orderBy(desc(opportunities.createdAt))
      .limit(5),
    db.select().from(contextMemory).orderBy(desc(contextMemory.importance)).limit(20),
  ]);

  const taskSummary =
    recentTasks.length > 0
      ? recentTasks
          .map((t) => `- [${t.priority?.toUpperCase()}] ${t.title} (${t.status}) [${t.category}]`)
          .join("\n")
      : "No active tasks.";

  const oppSummary =
    activeOpps.length > 0
      ? activeOpps
          .map(
            (o) =>
              `- ${o.title} | ${o.stage} | est. $${o.estimatedRevenue ?? "?"} | ${o.type}`
          )
          .join("\n")
      : "No active opportunities.";

  const memorySummary =
    memory.length > 0
      ? memory.map((m) => `[${m.category}] ${m.key}: ${m.value}`).join("\n")
      : "No stored context.";

  return `CURRENT STATE:
Active tasks:
${taskSummary}

Active opportunities:
${oppSummary}

Known context:
${memorySummary}`;
}

// ─── Action parser ────────────────────────────────────────────────────────────

function parseActions(text: string): AssistantAction[] {
  const actions: AssistantAction[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    if (!line.startsWith("ACTION:")) continue;
    const parts = line.split("|").map((p) => p.trim());
    const actionType = parts[0].replace("ACTION:", "").toLowerCase();

    if (actionType === "task" && parts.length >= 3) {
      actions.push({
        type: "create_task",
        payload: {
          title: parts[1] ?? "",
          priority: parts[2] ?? "medium",
          category: parts[3] ?? "personal",
          dueAt: parts[4] ? new Date(parts[4]) : null,
        },
      });
    } else if (actionType === "opportunity" && parts.length >= 4) {
      actions.push({
        type: "create_opportunity",
        payload: {
          title: parts[1] ?? "",
          type: parts[2] ?? "side_hustle",
          estimatedRevenue: parts[3] ? parseFloat(parts[3]) : null,
          timeToRevenueDays: parts[4] ? parseInt(parts[4]) : null,
          effortLevel: parts[5] ?? "medium",
        },
      });
    } else if (actionType === "insight" && parts.length >= 4) {
      actions.push({
        type: "create_insight",
        payload: {
          type: parts[1] ?? "opportunity_alert",
          title: parts[2] ?? "",
          body: parts[3] ?? "",
        },
      });
    }
  }

  return actions;
}

// ─── Action executor ──────────────────────────────────────────────────────────

export async function executeActions(actions: AssistantAction[]): Promise<void> {
  for (const action of actions) {
    if (action.type === "create_task") {
      const p = action.payload;
      await db.insert(tasks).values({
        title: String(p.title),
        priority: (p.priority as "low" | "medium" | "high" | "critical") ?? "medium",
        category: (p.category as "org" | "coding" | "entrepreneurship" | "personal") ?? "personal",
        dueAt: p.dueAt instanceof Date ? p.dueAt : null,
        source: "assistant",
      });
    } else if (action.type === "create_opportunity") {
      const p = action.payload;
      await db.insert(opportunities).values({
        title: String(p.title),
        description: String(p.title),
        type: (p.type as "side_hustle" | "investment" | "partnership" | "client" | "product" | "service" | "automation") ?? "side_hustle",
        estimatedRevenue: typeof p.estimatedRevenue === "number" ? p.estimatedRevenue : null,
        timeToRevenueDays: typeof p.timeToRevenueDays === "number" ? p.timeToRevenueDays : null,
        effortLevel: (p.effortLevel as "low" | "medium" | "high") ?? "medium",
        source: "assistant",
      });
    } else if (action.type === "create_insight") {
      const p = action.payload;
      await db.insert(insights).values({
        title: String(p.title),
        body: String(p.body),
        type: (p.type as "opportunity_alert" | "task_reminder" | "daily_brief" | "revenue_tip" | "code_suggestion" | "org_tip") ?? "opportunity_alert",
      });
    }
  }
}

// ─── Skill detector ───────────────────────────────────────────────────────────

function detectSkill(message: string): SkillModule {
  const lower = message.toLowerCase();
  const codingKeywords = ["code", "bug", "function", "script", "error", "api", "component", "typescript", "python", "bash", "deploy", "git", "npm", "database", "query"];
  const entKeywords = ["revenue", "money", "business", "client", "market", "opportunity", "profit", "startup", "mvp", "pricing", "launch", "sell", "automate", "income", "hustle"];
  const orgKeywords = ["task", "todo", "organize", "schedule", "prioritize", "reminder", "plan", "list", "deadline", "calendar", "follow up"];

  const codingScore = codingKeywords.filter((k) => lower.includes(k)).length;
  const entScore = entKeywords.filter((k) => lower.includes(k)).length;
  const orgScore = orgKeywords.filter((k) => lower.includes(k)).length;

  if (codingScore >= entScore && codingScore >= orgScore && codingScore > 0) return "coding";
  if (entScore >= codingScore && entScore >= orgScore && entScore > 0) return "entrepreneurship";
  if (orgScore > 0) return "org";
  return "general";
}

// ─── Main chat function ───────────────────────────────────────────────────────

export async function chat(
  userMessage: string,
  sessionId: string,
  channel: "web" | "telegram" | "gmail" | "whatsapp" = "web"
): Promise<AssistantResponse> {
  // Load recent history for this session
  const history = await db
    .select()
    .from(messages)
    .where(and(eq(messages.sessionId, sessionId), eq(messages.channel, channel)))
    .orderBy(desc(messages.createdAt))
    .limit(12);

  const contextBlock = await buildContext();
  const skill = detectSkill(userMessage);

  const skillHint =
    skill === "coding"
      ? "\n[ACTIVE SKILL: CODING — be technically precise, show code when helpful]"
      : skill === "entrepreneurship"
      ? "\n[ACTIVE SKILL: ENTREPRENEURSHIP — focus on revenue, speed to market, execution]"
      : skill === "org"
      ? "\n[ACTIVE SKILL: ORGANIZATION — capture tasks, prioritize ruthlessly, suggest systems]"
      : "";

  const systemContent = `${NANOCLAW_SYSTEM_PROMPT}${skillHint}\n\n${contextBlock}`;

  // Build message array for LLM
  const chatHistory: ChatMessage[] = [
    { role: "system", content: systemContent },
    ...history
      .reverse()
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: userMessage },
  ];

  // Call OpenAI-compatible endpoint
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o";

  let responseText = "";

  if (apiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: chatHistory,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      responseText = data.choices[0]?.message?.content ?? "No response.";
    } else {
      responseText = `[NanoClaw engine error: ${res.status}. Add OPENAI_API_KEY to env to enable AI responses.]`;
    }
  } else {
    // Fallback demo response when no API key is configured
    responseText = buildDemoResponse(userMessage, skill, contextBlock);
  }

  // Persist messages
  await db.insert(messages).values([
    { role: "user", content: userMessage, channel, sessionId },
    { role: "assistant", content: responseText, channel, sessionId },
  ]);

  // Parse and execute any structured actions
  const parsedActions = parseActions(responseText);
  if (parsedActions.length > 0) {
    await executeActions(parsedActions);
  }

  // Clean display text (strip ACTION: lines from chat)
  const displayText = responseText
    .split("\n")
    .filter((l) => !l.startsWith("ACTION:"))
    .join("\n")
    .trim();

  return {
    message: displayText,
    skill,
    actions: parsedActions,
  };
}

// ─── Demo fallback (no API key) ───────────────────────────────────────────────

function buildDemoResponse(userMessage: string, skill: SkillModule, _context: string): string {
  const demos: Record<SkillModule, string> = {
    coding: `Here's how I'd approach that:\n\n- Identify the core abstraction first\n- Write types before implementation\n- Use \`zod\` for runtime validation at boundaries\n- Keep side effects at the edge, pure logic in the middle\n\nWant me to scaffold the actual code?\n\nACTION:TASK | Review code architecture for: ${userMessage.slice(0, 40)} | medium | coding`,
    entrepreneurship: `Revenue analysis for "${userMessage.slice(0, 40)}":\n\n- **Quick win**: Sell access before building — validate in 48h\n- **Target market**: Identify 3 customers who'd pay today\n- **Pricing**: Start at $99/mo, premium tier at $299/mo\n- **Timeline**: MVP in 2 weeks, first revenue in 30 days\n\nACTION:OPPORTUNITY | ${userMessage.slice(0, 40)} | side_hustle | 2000 | 30 | medium`,
    org: `Captured. Here's how to handle this:\n\n- **Now**: Define the single next action (2 min or less)\n- **This week**: Block 90-min deep work session\n- **System**: Tag everything — nothing lives in your head\n\nACTION:TASK | ${userMessage.slice(0, 50)} | medium | org`,
    general: `Got it. NanoClaw is online and ready.\n\nI'm your persistent assistant for:\n- **Organization** — tasks, priorities, follow-ups\n- **Coding** — architecture, debugging, automation\n- **Entrepreneurship** — revenue, opportunities, execution\n\nAdd your \`OPENAI_API_KEY\` to env for full AI responses. What do you need?`,
  };
  return demos[skill];
}

// ─── Daily brief generator ────────────────────────────────────────────────────

export async function generateDailyBrief(): Promise<string> {
  const [pendingTasks, activeOpps, unreadInsights] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.status, "pending")).orderBy(desc(tasks.createdAt)).limit(5),
    db
      .select()
      .from(opportunities)
      .where(eq(opportunities.stage, "executing"))
      .limit(3),
    db.select().from(insights).where(eq(insights.isRead, false)).limit(5),
  ]);

  const lines = [
    "🧠 NanoClaw Daily Brief",
    `📅 ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`,
    "",
    `📋 PENDING TASKS (${pendingTasks.length})`,
    ...pendingTasks.map((t) => `  • [${t.priority?.toUpperCase()}] ${t.title}`),
    "",
    `💡 ACTIVE OPPORTUNITIES (${activeOpps.length})`,
    ...activeOpps.map((o) => `  • ${o.title} — est. $${o.estimatedRevenue ?? "?"}`),
    "",
    `🔔 UNREAD INSIGHTS (${unreadInsights.length})`,
    ...unreadInsights.map((i) => `  • ${i.title}`),
  ];

  return lines.join("\n");
}
