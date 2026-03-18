"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusBar } from "@/components/layout/StatusBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn, formatCurrency, formatRelativeTime, stageBadge } from "@/lib/utils";
import { Plus, Lightbulb, TrendingUp, Clock, X, ChevronDown } from "lucide-react";

interface Opportunity {
  id: number;
  title: string;
  description: string;
  type: string;
  stage: string;
  estimatedRevenue?: number | null;
  actualRevenue?: number | null;
  timeToRevenueDays?: number | null;
  effortLevel?: string | null;
  notes?: string | null;
  createdAt?: string | null;
}

const TYPE_ICONS: Record<string, string> = {
  side_hustle: "⚡",
  investment: "📈",
  partnership: "🤝",
  client: "🏢",
  product: "📦",
  service: "🛠",
  automation: "🤖",
};

const STAGES = ["identified", "researching", "planning", "executing", "scaling", "paused", "completed", "rejected"] as const;

export default function OpportunitiesPage() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("side_hustle");
  const [newRevenue, setNewRevenue] = useState("");
  const [newDays, setNewDays] = useState("");
  const [newEffort, setNewEffort] = useState("medium");

  const fetchOpps = useCallback(async () => {
    try {
      const res = await fetch("/api/opportunities");
      const data = (await res.json()) as Opportunity[];
      setOpps(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOpps();
  }, [fetchOpps]);

  const advanceStage = async (opp: Opportunity) => {
    const idx = STAGES.indexOf(opp.stage as (typeof STAGES)[number]);
    if (idx === -1 || idx >= STAGES.length - 2) return;
    const nextStage = STAGES[idx + 1];
    setOpps((prev) => prev.map((o) => (o.id === opp.id ? { ...o, stage: nextStage } : o)));
    await fetch("/api/opportunities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: opp.id, stage: nextStage }),
    });
  };

  const addOpp = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          type: newType,
          estimatedRevenue: newRevenue ? parseFloat(newRevenue) : undefined,
          timeToRevenueDays: newDays ? parseInt(newDays) : undefined,
          effortLevel: newEffort,
        }),
      });
      const opp = (await res.json()) as Opportunity;
      setOpps((prev) => [opp, ...prev]);
      setNewTitle("");
      setNewRevenue("");
      setNewDays("");
      setShowAdd(false);
    } finally {
      setAdding(false);
    }
  };

  const totalPipeline = opps
    .filter((o) => o.stage !== "rejected" && o.stage !== "completed")
    .reduce((s, o) => s + (o.estimatedRevenue ?? 0), 0);

  const activeOpps = opps.filter((o) => o.stage === "executing" || o.stage === "scaling");

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <StatusBar
        title="Opportunities"
        subtitle={`${formatCurrency(totalPipeline)} pipeline`}
        rightSlot={
          <Button variant="primary" size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus size={14} />
            Add
          </Button>
        }
      />

      {/* Pipeline summary */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Card className="text-center py-3">
            <div className="text-lg font-bold text-white">{opps.length}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Total</div>
          </Card>
          <Card className="text-center py-3">
            <div className="text-lg font-bold text-emerald-400">{activeOpps.length}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Active</div>
          </Card>
          <Card className="text-center py-3">
            <div className="text-sm font-bold text-violet-400">{formatCurrency(totalPipeline)}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Pipeline</div>
          </Card>
        </div>
      </div>

      {/* Add opportunity sheet */}
      {showAdd && (
        <div className="mx-4 mb-3 bg-zinc-900 border border-zinc-700 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">New Opportunity</p>
            <button onClick={() => setShowAdd(false)}>
              <X size={16} className="text-zinc-500" />
            </button>
          </div>
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Opportunity title..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500/60"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Type</label>
              <div className="relative">
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none appearance-none"
                >
                  {Object.entries(TYPE_ICONS).map(([k]) => (
                    <option key={k} value={k}>{k.replace("_", " ")}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Effort</label>
              <div className="relative">
                <select
                  value={newEffort}
                  onChange={(e) => setNewEffort(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none appearance-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Est. Revenue $</label>
              <input
                type="number"
                value={newRevenue}
                onChange={(e) => setNewRevenue(e.target.value)}
                placeholder="5000"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-violet-500/60"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Days to Rev</label>
              <input
                type="number"
                value={newDays}
                onChange={(e) => setNewDays(e.target.value)}
                placeholder="30"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-violet-500/60"
              />
            </div>
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => void addOpp()}
            loading={adding}
            disabled={!newTitle.trim()}
          >
            Add Opportunity
          </Button>
        </div>
      )}

      {/* Detail sheet */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold text-white">{selected.title}</p>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">{selected.type.replace("_", " ")}</p>
              </div>
              <button onClick={() => setSelected(null)}>
                <X size={20} className="text-zinc-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {selected.estimatedRevenue && (
                <Card className="text-center py-3">
                  <TrendingUp size={14} className="text-emerald-400 mx-auto mb-1" />
                  <div className="text-sm font-bold text-emerald-400">{formatCurrency(selected.estimatedRevenue)}</div>
                  <div className="text-[10px] text-zinc-500">Est. Revenue</div>
                </Card>
              )}
              {selected.timeToRevenueDays && (
                <Card className="text-center py-3">
                  <Clock size={14} className="text-yellow-400 mx-auto mb-1" />
                  <div className="text-sm font-bold text-yellow-400">{selected.timeToRevenueDays}d</div>
                  <div className="text-[10px] text-zinc-500">To Revenue</div>
                </Card>
              )}
            </div>

            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Stage</p>
              <div className="flex flex-wrap gap-2">
                {STAGES.slice(0, 6).map((s) => (
                  <span
                    key={s}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full",
                      selected.stage === s ? stageBadge(s) + " ring-1 ring-current" : "bg-zinc-800 text-zinc-500"
                    )}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {selected.notes && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-zinc-300 bg-zinc-800 rounded-xl p-3">{selected.notes}</p>
              </div>
            )}

            <Button
              variant="success"
              className="w-full"
              onClick={() => {
                void advanceStage(selected);
                setSelected(null);
              }}
            >
              Advance Stage →
            </Button>
          </div>
        </div>
      )}

      {/* Opportunity list */}
      <div className="px-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-zinc-900 animate-pulse" />
          ))
        ) : opps.length === 0 ? (
          <div className="text-center py-14">
            <Lightbulb size={36} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">No opportunities yet</p>
            <p className="text-zinc-600 text-xs mt-1">Chat with NanoClaw — it will identify them for you</p>
          </div>
        ) : (
          opps.map((opp) => (
            <Card key={opp.id} onClick={() => setSelected(opp)} className="active:scale-[0.98] transition-all cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-lg">
                  {TYPE_ICONS[opp.type] ?? "💡"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-white leading-snug">{opp.title}</p>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full flex-shrink-0", stageBadge(opp.stage))}>
                      {opp.stage}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {opp.estimatedRevenue && (
                      <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                        <TrendingUp size={10} />
                        {formatCurrency(opp.estimatedRevenue)}
                      </span>
                    )}
                    {opp.timeToRevenueDays && (
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Clock size={10} />
                        {opp.timeToRevenueDays}d
                      </span>
                    )}
                    <span className="text-xs text-zinc-600">{formatRelativeTime(opp.createdAt ? new Date(opp.createdAt) : null)}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
