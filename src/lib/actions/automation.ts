"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TriggerType =
  | "invoice_overdue"
  | "project_completed"
  | "client_inactive"
  | "reminder_due"
  | "custom";

export type ActionType =
  | "send_telegram"
  | "create_reminder"
  | "update_status"
  | "send_email"
  | "webhook";

export interface AutomationRule {
  id: string;
  user_id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown> | null;
  action_type: ActionType;
  action_config: Record<string, unknown> | null;
  enabled: boolean;
  last_run: string | null;
  created_at: string;
}

export async function listAutomationRules(): Promise<AutomationRule[]> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("automation_rules")
    .select("*")
    .order("created_at", { ascending: false });

  return (data ?? []) as AutomationRule[];
}

export async function createAutomationRule(
  prevState: unknown,
  fd: FormData
) {
  const name = String(fd.get("name") ?? "").trim();
  const trigger_type = String(fd.get("trigger_type") ?? "") as TriggerType;
  const action_type = String(fd.get("action_type") ?? "") as ActionType;

  if (!name) return { ok: false, error: "Name is required." } as const;
  if (!trigger_type) return { ok: false, error: "Trigger type is required." } as const;
  if (!action_type) return { ok: false, error: "Action type is required." } as const;

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const trigger_config = parseJsonConfig(fd.get("trigger_config"));
  const action_config = parseJsonConfig(fd.get("action_config"));

  const { data, error } = await supabase
    .from("automation_rules")
    .insert({
      user_id: user.id,
      name,
      trigger_type,
      trigger_config,
      action_type,
      action_config,
      enabled: true,
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "create",
    p_entity_type: "automation_rule",
    p_entity_id: data.id,
    p_summary: `Created automation rule "${name}"`,
  });

  revalidatePath("/automation");
  return { ok: true, id: data.id } as const;
}

export async function updateAutomationRule(
  id: string,
  prevState: unknown,
  fd: FormData
) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;

  const name = String(fd.get("name") ?? "").trim();
  const trigger_type = String(fd.get("trigger_type") ?? "") as TriggerType;
  const action_type = String(fd.get("action_type") ?? "") as ActionType;

  if (!name) return { ok: false, error: "Name is required." } as const;
  if (!trigger_type) return { ok: false, error: "Trigger type is required." } as const;
  if (!action_type) return { ok: false, error: "Action type is required." } as const;

  const supabase = await getServerSupabase();
  const trigger_config = parseJsonConfig(fd.get("trigger_config"));
  const action_config = parseJsonConfig(fd.get("action_config"));

  const { error } = await supabase
    .from("automation_rules")
    .update({ name, trigger_type, trigger_config, action_type, action_config })
    .eq("id", id);

  if (error) return { ok: false, error: error.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "update",
    p_entity_type: "automation_rule",
    p_entity_id: id,
    p_summary: `Updated automation rule "${name}"`,
  });

  revalidatePath("/automation");
  return { ok: true } as const;
}

export async function deleteAutomationRule(id: string) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;

  const supabase = await getServerSupabase();
  const { data: rule } = await supabase
    .from("automation_rules")
    .select("name")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("automation_rules").delete().eq("id", id);
  if (error) return { ok: false, error: error.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "delete",
    p_entity_type: "automation_rule",
    p_entity_id: id,
    p_summary: `Deleted automation rule "${rule?.name ?? id}"`,
  });

  revalidatePath("/automation");
  return { ok: true } as const;
}

export async function toggleAutomationRule(id: string, enabled: boolean) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("automation_rules")
    .update({ enabled })
    .eq("id", id);

  if (error) return { ok: false, error: error.message } as const;
  revalidatePath("/automation");
  return { ok: true } as const;
}

function parseJsonConfig(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
