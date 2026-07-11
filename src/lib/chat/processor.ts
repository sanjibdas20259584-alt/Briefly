/**
 * Shared chat processor used by both the web API and Telegram webhook.
 * Handles provider resolution, system prompt, tool calling loop, and response.
 */
import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { decrypt } from "@/lib/crypto";
import {
  validateProviderConfig,
  chatCompletionsUrl,
} from "@/lib/providers/validate";
import { buildSystemPrompt, toolsAsOpenAI } from "@/lib/chat/tools";
import { executeChatTool } from "@/lib/chat/execute-tool";
import { getImportantMemories, formatMemoriesForPrompt, autoSaveMemories } from "@/lib/chat/memory";

const CHAT_TIMEOUT_MS = 30_000;
const MAX_TOOL_ROUNDS = 3;

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface ToolCall {
  id: string;
  type?: string;
  function: { name: string; arguments: string };
}

export interface ChatResult {
  content: string;
  toolCalls: { name: string; ok: boolean; summary: string }[];
}

export interface ChatError {
  error: string;
  status: number;
}

async function loadBusinessContext(userId: string) {
  const supabase = await getServerSupabase();
  const [
    settingsRes,
    clientsRes,
    projectsRes,
    invoicesRes,
    proposalsRes,
    remindersRes,
  ] = await Promise.all([
    supabase.from("app_settings").select("owner_name").eq("user_id", userId).single(),
    supabase.from("clients").select("id,name,status").order("name"),
    supabase.from("projects").select("id,title,status,due_date").eq("status", "active"),
    supabase
      .from("invoices")
      .select("id,invoice_number,total,due_date,status")
      .in("status", ["sent", "overdue"]),
    supabase
      .from("proposals")
      .select("id,title,status")
      .in("status", ["sent", "viewed", "draft"]),
    supabase
      .from("reminders")
      .select("id,title,due_at")
      .eq("status", "pending")
      .gte("due_at", new Date().toISOString()),
  ]);

  return {
    ownerName: settingsRes.data?.owner_name?.trim() || "Sanjib",
    clients: clientsRes.data ?? [],
    activeProjects: projectsRes.data ?? [],
    unpaidInvoices: invoicesRes.data ?? [],
    openProposals: proposalsRes.data ?? [],
    upcomingReminders: remindersRes.data ?? [],
  };
}

async function resolveProvider(userId: string, providerId?: string | null) {
  const service = getServiceSupabase();
  let provider;

  if (providerId) {
    const { data } = await service
      .from("model_providers")
      .select("*")
      .eq("id", providerId)
      .eq("user_id", userId)
      .single();
    provider = data;
  } else {
    const { data } = await service
      .from("model_providers")
      .select("*")
      .eq("user_id", userId)
      .eq("is_default", true)
      .maybeSingle();
    if (!data) {
      const { data: anyProvider } = await service
        .from("model_providers")
        .select("*")
        .eq("user_id", userId)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      provider = anyProvider;
    } else {
      provider = data;
    }
  }

  return provider;
}

async function callProvider(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  headers: Record<string, string>;
  messages: ChatMessage[];
  withTools: boolean;
}): Promise<
  | { ok: true; message: ChatMessage; status: number }
  | { ok: false; error: string; status: number }
> {
  const url = chatCompletionsUrl(opts.baseUrl);
  console.info("[chat] POST", url, "model=", opts.model, "tools=", opts.withTools);

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

    const body: Record<string, unknown> = {
      model: opts.model,
      messages: opts.messages,
      temperature: 0.3,
      max_tokens: 4096,
      stream: false,
    };
    if (opts.withTools) {
      body.tools = toolsAsOpenAI();
      body.tool_choice = "auto";
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
        ...opts.headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(t);

    console.info("[chat] provider status", res.status, "url=", url);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        status: 502,
        error: `Provider error (HTTP ${res.status}): ${text.slice(0, 400) || res.statusText}`,
      };
    }

    const text = await res.text();
    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(text);
    } catch {
      const lines = text.split("\n").filter((l) => l.startsWith("data: ") && l !== "data: [DONE]");
      const last = lines.pop();
      if (last) {
        parsed = JSON.parse(last.slice(6));
      } else {
        return { ok: false, status: 502, error: `Unexpected response format: ${text.slice(0, 200)}` };
      }
    }

    const message = (parsed?.choices?.[0]?.message ?? {
      role: "assistant",
      content: "",
    }) as ChatMessage;
    return { ok: true, message, status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    if (msg.includes("abort") || msg.includes("AbortError")) {
      return {
        ok: false,
        status: 504,
        error: `Model request timed out after ${CHAT_TIMEOUT_MS / 1000}s.`,
      };
    }
    return {
      ok: false,
      status: 502,
      error: `Could not reach model provider: ${msg}`,
    };
  }
}

/**
 * Process a chat message through the full AI pipeline.
 * Returns the assistant's text response.
 */
export async function processChatMessage(
  userId: string,
  userMessage: string,
  history: ChatMessage[] = [],
  providerId?: string | null
): Promise<ChatResult | ChatError> {
  const provider = await resolveProvider(userId, providerId);
  if (!provider) {
    return {
      error: "No model provider configured. Add one in Settings → Model providers.",
      status: 400,
    };
  }

  const apiKey = decrypt(provider.api_key_enc);
  const validation = validateProviderConfig({
    base_url: provider.base_url,
    model_name: provider.model_name,
    api_key: apiKey,
    requireKey: true,
  });
  if (!validation.ok) {
    return {
      error: `Provider "${provider.name}" is misconfigured: ${validation.error}. Fix it in Settings.`,
      status: 400,
    };
  }

  const ctx = await loadBusinessContext(userId);
  const importantMemories = await getImportantMemories(userId, 15);
  const memoriesText = formatMemoriesForPrompt(importantMemories);
  const systemPrompt = buildSystemPrompt(ctx) + (memoriesText ? `\n\nLONG-TERM MEMORY:\n${memoriesText}` : "");

  let conversation: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userMessage },
  ];

  const toolTrace: { name: string; ok: boolean; summary: string }[] = [];
  let supportsTools = true;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const result = await callProvider({
      baseUrl: provider.base_url,
      apiKey: apiKey!,
      model: provider.model_name,
      headers: (provider.headers as Record<string, string>) ?? {},
      messages: conversation,
      withTools: supportsTools,
    });

    if (
      !result.ok &&
      supportsTools &&
      /tool|function|unsupported|unknown/i.test(result.error)
    ) {
      console.warn("[chat] tools rejected, retrying without tools");
      supportsTools = false;
      const retry = await callProvider({
        baseUrl: provider.base_url,
        apiKey: apiKey!,
        model: provider.model_name,
        headers: (provider.headers as Record<string, string>) ?? {},
        messages: conversation,
        withTools: false,
      });
      if (!retry.ok) return { error: retry.error, status: retry.status };
      return { content: retry.message.content ?? "", toolCalls: [] };
    }

    if (!result.ok) return { error: result.error, status: result.status };

    const message = result.message;
    const toolCalls = message.tool_calls ?? [];

    if (!toolCalls.length) {
      return { content: message.content ?? "", toolCalls: toolTrace };
    }

    conversation = [...conversation, message];

    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch {
        args = {};
      }
      console.info("[chat] tool", tc.function.name, args);
      const executed = await executeChatTool(tc.function.name, args);
      toolTrace.push({
        name: tc.function.name,
        ok: executed.ok,
        summary: executed.summary,
      });
      conversation.push({
        role: "tool",
        tool_call_id: tc.id,
        name: tc.function.name,
        content: executed.summary,
      });
    }
  }

  // Final synthesis without tools
  const final = await callProvider({
    baseUrl: provider.base_url,
    apiKey: apiKey!,
    model: provider.model_name,
    headers: (provider.headers as Record<string, string>) ?? {},
    messages: conversation,
    withTools: false,
  });
  if (!final.ok) {
    const fallback =
      toolTrace.map((t) => `• ${t.name}: ${t.summary}`).join("\n") ||
      final.error;
    return { content: fallback, toolCalls: toolTrace };
  }

  const replyContent = final.message.content ?? "Done.";

  // Auto-save important memories from the conversation (fire and forget)
  autoSaveMemories(userId, userMessage, replyContent).catch(() => {});

  return { content: replyContent, toolCalls: toolTrace };
}
