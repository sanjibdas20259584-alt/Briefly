"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type {
  ProjectTemplate,
  ProjectStatus,
  ProjectPriority,
  ChecklistItem,
  Milestone,
} from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TemplateInput {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  checklist?: ChecklistItem[];
  milestones?: Milestone[];
}

export async function createTemplateAction(prevState: unknown, fd: FormData) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const input: TemplateInput = {
    name: String(fd.get("name") ?? "").trim(),
    description: String(fd.get("description") ?? "").trim() || null,
    status: (String(fd.get("status") ?? "idea") as ProjectStatus) || "idea",
    priority: (String(fd.get("priority") ?? "medium") as ProjectPriority) || "medium",
    checklist: JSON.parse(String(fd.get("checklist") ?? "[]")),
    milestones: JSON.parse(String(fd.get("milestones") ?? "[]")),
  };
  if (!input.name) return { ok: false, error: "Name is required." } as const;

  const { data, error } = await supabase
    .from("project_templates")
    .insert({ ...input, user_id: user.id })
    .select()
    .single<ProjectTemplate>();
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath("/projects/templates");
  revalidatePath("/projects");
  return { ok: true, id: data.id } as const;
}

export async function updateTemplateAction(
  id: string,
  prevState: unknown,
  fd: FormData
) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;

  const input: Partial<TemplateInput> = {
    name: String(fd.get("name") ?? "").trim(),
    description: String(fd.get("description") ?? "").trim() || null,
    status: (String(fd.get("status") ?? "idea") as ProjectStatus) || "idea",
    priority: (String(fd.get("priority") ?? "medium") as ProjectPriority) || "medium",
    checklist: JSON.parse(String(fd.get("checklist") ?? "[]")),
    milestones: JSON.parse(String(fd.get("milestones") ?? "[]")),
  };
  if (!input.name) return { ok: false, error: "Name is required." } as const;

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("project_templates")
    .update(input)
    .eq("id", id);
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath("/projects/templates");
  revalidatePath("/projects");
  return { ok: true } as const;
}

export async function deleteTemplateAction(id: string) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("project_templates").delete().eq("id", id);
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath("/projects/templates");
  revalidatePath("/projects");
  return { ok: true } as const;
}

export async function listTemplates(): Promise<ProjectTemplate[]> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("project_templates")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as ProjectTemplate[];
}

export async function createProjectFromTemplate(templateId: string) {
  if (!UUID_RE.test(templateId))
    return { ok: false, error: "Invalid template id." } as const;

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const { data: template, error: tplErr } = await supabase
    .from("project_templates")
    .select("*")
    .eq("id", templateId)
    .single<ProjectTemplate>();
  if (tplErr || !template)
    return { ok: false, error: "Template not found." } as const;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title: template.name,
      description: template.description,
      status: template.status,
      priority: template.priority,
      checklist: template.checklist,
      milestones: template.milestones,
      template_id: templateId,
    })
    .select()
    .single();
  if (error) return { ok: false, error: error.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "create",
    p_entity_type: "project",
    p_entity_id: data.id,
    p_summary: `Created project from template "${template.name}"`,
  });

  revalidatePath("/projects");
  return { ok: true, id: data.id } as const;
}
