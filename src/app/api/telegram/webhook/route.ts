/**
 * Telegram webhook endpoint.
 * Receives messages from Telegram, processes them through the AI assistant,
 * and sends the response back via Telegram.
 *
 * Set up via: POST /api/telegram/webhook/setup (registers webhook with Telegram)
 * Or manually: set webhook URL to https://your-domain.com/api/telegram/webhook
 * with secret: process.env.TELEGRAM_WEBHOOK_SECRET
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
 * GET /api/telegram/webhook — health check
 */
export async function GET() {
  return NextResponse.json({ ok: true, message: "Briefly Telegram webhook is active" });
}

async function getBotToken(service: ReturnType<typeof getServiceSupabase>, userId?: string): Promise<string | null> {
  if (!userId) {
    // Try to find any bot token in settings
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
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => {});
}

async function sendTypingAction(botToken: string, chatId: number) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  }).catch(() => {});
}

/**
 * POST /api/telegram/webhook — receives Telegram updates
 */
export async function POST(req: NextRequest) {
  // Verify secret token if configured
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const token = req.headers.get("x-telegram-bot-api-secret-token");
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const update: TelegramUpdate = await req.json().catch(() => null);
  if (!update?.message?.text) {
    return NextResponse.json({ ok: true });
  }

  const msg = update.message!;
  const chatId = msg.chat.id;
  const text = msg.text!.trim();
  if (!text) return NextResponse.json({ ok: true });

  // Ignore commands (handled separately if needed)
  if (text.startsWith("/")) {
    return NextResponse.json({ ok: true });
  }

  const service = getServiceSupabase();

  // Find the user by their telegram_chat_id
  const { data: settings } = await service
    .from("app_settings")
    .select("user_id, owner_name")
    .eq("telegram_chat_id", String(chatId))
    .single();

  if (!settings) {
    // No user linked to this chat — try to send a helpful message
    const botToken = await getBotToken(service);
    if (botToken) {
      await sendRawMessage(
        botToken,
        chatId,
        "This Telegram account is not linked to any Briefly workspace. Open Briefly \u2192 Settings \u2192 Telegram and save your Chat ID to connect."
      );
    }
    return NextResponse.json({ ok: true });
  }

  const userId = settings.user_id;

  // Send "typing" indicator
  const botToken = await getBotToken(service, userId);
  if (botToken) {
    await sendTypingAction(botToken, chatId);
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
  const result = await processChatMessage(userId, text, history);

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

  if (!sendResult.ok) {
    console.error("[telegram] Failed to send reply:", sendResult.error);
  }

  return NextResponse.json({ ok: true });
}
