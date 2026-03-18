"use client";

import { useState } from "react";
import { StatusBar } from "@/components/layout/StatusBar";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Bot,
  Mail,
  Send,
  Key,
  Terminal,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Copy,
  RefreshCw,
} from "lucide-react";

interface StatusBadge {
  ok: boolean;
  label: string;
}

const STATUS_ITEMS = [
  { key: "openai", icon: Key, label: "OpenAI API Key", env: "OPENAI_API_KEY", description: "Powers all AI responses" },
  { key: "telegram", icon: Send, label: "Telegram Bot", env: "TELEGRAM_BOT_TOKEN", description: "Receive and send messages" },
  { key: "gmail", icon: Mail, label: "Gmail (andycodebot)", env: "GMAIL_ACCESS_TOKEN", description: "andycodebot@gmail.com" },
];

const INSTALL_COMMAND = `curl -fsSL https://your-app-url.kiloapps.io/scripts/install-nanoclaw.sh | bash`;

export default function SettingsPage() {
  const [copied, setCopied] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string>("");

  const copyInstall = async () => {
    await navigator.clipboard.writeText(INSTALL_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const registerWebhook = async () => {
    setWebhookLoading(true);
    setWebhookStatus("");
    try {
      const res = await fetch("/api/telegram");
      const data = (await res.json()) as StatusBadge & { hasToken: boolean; status: string };
      setWebhookStatus(data.hasToken ? "Webhook active" : "No token — add TELEGRAM_BOT_TOKEN");
    } catch {
      setWebhookStatus("Error checking webhook");
    } finally {
      setWebhookLoading(false);
    }
  };

  const SKILL_CARDS = [
    {
      icon: "📋",
      title: "Organization",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10 border-yellow-500/20",
      features: ["Task capture from chat", "Priority ranking", "GTD-style processing", "Follow-up tracking"],
    },
    {
      icon: "💻",
      title: "Coding",
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
      features: ["Architecture review", "Bug diagnosis", "Code generation", "Automation scripts"],
    },
    {
      icon: "💰",
      title: "Entrepreneurship",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      features: ["Opportunity detection", "Revenue modeling", "MVP planning", "Execution roadmaps"],
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <StatusBar title="Settings" subtitle="NanoClaw configuration" />

      <div className="px-4 py-5 space-y-6">
        {/* Status */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Integrations</h3>
          <div className="space-y-2">
            {STATUS_ITEMS.map(({ key, icon: Icon, label, env, description }) => (
              <Card key={key} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-zinc-600 font-mono">{env}</span>
                  <AlertCircle size={14} className="text-zinc-600" />
                </div>
              </Card>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-2 px-1">
            Add API keys via environment variables in your deployment settings.
          </p>
        </div>

        {/* Telegram webhook */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Telegram</h3>
          <Card className="space-y-3">
            <div>
              <CardTitle>Webhook Setup</CardTitle>
              <CardDescription>Connect your Telegram bot to receive messages</CardDescription>
            </div>
            <ol className="space-y-1.5 text-xs text-zinc-400 list-decimal list-inside">
              <li>Create a bot via @BotFather on Telegram</li>
              <li>Copy your bot token</li>
              <li>Add <code className="text-violet-300">TELEGRAM_BOT_TOKEN</code> to env</li>
              <li>Set <code className="text-violet-300">TELEGRAM_AUTHORIZED_CHAT_ID</code> for security</li>
              <li>Click verify below</li>
            </ol>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void registerWebhook()}
                loading={webhookLoading}
                className="gap-2"
              >
                <RefreshCw size={13} />
                Check Status
              </Button>
              {webhookStatus && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  {webhookStatus.includes("active") ? (
                    <CheckCircle size={13} className="text-emerald-400" />
                  ) : (
                    <AlertCircle size={13} className="text-yellow-400" />
                  )}
                  {webhookStatus}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Termux install */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Android / Termux Install
          </h3>
          <Card className="space-y-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Terminal size={16} className="text-violet-400" />
                Persistent S24 Ultra Daemon
              </CardTitle>
              <CardDescription>Install NanoClaw as a persistent background service on your phone</CardDescription>
            </div>

            <ol className="space-y-1.5 text-xs text-zinc-400 list-decimal list-inside">
              <li>Install Termux from F-Droid (not Play Store)</li>
              <li>Install Termux:Boot from F-Droid</li>
              <li>Open Termux and run the command below</li>
              <li>Follow the setup prompts</li>
              <li>Bot starts automatically on every reboot</li>
            </ol>

            <div className="bg-zinc-800 rounded-xl p-3 border border-zinc-700">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-medium">Install command</p>
              <code className="text-xs text-violet-300 font-mono break-all leading-relaxed">
                {INSTALL_COMMAND}
              </code>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void copyInstall()}
                className="gap-2"
              >
                {copied ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copied ? "Copied!" : "Copy Command"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-zinc-400"
                onClick={() => window.open("/scripts/install-nanoclaw.sh", "_blank")}
              >
                <ExternalLink size={13} />
                View Script
              </Button>
            </div>

            <div className="border-t border-zinc-800 pt-3">
              <p className="text-xs font-medium text-zinc-300 mb-2">After install, use in Termux:</p>
              <code className="text-xs text-emerald-300 font-mono bg-zinc-800 rounded-lg px-3 py-2 block">
                nanoclaw &quot;what should I focus on today?&quot;
              </code>
            </div>
          </Card>
        </div>

        {/* Skill modules */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Skill Modules</h3>
          <div className="space-y-2">
            {SKILL_CARDS.map((skill) => (
              <Card key={skill.title} className={`border ${skill.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{skill.icon}</span>
                  <span className={`text-sm font-semibold ${skill.color}`}>{skill.title}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {skill.features.map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <ChevronRight size={10} className="text-zinc-600" />
                      {f}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* About */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">About</h3>
          <Card>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-xl">
                🧠
              </div>
              <div>
                <p className="text-sm font-bold text-white">NanoClaw</p>
                <p className="text-xs text-zinc-500">v1.0.0 · Persistent AI Assistant</p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <Bot size={12} />
                <span>Telegram + Gmail + Web interface</span>
              </div>
              <div className="flex items-center gap-2">
                <Terminal size={12} />
                <span>Runs 24/7 via Termux on S24 Ultra</span>
              </div>
              <div className="flex items-center gap-2">
                <Key size={12} />
                <span>OpenAI GPT-4o powered responses</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
