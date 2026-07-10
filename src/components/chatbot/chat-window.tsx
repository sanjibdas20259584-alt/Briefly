"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Loader2, Trash2, AlertCircle } from "lucide-react";
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

  async function send() {
    if (!input.trim() || loading) return;
    const userText = input.trim();
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

    // Server injects system prompt + tools; send only conversation turns.
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
      if (Array.isArray(json.toolCalls) && json.toolCalls.length > 0) {
        // Keep reply clean; tools already ran server-side
      }
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
    <div className="flex h-[calc(100vh-9rem)] flex-col rounded-2xl border border-surface-border bg-surface-raised shadow-card">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <div className="flex items-center gap-2">
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
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-ink-soft hover:bg-surface"
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot className="mb-3 h-10 w-10 text-ink-muted" />
            <p className="max-w-sm text-sm text-ink-soft">
              Hi {ctx.ownerName}. Ask me to prioritize your week, create a client,
              draft a follow-up, or plan a proposal. I can read and update your data.
            </p>
            {ctx.providers.length === 0 && (
              <p className="mt-3 flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                Add a model provider in Settings first (e.g. localhost:20128).
              </p>
            )}
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} content={m.content} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

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
            placeholder="Ask Briefly…"
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
          <Button onClick={send} loading={loading} className="h-10" aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-accent text-white"
            : "border border-surface-border bg-surface text-ink"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
