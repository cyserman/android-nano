import { db } from "@/db";
import { tasks, opportunities, insights } from "@/db/schema";
import { desc, eq, ne, and } from "drizzle-orm";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatRelativeTime, priorityColor, stageBadge } from "@/lib/utils";
import { CheckSquare, Lightbulb, Bell, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [pendingTasks, activeOpps, unreadInsights] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(and(ne(tasks.status, "done"), ne(tasks.status, "cancelled")))
      .orderBy(desc(tasks.createdAt))
      .limit(4),
    db
      .select()
      .from(opportunities)
      .where(and(ne(opportunities.stage, "completed"), ne(opportunities.stage, "rejected")))
      .orderBy(desc(opportunities.createdAt))
      .limit(3),
    db.select().from(insights).where(eq(insights.isRead, false)).orderBy(desc(insights.createdAt)).limit(3),
  ]);

  const totalEstRevenue = activeOpps.reduce((s, o) => s + (o.estimatedRevenue ?? 0), 0);
  const criticalTasks = pendingTasks.filter((t) => t.priority === "critical" || t.priority === "high");

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      <StatusBar
        title="NanoClaw"
        subtitle="AI Personal Assistant"
        rightSlot={
          <Link href="/chat" className="relative">
            <Zap size={20} className="text-violet-400" />
          </Link>
        }
      />

      <div className="px-4 py-5 space-y-5">
        {/* Greeting hero */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-600/20 via-violet-900/10 to-transparent border border-violet-500/20 p-5">
          <p className="text-zinc-400 text-sm">{greeting}</p>
          <h2 className="text-2xl font-bold text-white mt-1">
            {criticalTasks.length > 0
              ? `${criticalTasks.length} high-priority item${criticalTasks.length !== 1 ? "s" : ""} need attention`
              : activeOpps.length > 0
              ? `${activeOpps.length} active opportunit${activeOpps.length !== 1 ? "ies" : "y"} in motion`
              : "All clear — what's next?"}
          </h2>
          {totalEstRevenue > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">
                {formatCurrency(totalEstRevenue)} pipeline value
              </span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/tasks">
            <Card className="text-center py-4 hover:border-violet-500/40 transition-colors">
              <CheckSquare size={18} className="text-violet-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{pendingTasks.length}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Tasks</div>
            </Card>
          </Link>
          <Link href="/opportunities">
            <Card className="text-center py-4 hover:border-emerald-500/40 transition-colors">
              <Lightbulb size={18} className="text-emerald-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{activeOpps.length}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Opps</div>
            </Card>
          </Link>
          <Link href="/settings">
            <Card className="text-center py-4 hover:border-yellow-500/40 transition-colors">
              <Bell size={18} className="text-yellow-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{unreadInsights.length}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Alerts</div>
            </Card>
          </Link>
        </div>

        {/* Unread insights */}
        {unreadInsights.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 px-1">
              Insights
            </h3>
            <div className="space-y-2">
              {unreadInsights.map((insight) => (
                <Card key={insight.id} glass className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell size={14} className="text-yellow-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{insight.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{insight.body}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Priority tasks */}
        {pendingTasks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tasks</h3>
              <Link href="/tasks" className="text-xs text-violet-400">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {pendingTasks.slice(0, 3).map((task) => (
                <Card key={task.id} className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      task.priority === "critical"
                        ? "bg-red-400"
                        : task.priority === "high"
                        ? "bg-orange-400"
                        : task.priority === "medium"
                        ? "bg-yellow-400"
                        : "bg-green-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{task.title}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider">
                      {task.category} · {formatRelativeTime(task.createdAt)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      task.priority === "critical"
                        ? "danger"
                        : task.priority === "high"
                        ? "warning"
                        : "muted"
                    }
                    className={priorityColor(task.priority ?? "medium")}
                  >
                    {task.priority}
                  </Badge>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active opportunities */}
        {activeOpps.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Opportunities
              </h3>
              <Link href="/opportunities" className="text-xs text-violet-400">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {activeOpps.map((opp) => (
                <Card key={opp.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Lightbulb size={15} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{opp.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${stageBadge(opp.stage ?? "identified")}`}>
                        {opp.stage}
                      </span>
                      {opp.estimatedRevenue && (
                        <span className="text-[10px] text-emerald-400 font-medium">
                          {formatCurrency(opp.estimatedRevenue)}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {pendingTasks.length === 0 && activeOpps.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <Zap size={28} className="text-violet-400" />
            </div>
            <p className="text-white font-semibold text-lg">NanoClaw is ready</p>
            <p className="text-zinc-400 text-sm mt-2 max-w-xs mx-auto">
              Start by chatting — I&apos;ll capture tasks and opportunities automatically.
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Start chatting
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
