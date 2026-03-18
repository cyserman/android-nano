"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusBar } from "@/components/layout/StatusBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn, formatRelativeTime, priorityBg } from "@/lib/utils";
import { Plus, CheckCircle2, Circle, ChevronDown, X } from "lucide-react";

interface Task {
  id: number;
  title: string;
  description?: string | null;
  status: "pending" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  category: "org" | "coding" | "entrepreneurship" | "personal";
  dueAt?: string | null;
  createdAt?: string | null;
  notes?: string | null;
}

const CATEGORY_COLORS = {
  org: "text-yellow-400",
  coding: "text-blue-400",
  entrepreneurship: "text-emerald-400",
  personal: "text-purple-400",
};

const CATEGORY_ICONS = {
  org: "📋",
  coding: "💻",
  entrepreneurship: "💰",
  personal: "👤",
};

const FILTERS = ["all", "pending", "in_progress", "done"] as const;
type Filter = (typeof FILTERS)[number];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");
  const [newCategory, setNewCategory] = useState<Task["category"]>("personal");
  const [adding, setAdding] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = (await res.json()) as Task[];
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const updateTask = async (id: number, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
  };

  const markDone = (id: number) => updateTask(id, { status: "done" });

  const addTask = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), priority: newPriority, category: newCategory }),
      });
      const task = (await res.json()) as Task;
      setTasks((prev) => [task, ...prev]);
      setNewTitle("");
      setShowAdd(false);
    } finally {
      setAdding(false);
    }
  };

  const filtered = tasks.filter((t) => filter === "all" || t.status === filter);
  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <StatusBar
        title="Tasks"
        subtitle={`${counts.pending} pending`}
        rightSlot={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAdd(true)}
            className="gap-1.5"
          >
            <Plus size={14} />
            Add
          </Button>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0",
              filter === f
                ? "bg-violet-600 text-white"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600"
            )}
          >
            <span className="capitalize">{f.replace("_", " ")}</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full",
                filter === f ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-500"
              )}
            >
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Add task sheet */}
      {showAdd && (
        <div className="mx-4 mb-3 bg-zinc-900 border border-zinc-700 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">New Task</p>
            <button onClick={() => setShowAdd(false)}>
              <X size={16} className="text-zinc-500" />
            </button>
          </div>
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void addTask()}
            placeholder="Task title..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500/60"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Priority</label>
              <div className="relative">
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as Task["priority"])}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none appearance-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Category</label>
              <div className="relative">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as Task["category"])}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none appearance-none"
                >
                  <option value="personal">Personal</option>
                  <option value="org">Org</option>
                  <option value="coding">Coding</option>
                  <option value="entrepreneurship">Entrepreneurship</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => void addTask()}
            loading={adding}
            disabled={!newTitle.trim()}
          >
            Add Task
          </Button>
        </div>
      )}

      {/* Task list */}
      <div className="px-4 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-zinc-900 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-14">
            <CheckCircle2 size={36} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">No {filter} tasks</p>
          </div>
        ) : (
          filtered.map((task) => (
            <div
              key={task.id}
              className={cn(
                "rounded-2xl border p-4 flex items-start gap-3 transition-all",
                task.status === "done"
                  ? "bg-zinc-900/40 border-zinc-800/40 opacity-60"
                  : `bg-zinc-900 ${priorityBg(task.priority)}`
              )}
            >
              <button
                onClick={() => {
                  if (task.status !== "done") void markDone(task.id);
                }}
                className="flex-shrink-0 mt-0.5"
              >
                {task.status === "done" ? (
                  <CheckCircle2 size={20} className="text-emerald-400" />
                ) : (
                  <Circle size={20} className="text-zinc-600 hover:text-violet-400 transition-colors" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium leading-snug",
                    task.status === "done" ? "line-through text-zinc-500" : "text-white"
                  )}
                >
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={cn("text-[10px] font-medium uppercase tracking-wider", CATEGORY_COLORS[task.category])}>
                    {CATEGORY_ICONS[task.category]} {task.category}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {formatRelativeTime(task.createdAt ? new Date(task.createdAt) : null)}
                  </span>
                </div>
              </div>

              <Badge
                variant={
                  task.priority === "critical"
                    ? "danger"
                    : task.priority === "high"
                    ? "warning"
                    : task.priority === "medium"
                    ? "default"
                    : "muted"
                }
              >
                {task.priority}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
