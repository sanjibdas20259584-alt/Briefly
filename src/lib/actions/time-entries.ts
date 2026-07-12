"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type { TimeEntry } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TimeEntryInput {
  project_id?: string | null;
  task?: string | null;
  description?: string | null;
  started_at: string;
  ended_at?: string | null;
  duration?: number | null;
  billable?: boolean;
  rate?: number | null;
}

export async function createTimeEntryAction(prevState: unknown, fd: FormData) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  let projectId = String(fd.get("project_id") ?? "") || null;
  if (projectId && !UUID_RE.test(projectId)) projectId = null;

  const startedAt = String(fd.get("started_at") ?? "");
  if (!startedAt) return { ok: false, error: "Start time is required." } as const;

  const endedAt = String(fd.get("ended_at") ?? "") || null;

  let duration: number | null = null;
  if (endedAt && startedAt) {
    duration = Math.round(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
    );
    if (duration < 0) duration = null;
  }
  const durationField = fd.get("duration");
  if (durationField) {
    const mins = Number(durationField);
    if (!isNaN(mins) && mins > 0) duration = mins * 60;
  }

  const input: TimeEntryInput = {
    project_id: projectId,
    task: String(fd.get("task") ?? "").trim() || null,
    description: String(fd.get("description") ?? "").trim() || null,
    started_at: startedAt,
    ended_at: endedAt,
    duration,
    billable: fd.get("billable") !== "off",
    rate: Number(fd.get("rate")) || null,
  };

  const { data, error } = await supabase
    .from("time_entries")
    .insert({ ...input, user_id: user.id })
    .select()
    .single<TimeEntry>();
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  return { ok: true, id: data.id } as const;
}

export async function startTimeEntryAction(
  projectId: string | null,
  task: string | null
) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  if (projectId && !UUID_RE.test(projectId)) projectId = null;

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      user_id: user.id,
      project_id: projectId,
      task: task || null,
      started_at: new Date().toISOString(),
      billable: true,
    })
    .select()
    .single<TimeEntry>();
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  return { ok: true, id: data.id } as const;
}

export async function stopTimeEntryAction(id: string) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();

  const { data: existing, error: fetchErr } = await supabase
    .from("time_entries")
    .select("project_id,started_at")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) return { ok: false, error: "Entry not found." } as const;

  const endedAt = new Date().toISOString();
  const duration = Math.round(
    (new Date(endedAt).getTime() - new Date(existing.started_at).getTime()) / 1000
  );

  const { error } = await supabase
    .from("time_entries")
    .update({ ended_at: endedAt, duration })
    .eq("id", id);
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath("/projects");
  if (existing.project_id) revalidatePath(`/projects/${existing.project_id}`);
  return { ok: true } as const;
}

export async function updateTimeEntryAction(
  id: string,
  prevState: unknown,
  fd: FormData
) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;

  let projectId = String(fd.get("project_id") ?? "") || null;
  if (projectId && !UUID_RE.test(projectId)) projectId = null;

  const input: Partial<TimeEntryInput> = {
    project_id: projectId,
    task: String(fd.get("task") ?? "").trim() || null,
    description: String(fd.get("description") ?? "").trim() || null,
    billable: fd.get("billable") !== "off",
    rate: Number(fd.get("rate")) || null,
  };

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("time_entries").update(input).eq("id", id);
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  return { ok: true } as const;
}

export async function deleteTimeEntryAction(id: string, projectId?: string | null) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("time_entries").delete().eq("id", id);
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  return { ok: true } as const;
}

export async function getTimeEntries(projectId: string) {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .eq("project_id", projectId)
    .order("started_at", { ascending: false });
  return (data ?? []) as TimeEntry[];
}

export async function getActiveTimeEntry() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .single();
  return (data as TimeEntry) ?? null;
}
