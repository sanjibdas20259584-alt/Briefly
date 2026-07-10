import { getServerSupabase } from "@/lib/supabase/server";
import type { ActivityLog } from "@/lib/types";

export async function getRecentActivity(limit = 8): Promise<ActivityLog[]> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ActivityLog[];
}

export const ENTITY_LABEL: Record<string, string> = {
  client: "Client",
  project: "Project",
  invoice: "Invoice",
  proposal: "Proposal",
  reminder: "Reminder",
  provider: "Model",
  settings: "Settings",
  note: "Note",
};
