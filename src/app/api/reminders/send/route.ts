import { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { sendTelegramMessage, logTelegramDelivery } from "@/lib/telegram";
import { decrypt } from "@/lib/crypto";

// Called by Vercel Cron (/vercel.json) and manually. Iterates due reminders,
// sends them to Telegram, reschedules repeats, and records delivery status.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = getServiceSupabase();
  const { data: due } = await supabase.rpc("due_reminders");

  let sent = 0;
  let failed = 0;

  for (const rem of due ?? []) {
    const message = `🔔 <b>${escapeHtml(rem.title)}</b>${
      rem.note ? `\n${escapeHtml(rem.note)}` : ""
    }`;
    const res = await sendTelegramMessage(rem.user_id, message);
    await logTelegramDelivery(rem.user_id, {
      reminderId: rem.id,
      message,
      status: res.ok ? "sent" : "failed",
      error: res.error ?? null,
    });

    if (res.ok) {
      sent++;
      const next = scheduleNext(rem.due_at, rem.repeat);
      await supabase
        .from("reminders")
        .update({
          last_sent_at: new Date().toISOString(),
          status: rem.repeat === "none" ? "done" : "pending",
          due_at: next ?? rem.due_at,
        })
        .eq("id", rem.id);
    } else {
      failed++;
    }
  }

  return Response.json({ processed: (due ?? []).length, sent, failed });
}

function scheduleNext(due: string, repeat: string): string | null {
  if (repeat === "none") return null;
  const d = new Date(due);
  if (repeat === "daily") d.setDate(d.getDate() + 1);
  if (repeat === "weekly") d.setDate(d.getDate() + 7);
  if (repeat === "monthly") d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
