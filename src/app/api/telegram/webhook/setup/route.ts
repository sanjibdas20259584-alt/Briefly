/**
 * POST /api/telegram/webhook/setup — register/re-register the Telegram webhook
 * GET /api/telegram/webhook/setup — check webhook status
 */
import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { decrypt } from "@/lib/crypto";

export async function GET() {
  const service = getServiceSupabase();
  const { data: settings } = await service
    .from("app_settings")
    .select("telegram_bot_token_enc")
    .not("telegram_bot_token_enc", "is", null)
    .limit(1)
    .single();

  if (!settings) {
    return NextResponse.json({ ok: false, error: "No bot token configured" });
  }

  const token = decrypt(settings.telegram_bot_token_enc);
  if (!token) {
    return NextResponse.json({ ok: false, error: "Failed to decrypt token" });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const json = await res.json();
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}

export async function POST(req: NextRequest) {
  const service = getServiceSupabase();
  const { data: settings } = await service
    .from("app_settings")
    .select("telegram_bot_token_enc")
    .not("telegram_bot_token_enc", "is", null)
    .limit(1)
    .single();

  if (!settings) {
    return NextResponse.json({ ok: false, error: "No bot token configured" });
  }

  const token = decrypt(settings.telegram_bot_token_enc);
  if (!token) {
    return NextResponse.json({ ok: false, error: "Failed to decrypt token" });
  }

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ ok: false, error: "APP_URL not set" });
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;

  if (!webhookUrl.startsWith("https://")) {
    return NextResponse.json({ ok: false, error: `Must be HTTPS: ${webhookUrl}` });
  }

  try {
    // Delete existing
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);

    // Set new
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message"],
      }),
    });
    const json = await res.json();

    // Verify
    const info = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const infoJson = await info.json();

    return NextResponse.json({
      ok: json.ok,
      webhookUrl,
      setResponse: json,
      webhookInfo: infoJson.ok ? infoJson.result : null,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
