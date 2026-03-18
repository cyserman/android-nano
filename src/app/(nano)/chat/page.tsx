"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { StatusBar } from "@/components/layout/StatusBar";
import { Button } from "@/components/ui/Button";
import { cn, skillIcon, nanoid } from "@/lib/utils";
import { Send, Mic } from "lucide-react";
import type { AssistantResponse, SkillModule } from "@/lib/nanoclaw-engine";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  skill?: SkillModule;
  timestamp: Date;
  actions?: AssistantResponse["actions"];
}

const SKILL_COLORS: Record<SkillModule, string> = {
  coding: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  entrepreneurship: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  org: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  general: "text-violet-400 bg-violet-500/10 border-violet-500/20",
};

const QUICK_PROMPTS = [
  "What should I focus on today?",
  "Find me a revenue opportunity",
  "Help me debug my code",
  "Organize my week",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "NanoClaw online. I'm your persistent AI assistant — wired into your tasks, opportunities, Telegram, and Gmail.\n\nI specialize in organization, coding, and entrepreneurship. What do you need?",
      skill: "general",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => nanoid());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: Message = {
        id: nanoid(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text.trim(), sessionId }),
        });

        const data = (await res.json()) as AssistantResponse & { sessionId: string };

        const assistantMsg: Message = {
          id: nanoid(),
          role: "assistant",
          content: data.message,
          skill: data.skill,
          timestamp: new Date(),
          actions: data.actions,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: "assistant",
            content: "Connection error. Check your network and try again.",
            skill: "general",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [loading, sessionId]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      <StatusBar title="NanoClaw" subtitle="AI Assistant · Always on" />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-[160px]">
        {/* Quick prompts — only show when just welcome message */}
        {messages.length === 1 && (
          <div className="space-y-2 pb-2">
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium">Quick start</p>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => void sendMessage(prompt)}
                className="w-full text-left px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 hover:border-violet-500/40 hover:text-white transition-all active:scale-[0.98]"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 mr-2 mt-1 text-xs">
                🧠
              </div>
            )}

            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3",
                msg.role === "user"
                  ? "bg-violet-600 text-white rounded-br-sm"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-sm"
              )}
            >
              {/* Skill badge */}
              {msg.role === "assistant" && msg.skill && msg.skill !== "general" && (
                <div
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border mb-2",
                    SKILL_COLORS[msg.skill]
                  )}
                >
                  <span>{skillIcon(msg.skill)}</span>
                  <span className="uppercase tracking-wider">{msg.skill}</span>
                </div>
              )}

              {/* Message content */}
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>

              {/* Auto-created actions summary */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-zinc-700/50 pt-2">
                  {msg.actions.map((action, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <span>{action.type === "create_task" ? "✅" : action.type === "create_opportunity" ? "💡" : "🔔"}</span>
                      <span>
                        {action.type === "create_task" && `Task saved: ${String(action.payload.title).slice(0, 40)}`}
                        {action.type === "create_opportunity" && `Opp logged: ${String(action.payload.title).slice(0, 40)}`}
                        {action.type === "create_insight" && `Insight: ${String(action.payload.title).slice(0, 40)}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-zinc-600 mt-2">
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 text-xs">
              🧠
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="fixed bottom-[64px] left-0 right-0 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/60 px-4 py-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 focus-within:border-violet-500/60 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask NanoClaw anything..."
              rows={1}
              className="w-full bg-transparent text-sm text-white placeholder-zinc-500 resize-none outline-none max-h-32"
              style={{ height: "auto" }}
              onInput={(e) => {
                const target = e.currentTarget;
                target.style.height = "auto";
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-500 flex-shrink-0"
            title="Voice input"
          >
            <Mic size={18} />
          </Button>
          <Button
            variant="primary"
            size="icon"
            onClick={() => void sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex-shrink-0"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
