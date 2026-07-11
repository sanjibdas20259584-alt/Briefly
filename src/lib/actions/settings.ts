"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { encrypt, decrypt } from "@/lib/crypto";
import type { ModelProviderPublic } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function updateProfileAction(prevState: unknown, fd: FormData) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const ownerName = String(fd.get("owner_name") ?? "").trim() || "Sanjib";
  const { error } = await supabase
    .from("app_settings")
    .update({ owner_name: ownerName })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message } as const;
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  return { ok: true } as const;
}

export async function updateThemeAction(theme: "light" | "dark" | "system") {
  if (!["light", "dark", "system"].includes(theme)) {
    return { ok: false, error: "Invalid theme." } as const;
  }
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const { error } = await supabase
    .from("app_settings")
    .update({ theme })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message } as const;
  revalidatePath("/", "layout");
  return { ok: true } as const;
}

export async function updateTelegramAction(prevState: unknown, fd: FormData) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const token = String(fd.get("telegram_bot_token") ?? "").trim() || null;
  const chatId = String(fd.get("telegram_chat_id") ?? "").trim() || null;

  const { error } = await supabase
    .from("app_settings")
    .update({
      telegram_bot_token_enc: token ? encrypt(token) : null,
      telegram_chat_id: chatId,
    })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message } as const;
  revalidatePath("/settings");
  revalidatePath("/reminders");
  return { ok: true } as const;
}

export async function getTelegramStatusAction() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { configured: false, botUsername: null, chatId: null };

  const { data } = await supabase
    .from("app_settings")
    .select("telegram_bot_token_enc, telegram_chat_id")
    .eq("user_id", user.id)
    .single();

  const hasToken = !!data?.telegram_bot_token_enc;
  const chatId = data?.telegram_chat_id ?? null;

  // Try to get bot username from Telegram API
  let botUsername: string | null = null;
  if (hasToken) {
    try {
      const token = decrypt(data!.telegram_bot_token_enc);
      if (token) {
        const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const json = await res.json();
        if (json.ok) {
          botUsername = json.result.username ?? null;
        }
      }
    } catch {
      // ignore
    }
  }

  return { configured: hasToken, botUsername, chatId };
}

export interface ProviderInput {
  name: string;
  base_url: string;
  api_key?: string | null;
  model_name: string;
  headers?: Record<string, string>;
  is_default?: boolean;
}

export async function createProviderAction(prevState: unknown, fd: FormData) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const name = String(fd.get("name") ?? "").trim();
  const base_url = String(fd.get("base_url") ?? "").trim();
  const api_key = String(fd.get("api_key") ?? "").trim() || null;
  const model_name = String(fd.get("model_name") ?? "").trim();
  const is_default = fd.get("is_default") === "on";
  const headers = parseHeaders(fd.get("headers"));
  const skipTest = fd.get("skip_test") === "on";

  const { validateProviderConfig, testProviderConnection } = await import(
    "@/lib/providers/validate"
  );
  const validation = validateProviderConfig({
    name,
    base_url,
    model_name,
    api_key,
    requireName: true,
    requireKey: true,
  });
  if (!validation.ok) return { ok: false, error: validation.error } as const;

  if (!skipTest) {
    const test = await testProviderConnection(
      { base_url, model_name, api_key, headers },
      { timeoutMs: 15000 }
    );
    if (!test.ok) {
      return {
        ok: false,
        error: `Connection test failed: ${test.error}`,
      } as const;
    }
  }

  const service = getServiceSupabase();
  // If marking default, clear others first.
  if (is_default) {
    await service.from("model_providers").update({ is_default: false }).eq("user_id", user.id);
  }
  const countRes = await service
    .from("model_providers")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  const firstProvider = (countRes.count ?? 0) === 0;

  const { error } = await service.from("model_providers").insert({
    user_id: user.id,
    name,
    base_url,
    api_key_enc: api_key ? encrypt(api_key) : null,
    model_name,
    headers,
    is_default: is_default || firstProvider,
  });
  if (error) return { ok: false, error: error.message } as const;
  revalidatePath("/settings");
  revalidatePath("/chatbot");
  return { ok: true } as const;
}

export async function updateProviderAction(
  id: string,
  prevState: unknown,
  fd: FormData
) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const name = String(fd.get("name") ?? "").trim();
  const base_url = String(fd.get("base_url") ?? "").trim();
  const api_key = String(fd.get("api_key") ?? "").trim();
  const model_name = String(fd.get("model_name") ?? "").trim();
  const is_default = fd.get("is_default") === "on";
  const headers = parseHeaders(fd.get("headers"));
  const skipTest = fd.get("skip_test") === "on";

  const service = getServiceSupabase();
  const { data: existing } = await service
    .from("model_providers")
    .select("*")
    .eq("id", id)
    .single();
  if (!existing) return { ok: false, error: "Provider not found." } as const;

  const effectiveKey = api_key || decrypt(existing.api_key_enc);
  const { validateProviderConfig, testProviderConnection } = await import(
    "@/lib/providers/validate"
  );
  const validation = validateProviderConfig({
    name,
    base_url,
    model_name,
    api_key: effectiveKey,
    requireName: true,
    requireKey: true,
  });
  if (!validation.ok) return { ok: false, error: validation.error } as const;

  if (!skipTest) {
    const test = await testProviderConnection(
      { base_url, model_name, api_key: effectiveKey, headers },
      { timeoutMs: 15000 }
    );
    if (!test.ok) {
      return {
        ok: false,
        error: `Connection test failed: ${test.error}`,
      } as const;
    }
  }

  if (is_default) {
    await service
      .from("model_providers")
      .update({ is_default: false })
      .eq("user_id", (await supabase.auth.getUser()).data.user!.id);
  }
  const update: Record<string, unknown> = {
    name,
    base_url,
    model_name,
    headers,
    is_default: is_default,
  };
  if (api_key) update.api_key_enc = encrypt(api_key);
  const { error } = await service.from("model_providers").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message } as const;
  revalidatePath("/settings");
  revalidatePath("/chatbot");
  return { ok: true } as const;
}

export async function deleteProviderAction(id: string) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const service = getServiceSupabase();
  await service.from("model_providers").delete().eq("id", id);
  revalidatePath("/settings");
  return { ok: true } as const;
}

export async function setDefaultProviderAction(id: string) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;
  const service = getServiceSupabase();
  await service.from("model_providers").update({ is_default: false }).eq("user_id", user.id);
  await service.from("model_providers").update({ is_default: true }).eq("id", id);
  revalidatePath("/settings");
  return { ok: true } as const;
}

export async function testProviderAction(id: string) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const service = getServiceSupabase();
  const { data } = await service
    .from("model_providers")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) return { ok: false, error: "Not found." } as const;
  const apiKey = decrypt(data.api_key_enc);
  const { testProviderConnection } = await import("@/lib/providers/validate");
  return testProviderConnection({
    base_url: data.base_url,
    model_name: data.model_name,
    api_key: apiKey,
    headers: (data.headers as Record<string, string>) ?? {},
  });
}

/**
 * Upserts a local LLM provider from env vars (if present).
 * LOCAL_LLM_BASE_URL, LOCAL_LLM_API_KEY, LOCAL_LLM_MODEL, LOCAL_LLM_NAME
 */
export async function ensureEnvProviderAction() {
  const base_url = process.env.LOCAL_LLM_BASE_URL?.trim();
  const api_key = process.env.LOCAL_LLM_API_KEY?.trim();
  const model_name = process.env.LOCAL_LLM_MODEL?.trim() || "local-model";
  const name = process.env.LOCAL_LLM_NAME?.trim() || "Local LLM";
  if (!base_url || !api_key) {
    return { ok: false, error: "LOCAL_LLM_* env vars not set." } as const;
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const service = getServiceSupabase();
  const { data: existing } = await service
    .from("model_providers")
    .select("id")
    .eq("user_id", user.id)
    .eq("base_url", base_url)
    .maybeSingle();

  if (existing) {
    await service
      .from("model_providers")
      .update({
        name,
        model_name,
        api_key_enc: encrypt(api_key),
        is_default: true,
      })
      .eq("id", existing.id);
    await service
      .from("model_providers")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .neq("id", existing.id);
  } else {
    await service.from("model_providers").update({ is_default: false }).eq("user_id", user.id);
    await service.from("model_providers").insert({
      user_id: user.id,
      name,
      base_url,
      api_key_enc: encrypt(api_key),
      model_name,
      headers: {},
      is_default: true,
    });
  }
  revalidatePath("/settings");
  revalidatePath("/chatbot");
  return { ok: true } as const;
}

export async function listProvidersPublic(): Promise<ModelProviderPublic[]> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("model_providers")
    .select("*")
    .order("created_at");
  return ((data ?? []) as any[]).map((p) => ({
    id: p.id,
    user_id: p.user_id,
    name: p.name,
    base_url: p.base_url,
    model_name: p.model_name,
    headers: p.headers ?? {},
    is_default: p.is_default,
    has_key: !!p.api_key_enc,
    created_at: p.created_at,
  }));
}

function parseHeaders(raw: unknown): Record<string, string> {
  const s = String(raw ?? "").trim();
  if (!s) return {};
  try {
    const obj = JSON.parse(s);
    if (obj && typeof obj === "object") return obj as Record<string, string>;
  } catch {
    // ignore
  }
  return {};
}

/**
 * Register the Telegram webhook so the bot can receive messages.
 * Requires NEXT_PUBLIC_APP_URL to be set.
 */
export async function setupTelegramWebhookAction() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const { data: settings } = await supabase
    .from("app_settings")
    .select("telegram_bot_token_enc")
    .eq("user_id", user.id)
    .single();

  const token = decrypt(settings?.telegram_bot_token_enc ?? null);
  if (!token) {
    return { ok: false, error: "No Telegram bot token configured. Save it first." } as const;
  }

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return { ok: false, error: "APP_URL is not set in environment." } as const;
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;

  // Telegram requires HTTPS for webhooks
  if (!webhookUrl.startsWith("https://")) {
    return {
      ok: false,
      error: `Telegram requires an HTTPS URL for webhooks. Your NEXT_PUBLIC_APP_URL is "${appUrl}". For local dev, use ngrok: ngrok http 3000, then set NEXT_PUBLIC_APP_URL to the ngrok HTTPS URL.`,
    } as const;
  }
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";

  try {
    // Remove existing webhook
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);

    // Set new webhook
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret || undefined,
        allowed_updates: ["message"],
      }),
    });
    const json = await res.json();
    if (!json.ok) {
      return { ok: false, error: json.description ?? "Telegram API error" } as const;
    }
    return { ok: true, webhookUrl } as const;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    } as const;
  }
}

// ─── Google Drive ───────────────────────────────────────────────────────────

import { getGoogleOAuthConfig, getStoredTokens, clearTokens } from "@/lib/google-drive/tokens";

export async function getGoogleDriveStatusAction() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { connected: false, email: null, error: null };

  const tokens = await getStoredTokens(user.id);
  return {
    connected: !!tokens,
    email: tokens?.userEmail ?? null,
    error: null,
  };
}

export async function getGoogleDriveAuthUrlAction() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { url: null, error: "Not signed in" };

  const config = getGoogleOAuthConfig();
  if (!config.clientId) {
    return { url: null, error: "GOOGLE_CLIENT_ID not configured. Add it to .env.local." };
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`,
    response_type: "code",
    scope: config.scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: user.id,
  });

  return { url: `${config.authUrl}?${params}`, error: null };
}

export async function disconnectGoogleDriveAction() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  await clearTokens(user.id);
  revalidatePath("/settings");
  return { ok: true } as const;
}
