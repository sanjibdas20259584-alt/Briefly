"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { sendTelegramMessage, logTelegramDelivery } from "@/lib/telegram";
import type { Reminder, ReminderRepeat, ReminderRelatedType } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ReminderInput {
  title: string;
  note?: string | null;
  due_at: string;
  repeat: ReminderRepeat;
  related_type?: ReminderRelatedType | null;
  related_id?: string | null;
}

function nextDue(due: Date, repeat: ReminderRepeat): string | null {
  if (repeat === "none") return null;
  const d = new Date(due);
  if (repeat === "daily") d.setDate(d.getDate() + 1);
  else if (repeat === "weekly") d.setDate(d.getDate() + 7);
  else if (repeat === "monthly") d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export async function createReminderAction(prevState: unknown, fd: FormData) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const input: ReminderInput = {
    title: String(fd.get("title") ?? "").trim(),
    note: String(fd.get("note") ?? "") || null,
    due_at: String(fd.get("due_at") ?? ""),
    repeat: (String(fd.get("repeat") ?? "none") as ReminderRepeat) || "none",
    related_type: (String(fd.get("related_type") ?? "") || null) as ReminderRelatedType | null,
    related_id: String(fd.get("related_id") ?? "") || null,
  };
  if (!input.title) return { ok: false, error: "Title is required." } as const;
  if (!input.due_at) return { ok: false, error: "Date & time required." } as const;
  if (input.related_id && !UUID_RE.test(input.related_id)) input.related_id = null;

  const { data, error } = await supabase
    .from("reminders")
    .insert({ ...input, user_id: user.id })
    .select()
    .single<Reminder>();
  if (error) return { ok: false, error: error.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "create",
    p_entity_type: "reminder",
    p_entity_id: data.id,
    p_summary: `Created reminder "${input.title}"`,
  });
  revalidatePath("/reminders");
  revalidatePath("/");
  return { ok: true, id: data.id } as const;
}

export async function updateReminderAction(
  id: string,
  prevState: unknown,
  fd: FormData
) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();

  const title = String(fd.get("title") ?? "").trim();
  const noteRaw = fd.get("note");
  const due_at = String(fd.get("due_at") ?? "").trim();
  const repeat = (String(fd.get("repeat") ?? "") || null) as ReminderRepeat | null;
  const status = (String(fd.get("status") ?? "") || null) as
    | "pending"
    | "done"
    | "skipped"
    | null;

  const patch: Record<string, unknown> = {};
  if (title) patch.title = title;
  if (noteRaw !== null && noteRaw !== undefined) {
    patch.note = String(noteRaw) || null;
  }
  if (due_at) patch.due_at = due_at;
  if (repeat) patch.repeat = repeat;
  if (status) patch.status = status;

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Nothing to update." } as const;
  }

  const { error } = await supabase.from("reminders").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "update",
    p_entity_type: "reminder",
    p_entity_id: id,
    p_summary: `Updated reminder${title ? ` "${title}"` : ""}`,
  });
  revalidatePath("/reminders");
  revalidatePath("/");
  revalidatePath("/activity");
  return { ok: true, id } as const;
}

export async function deleteReminderAction(id: string) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) return { ok: false, error: error.message } as const;
  revalidatePath("/reminders");
  revalidatePath("/activity");
  return { ok: true } as const;
}

export async function sendReminderNowAction(id: string) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const { data: rem } = await supabase
    .from("reminders")
    .select("*")
    .eq("id", id)
    .single<Reminder>();
  if (!rem) return { ok: false, error: "Not found." } as const;

  const message = `🔔 <b>${escapeHtml(rem.title)}</b>${rem.note ? `\n${escapeHtml(rem.note)}` : ""}`;
  const res = await sendTelegramMessage(user.id, message);
  await logTelegramDelivery(user.id, {
    reminderId: id,
    message,
    status: res.ok ? "sent" : "failed",
    error: res.error ?? null,
  });

  if (res.ok) {
    const next = nextDue(new Date(rem.due_at), rem.repeat);
    await supabase
      .from("reminders")
      .update({
        last_sent_at: new Date().toISOString(),
        status: rem.repeat === "none" ? "done" : "pending",
        due_at: next ?? rem.due_at,
      })
      .eq("id", id);
    revalidatePath("/reminders");
    return { ok: true } as const;
  }
  revalidatePath("/reminders");
  return { ok: false, error: res.error } as const;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
