/** Shared validation + connection test for OpenAI-compatible providers. */

export interface ProviderConfig {
  base_url: string;
  model_name: string;
  api_key?: string | null;
  headers?: Record<string, string>;
}

export type ProviderValidationError =
  | "invalid_base_url"
  | "missing_api_key"
  | "missing_model"
  | "empty_name";

export function validateProviderConfig(
  p: ProviderConfig & { name?: string; requireName?: boolean; requireKey?: boolean }
): { ok: true } | { ok: false; code: ProviderValidationError; error: string } {
  const base = (p.base_url ?? "").trim();
  const model = (p.model_name ?? "").trim();
  const key = (p.api_key ?? "").trim();

  if (p.requireName && !(p.name ?? "").trim()) {
    return { ok: false, code: "empty_name", error: "Provider name is required." };
  }
  if (!base) {
    return { ok: false, code: "invalid_base_url", error: "Base URL is required." };
  }
  try {
    const u = new URL(base);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return {
        ok: false,
        code: "invalid_base_url",
        error: "Base URL must start with http:// or https://",
      };
    }
  } catch {
    return {
      ok: false,
      code: "invalid_base_url",
      error: "Invalid base URL. Example: http://localhost:20128/v1",
    };
  }
  if (!model) {
    return { ok: false, code: "missing_model", error: "Model name is required." };
  }
  if (p.requireKey !== false && !key) {
    return { ok: false, code: "missing_api_key", error: "API key is missing." };
  }
  return { ok: true };
}

export function chatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/chat/completions`;
}

export async function testProviderConnection(
  p: ProviderConfig,
  opts?: { timeoutMs?: number }
): Promise<{ ok: true; latencyMs: number } | { ok: false; error: string }> {
  const validation = validateProviderConfig({ ...p, requireKey: true });
  if (!validation.ok) return { ok: false, error: validation.error };

  const url = chatCompletionsUrl(p.base_url);
  const timeoutMs = opts?.timeoutMs ?? 15000;
  const started = Date.now();

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(p.api_key ?? "").trim()}`,
        ...(p.headers ?? {}),
      },
      body: JSON.stringify({
        model: p.model_name.trim(),
        messages: [{ role: "user", content: "Say OK." }],
        max_tokens: 8,
        temperature: 0,
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
    const latencyMs = Date.now() - started;

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Provider returned HTTP ${res.status}: ${text.slice(0, 240) || res.statusText}`,
      };
    }
    return { ok: true, latencyMs };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    if (msg.includes("abort") || msg.includes("AbortError")) {
      return {
        ok: false,
        error: `Connection timed out after ${timeoutMs / 1000}s. Is the model server running at ${p.base_url}?`,
      };
    }
    return {
      ok: false,
      error: `Could not reach provider at ${chatCompletionsUrl(p.base_url)}: ${msg}`,
    };
  }
}
