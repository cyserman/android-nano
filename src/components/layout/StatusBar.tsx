"use client";

import { Brain } from "lucide-react";

interface StatusBarProps {
  title?: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}

export function StatusBar({ title = "NanoClaw", subtitle, rightSlot }: StatusBarProps) {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/60 px-4 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between h-14">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Brain size={16} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white leading-none">{title}</h1>
            {subtitle && <p className="text-[10px] text-zinc-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {rightSlot && <div>{rightSlot}</div>}
      </div>
    </header>
  );
}
