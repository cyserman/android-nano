import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function nanoid(length = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

export function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return "—";
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function priorityColor(priority: string): string {
  switch (priority) {
    case "critical": return "text-red-400";
    case "high": return "text-orange-400";
    case "medium": return "text-yellow-400";
    case "low": return "text-green-400";
    default: return "text-zinc-400";
  }
}

export function priorityBg(priority: string): string {
  switch (priority) {
    case "critical": return "bg-red-500/15 border-red-500/30";
    case "high": return "bg-orange-500/15 border-orange-500/30";
    case "medium": return "bg-yellow-500/15 border-yellow-500/30";
    case "low": return "bg-green-500/15 border-green-500/30";
    default: return "bg-zinc-500/15 border-zinc-500/30";
  }
}

export function stageBadge(stage: string): string {
  const map: Record<string, string> = {
    identified: "bg-blue-500/20 text-blue-300",
    researching: "bg-purple-500/20 text-purple-300",
    planning: "bg-yellow-500/20 text-yellow-300",
    executing: "bg-orange-500/20 text-orange-300",
    scaling: "bg-green-500/20 text-green-300",
    paused: "bg-zinc-500/20 text-zinc-400",
    completed: "bg-emerald-500/20 text-emerald-300",
    rejected: "bg-red-500/20 text-red-400",
  };
  return map[stage] ?? "bg-zinc-500/20 text-zinc-400";
}

export function skillIcon(skill: string): string {
  switch (skill) {
    case "coding": return "💻";
    case "entrepreneurship": return "💰";
    case "org": return "📋";
    default: return "🧠";
  }
}
