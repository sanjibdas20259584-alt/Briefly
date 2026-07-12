"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Send,
  Loader2,
  Trash2,
  AlertCircle,
  Users,
  FolderKanban,
  FileText,
  Bell,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { saveMessagesAction, clearChatAction } from "@/lib/actions/chatbot";
import type { ModelProviderPublic, ChatbotMessage } from "@/lib/types";

interface ChatCtx {
  ownerName: string;
  providers: ModelProviderPublic[];
  recentMessages: ChatbotMessage[];
  activeProjects: { title: string; status: string }[];
  unpaidInvoices: { invoice_number: string; total: number; status: string }[];
  upcomingReminders: { title: string; due_at: string }[];
}

const QUICK_ACTIONS = [
  { label: "New Client", prompt: "Create a new client for me", icon: Users },
  { label: "New Invoice", prompt: "Create a new invoice", icon: FileText },
  { label: "New Project", prompt: "Create a new project", icon: FolderKanban },
  { label: "New Reminder", prompt: "Set a reminder for me", icon: Bell },
  { label: "Follow Up", prompt: "Help me draft a follow-up message", icon: Sparkles },
  { label: "My Business", prompt: "Give me an overview of my business status", icon: Sparkles },
];

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function ChatWindow({ ctx }: { ctx: ChatCtx }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatbotMessage[]>(ctx.recentMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [providerId, setProviderId] = useState<string>(
    ctx.providers.find((p) => p.is_default)?.id ?? ctx.providers[0]?.id ?? ""
  );
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;
    if (!providerId) {
      toast("Add a model provider in Settings first.", "error");
      return;
    }
    setInput("");
    const userMsg: ChatbotMessage = {
      id: "u_" + Date.now(),
      user_id: "",
      role: "user",
      content: userText,
      provider_id: providerId,
      model: null,
      created_at: new Date().toISOString(),
    };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    const payload = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload, providerId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
      const model = ctx.providers.find((p) => p.id === providerId)?.model_name ?? null;
      let content = String(json.content ?? "");
      if (!content.trim()) content = "Done.";
      const assistantMsg: ChatbotMessage = {
        id: "a_" + Date.now(),
        user_id: "",
        role: "assistant",
        content,
        provider_id: providerId,
        model,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      await saveMessagesAction(providerId, model, userText, content);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to get a response", "error");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  async function clearChat() {
    setMessages([]);
    await clearChatAction();
  }

  return (
    <div className="flex h-[calc(100vh-5rem-env(safe-area-inset-bottom,0px))] flex-col rounded-2xl border border-surface-border bg-surface-raised shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Briefly Assistant</p>
            <p className="text-xs text-ink-soft">Your freelancing copilot</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="h-9 w-44 text-xs"
          >
            {ctx.providers.length === 0 && <option value="">No providers</option>}
            {ctx.providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.model_name}
              </option>
            ))}
          </Select>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-ink-soft active:bg-surface"
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
        {messages.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Bot className="h-7 w-7" />
            </div>
            <p className="mt-4 max-w-sm text-sm font-medium text-ink">
              Hi {ctx.ownerName}! I'm your freelancing copilot.
            </p>
            <p className="mt-1 max-w-sm text-xs text-ink-soft">
              Ask me to create clients, invoices, projects, reminders, or anything about your business.
            </p>

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {QUICK_ACTIONS.map((qa) => {
                const Icon = qa.icon;
                return (
                  <button
                    key={qa.label}
                    onClick={() => send(qa.prompt)}
                    className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-left text-xs font-medium text-ink transition-all active:scale-[0.97] active:bg-accent-subtle hover:border-accent/40 hover:bg-accent-subtle"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-accent-hover" />
                    {qa.label}
                  </button>
                );
              })}
            </div>

            {ctx.providers.length === 0 && (
              <p className="mt-4 flex items-center gap-2 text-xs text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
                Add a model provider in Settings first.
              </p>
            )}
          </div>
        )}

        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} content={m.content} time={formatTime(m.created_at)} />
        ))}

        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-surface-border bg-surface px-4 py-2.5 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-surface-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Ask Briefly anything..."
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
          <Button
            onClick={() => send()}
            loading={loading}
            disabled={!input.trim()}
            className="h-10 w-10 shrink-0 rounded-xl"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ role, content, time }: { role: string; content: string; time: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2.5`}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent mt-1">
          <Bot className="h-3.5 w-3.5" />
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? "order-first" : ""}`}>
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
            isUser
              ? "bg-accent text-white rounded-br-md"
              : "border border-surface-border bg-surface text-ink rounded-bl-md"
          }`}
        >
          {content}
        </div>
        {time && (
          <p className={`mt-1 text-[10px] text-ink-muted ${isUser ? "text-right" : "text-left"}`}>
            {time}
          </p>
        )}
      </div>
    </div>
  );
}
