/**
 * Telegram webhook endpoint.
 * Receives messages from Telegram, processes them through the AI assistant,
 * and sends the response back via Telegram.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { decrypt } from "@/lib/crypto";
import { sendTelegramMessage, logTelegramDelivery } from "@/lib/telegram";
import { processChatMessage } from "@/lib/chat/processor";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name?: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
}

/**
 * GET /api/telegram/webhook — health check + webhook status
 */
export async function GET(req: NextRequest) {
  const service = getServiceSupabase();

  // Find any user with a bot token configured
  const { data: settings } = await service
    .from("app_settings")
    .select("user_id, telegram_bot_token_enc, telegram_chat_id")
    .not("telegram_bot_token_enc", "is", null)
    .limit(1)
    .single();

  if (!settings) {
    return NextResponse.json({
      ok: false,
      message: "No Telegram bot token configured in any user's settings.",
    });
  }

  const botToken = decrypt(settings.telegram_bot_token_enc);
  if (!botToken) {
    return NextResponse.json({ ok: false, message: "Failed to decrypt bot token." });
  }

  // Check current webhook with Telegram
  let webhookInfo: any = null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const json = await res.json();
    webhookInfo = json.ok ? json.result : null;
  } catch (e) {
    return NextResponse.json({ ok: false, message: `Failed to check webhook: ${e}` });
  }

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const expectedUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;

  return NextResponse.json({
    ok: true,
    chatId: settings.telegram_chat_id,
    webhookUrl: webhookInfo?.url ?? "none",
    expectedUrl,
    isCorrect: webhookInfo?.url === expectedUrl,
    pendingUpdates: webhookInfo?.pending_update_count ?? 0,
    lastError: webhookInfo?.last_error_message ?? null,
  });
}

async function getBotToken(service: ReturnType<typeof getServiceSupabase>, userId?: string): Promise<string | null> {
  if (!userId) {
    const { data } = await service
      .from("app_settings")
      .select("telegram_bot_token_enc")
      .not("telegram_bot_token_enc", "is", null)
      .limit(1)
      .single();
    return decrypt(data?.telegram_bot_token_enc ?? null);
  }
  const { data } = await service
    .from("app_settings")
    .select("telegram_bot_token_enc")
    .eq("user_id", userId)
    .single();
  return decrypt(data?.telegram_bot_token_enc ?? null);
}

async function sendRawMessage(botToken: string, chatId: number, text: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const json = await res.json();
    if (!json.ok) {
      console.error("[telegram] sendRawMessage failed:", json.description);
    }
  } catch (e) {
    console.error("[telegram] sendRawMessage error:", e);
  }
}

async function sendTypingAction(botToken: string, chatId: number) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    });
  } catch {
    // ignore
  }
}

/**
 * POST /api/telegram/webhook — receives Telegram updates
 */
export async function POST(req: NextRequest) {
  console.info("[telegram] Webhook hit at", new Date().toISOString());

  // Verify secret token if configured
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const token = req.headers.get("x-telegram-bot-api-secret-token");
    if (token !== secret) {
      console.error("[telegram] Secret token mismatch");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const update: TelegramUpdate = await req.json().catch((e) => {
    console.error("[telegram] Failed to parse body:", e);
    return null;
  });

  if (!update) {
    return NextResponse.json({ ok: true });
  }

  if (!update.message?.text) {
    console.info("[telegram] Update has no text message, ignoring");
    return NextResponse.json({ ok: true });
  }

  const msg = update.message!;
  const chatId = msg.chat.id;
  const text = msg.text!.trim();
  const fromUser = msg.from;

  console.info("[telegram] Message from chat", chatId, "user", fromUser?.username ?? fromUser?.id, ":", text.slice(0, 100));

  if (!text) return NextResponse.json({ ok: true });

  // Ignore commands
  if (text.startsWith("/")) {
    return NextResponse.json({ ok: true });
  }

  const service = getServiceSupabase();

  // Find the user by their telegram_chat_id
  // Try exact match first, then string match
  let settings: { user_id: string; owner_name: string } | null = null;

  const { data: exactMatch } = await service
    .from("app_settings")
    .select("user_id, owner_name")
    .eq("telegram_chat_id", String(chatId))
    .single();
  settings = exactMatch;

  if (!settings) {
    console.info("[telegram] No user linked to chat", chatId);
    const botToken = await getBotToken(service);
    if (botToken) {
      await sendRawMessage(
        botToken,
        chatId,
        "This Telegram account is not linked to any Briefly workspace. Open Briefly > Settings > Telegram and save your Chat ID to connect."
      );
    }
    return NextResponse.json({ ok: true });
  }

  const userId = settings.user_id;
  console.info("[telegram] Matched user", userId, "(", settings.owner_name, ")");

  // Send "typing" indicator
  const botToken = await getBotToken(service, userId);
  if (botToken) {
    await sendTypingAction(botToken, chatId);
  } else {
    console.error("[telegram] No bot token for user", userId);
    return NextResponse.json({ ok: true });
  }

  // Load recent chat history from DB for context
  const { data: recentMsgs } = await service
    .from("chatbot_messages")
    .select("role, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  const history = (recentMsgs ?? [])
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Process through AI
  console.info("[telegram] Processing message through AI...");
  const result = await processChatMessage(userId, text, history);
  console.info("[telegram] AI result:", "error" in result ? result.error : result.content?.slice(0, 100));

  let replyText: string;
  if ("error" in result) {
    replyText = `Error: ${result.error}`;
  } else {
    replyText = result.content || "Done.";
  }

  // Telegram message limit is 4096 chars
  if (replyText.length > 4000) {
    replyText = replyText.slice(0, 4000) + "\n\n... (truncated)";
  }

  // Send reply via Telegram
  const sendResult = await sendTelegramMessage(userId, replyText);
  console.info("[telegram] Send result:", sendResult.ok ? "success" : sendResult.error);

  // Log delivery
  await logTelegramDelivery(userId, {
    message: replyText,
    status: sendResult.ok ? "sent" : "failed",
    error: sendResult.error ?? null,
  });

  // Save conversation to DB
  await service.from("chatbot_messages").insert([
    { user_id: userId, role: "user", content: text },
    { user_id: userId, role: "assistant", content: replyText },
  ]);

  return NextResponse.json({ ok: true });
}
