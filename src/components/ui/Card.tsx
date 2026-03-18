"use client";

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  glass?: boolean;
}

export function Card({ children, className, onClick, glass }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4",
        glass
          ? "bg-white/5 border-white/10 backdrop-blur-sm"
          : "bg-zinc-900 border-zinc-800",
        onClick && "cursor-pointer active:scale-[0.98] transition-transform",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-3", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-base font-semibold text-white leading-snug", className)}>{children}</h3>;
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-sm text-zinc-400 mt-0.5", className)}>{children}</p>;
}
