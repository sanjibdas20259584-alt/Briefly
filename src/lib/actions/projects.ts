"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type {
  Project,
  ProjectStatus,
  ProjectPriority,
  ChecklistItem,
  Milestone,
} from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ProjectInput {
  title: string;
  client_id?: string | null;
  description?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  start_date?: string | null;
  due_date?: string | null;
  progress?: number;
  proposal_id?: string | null;
  checklist?: ChecklistItem[];
  milestones?: Milestone[];
}

export async function createProjectAction(prevState: unknown, fd: FormData) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const input: ProjectInput = {
    title: String(fd.get("title") ?? "").trim(),
    client_id: String(fd.get("client_id") ?? "") || null,
    description: String(fd.get("description") ?? "") || null,
    status: (String(fd.get("status") ?? "idea") as ProjectStatus) || "idea",
    priority: (String(fd.get("priority") ?? "medium") as ProjectPriority) || "medium",
    start_date: String(fd.get("start_date") ?? "") || null,
    due_date: String(fd.get("due_date") ?? "") || null,
    progress: Number(fd.get("progress") ?? 0) || 0,
    proposal_id: String(fd.get("proposal_id") ?? "") || null,
    checklist: JSON.parse(String(fd.get("checklist") ?? "[]")),
    milestones: JSON.parse(String(fd.get("milestones") ?? "[]")),
  };
  if (!input.title) return { ok: false, error: "Title is required." } as const;
  if (input.client_id && !UUID_RE.test(input.client_id)) input.client_id = null;
  if (input.proposal_id && !UUID_RE.test(input.proposal_id)) input.proposal_id = null;

  const { data, error } = await supabase
    .from("projects")
    .insert({ ...input, user_id: user.id })
    .select()
    .single<Project>();
  if (error) return { ok: false, error: error.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "create",
    p_entity_type: "project",
    p_entity_id: data.id,
    p_summary: `Created project "${input.title}"`,
  });
  revalidatePath("/projects");
  revalidatePath("/");
  return { ok: true, id: data.id } as const;
}

export async function updateProjectAction(
  id: string,
  prevState: unknown,
  fd: FormData
) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const input: Partial<ProjectInput> = {
    title: String(fd.get("title") ?? "").trim(),
    client_id: String(fd.get("client_id") ?? "") || null,
    description: String(fd.get("description") ?? "") || null,
    status: (String(fd.get("status") ?? "idea") as ProjectStatus) || "idea",
    priority: (String(fd.get("priority") ?? "medium") as ProjectPriority) || "medium",
    start_date: String(fd.get("start_date") ?? "") || null,
    due_date: String(fd.get("due_date") ?? "") || null,
    progress: Number(fd.get("progress") ?? 0) || 0,
    proposal_id: String(fd.get("proposal_id") ?? "") || null,
    checklist: JSON.parse(String(fd.get("checklist") ?? "[]")),
    milestones: JSON.parse(String(fd.get("milestones") ?? "[]")),
  };
  if (!input.title) return { ok: false, error: "Title is required." } as const;
  if (input.client_id && !UUID_RE.test(input.client_id)) input.client_id = null;
  if (input.proposal_id && !UUID_RE.test(input.proposal_id)) input.proposal_id = null;

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("projects").update(input).eq("id", id);
  if (error) return { ok: false, error: error.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "update",
    p_entity_type: "project",
    p_entity_id: id,
    p_summary: `Updated project "${input.title}"`,
  });
  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  revalidatePath("/activity");
  return { ok: true } as const;
}

export async function deleteProjectAction(id: string) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const { data } = await supabase.from("projects").select("title").eq("id", id).single();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return { ok: false, error: error.message } as const;
  await supabase.rpc("log_activity", {
    p_action: "delete",
    p_entity_type: "project",
    p_entity_id: id,
    p_summary: `Removed project "${data?.title ?? id}"`,
  });
  revalidatePath("/projects");
  revalidatePath("/activity");
  return { ok: true } as const;
}
