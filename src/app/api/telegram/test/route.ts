import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { sendTelegramMessage, logTelegramDelivery } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const message =
    "✅ <b>Briefly test</b>\nTelegram reminders are connected, Sanjib. You'll get pings here.";
  const res = await sendTelegramMessage(user.id, message);
  await logTelegramDelivery(user.id, {
    message,
    status: res.ok ? "sent" : "failed",
    error: res.error ?? null,
  });
  if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: 400 });
  return Response.json({ ok: true });
}
