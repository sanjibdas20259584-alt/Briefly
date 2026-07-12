"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type { CalendarEvent } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CalendarEventInput {
  title: string;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  all_day: boolean;
  color: string;
  reminder: boolean;
  client_id?: string | null;
  project_id?: string | null;
}

export async function createCalendarEventAction(
  prevState: unknown,
  fd: FormData
) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const input: CalendarEventInput = {
    title: String(fd.get("title") ?? "").trim(),
    description: String(fd.get("description") ?? "") || null,
    start_time: String(fd.get("start_time") ?? ""),
    end_time: String(fd.get("end_time") ?? "") || null,
    all_day: fd.get("all_day") === "on",
    color: String(fd.get("color") ?? "#10b981"),
    reminder: fd.get("reminder") !== "off",
    client_id: String(fd.get("client_id") ?? "") || null,
    project_id: String(fd.get("project_id") ?? "") || null,
  };

  if (!input.title) return { ok: false, error: "Title is required." } as const;
  if (!input.start_time)
    return { ok: false, error: "Start time is required." } as const;
  if (input.client_id && !UUID_RE.test(input.client_id))
    input.client_id = null;
  if (input.project_id && !UUID_RE.test(input.project_id))
    input.project_id = null;

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({ ...input, user_id: user.id })
    .select()
    .single<CalendarEvent>();
  if (error) return { ok: false, error: error.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "create",
    p_entity_type: "calendar_event",
    p_entity_id: data.id,
    p_summary: `Created calendar event "${input.title}"`,
  });

  revalidatePath("/calendar");
  revalidatePath("/");
  return { ok: true, id: data.id } as const;
}

export async function updateCalendarEventAction(
  id: string,
  prevState: unknown,
  fd: FormData
) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();

  const title = String(fd.get("title") ?? "").trim();
  const description = fd.get("description");
  const start_time = String(fd.get("start_time") ?? "").trim();
  const end_time = fd.get("end_time");
  const all_day = fd.get("all_day") === "on";
  const color = String(fd.get("color") ?? "");
  const reminder = fd.get("reminder") !== "off";
  const client_id = String(fd.get("client_id") ?? "");
  const project_id = String(fd.get("project_id") ?? "");

  const patch: Record<string, unknown> = {};
  if (title) patch.title = title;
  if (description !== null && description !== undefined) {
    patch.description = String(description) || null;
  }
  if (start_time) patch.start_time = start_time;
  if (end_time !== null && end_time !== undefined) {
    patch.end_time = String(end_time) || null;
  }
  patch.all_day = all_day;
  if (color) patch.color = color;
  patch.reminder = reminder;
  patch.client_id = client_id && UUID_RE.test(client_id) ? client_id : null;
  patch.project_id =
    project_id && UUID_RE.test(project_id) ? project_id : null;

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Nothing to update." } as const;
  }

  const { error } = await supabase
    .from("calendar_events")
    .update(patch)
    .eq("id", id);
  if (error) return { ok: false, error: error.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "update",
    p_entity_type: "calendar_event",
    p_entity_id: id,
    p_summary: `Updated calendar event${title ? ` "${title}"` : ""}`,
  });

  revalidatePath("/calendar");
  revalidatePath("/");
  revalidatePath("/activity");
  return { ok: true, id } as const;
}

export async function deleteCalendarEventAction(id: string) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath("/calendar");
  revalidatePath("/activity");
  return { ok: true } as const;
}
