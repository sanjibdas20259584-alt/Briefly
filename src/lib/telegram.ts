// Server-only Telegram delivery. Token + chat id are decrypted from settings.
import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service";
import { decrypt } from "@/lib/crypto";

export interface TelegramResult {
  ok: boolean;
  error?: string;
}

export async function sendTelegramMessage(
  userId: string,
  message: string
): Promise<TelegramResult> {
  const supabase = getServiceSupabase();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("telegram_bot_token_enc, telegram_chat_id")
    .eq("user_id", userId)
    .single();

  const token = decrypt(settings?.telegram_bot_token_enc ?? null);
  const chatId = settings?.telegram_chat_id ?? null;

  if (!token || !chatId) {
    return { ok: false, error: "Telegram not configured." };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
      }
    );
    const json = await res.json();
    if (!json.ok) return { ok: false, error: json.description ?? "Telegram error" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

export async function logTelegramDelivery(
  userId: string,
  opts: {
    reminderId?: string | null;
    chatId?: string | null;
    message: string;
    status: "sent" | "failed";
    error?: string | null;
  }
) {
  const supabase = getServiceSupabase();
  await supabase.from("telegram_delivery_logs").insert({
    user_id: userId,
    reminder_id: opts.reminderId ?? null,
    chat_id: opts.chatId ?? null,
    message: opts.message,
    status: opts.status,
    error: opts.error ?? null,
  });
}
