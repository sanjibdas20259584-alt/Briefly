import { getServerSupabase } from "@/lib/supabase/server";
import type {
  Project,
  Client,
  Invoice,
  Proposal,
  Reminder,
  ChecklistItem,
  Milestone,
} from "@/lib/types";

export async function listProjects(status?: string): Promise<Project[]> {
  const supabase = await getServerSupabase();
  let q = supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (status && status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as Project[];
}

export async function getProjectDetail(id: string) {
  const supabase = await getServerSupabase();
  const [projectRes, clientsRes, invoicesRes, proposalsRes, remindersRes] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single<Project>(),
      supabase.from("clients").select("id,name").order("name"),
      supabase.from("invoices").select("*").eq("client_id", "").limit(0),
      supabase.from("proposals").select("id,title,client_id").order("title"),
      supabase
        .from("reminders")
        .select("*")
        .eq("related_type", "project")
        .eq("related_id", id)
        .order("due_at"),
    ]);

  // Invoices for this project's client
  const cid = projectRes.data?.client_id ?? null;
  const inv = cid
    ? await supabase.from("invoices").select("*").eq("client_id", cid).order("issue_date", { ascending: false })
    : { data: [] as Invoice[] };

  return {
    project: projectRes.data as Project | null,
    clients: (clientsRes.data ?? []) as Pick<Client, "id" | "name">[],
    proposals: (proposalsRes.data ?? []) as Pick<Proposal, "id" | "title" | "client_id">[],
    invoices: (inv.data ?? []) as Invoice[],
    reminders: (remindersRes.data ?? []) as Reminder[],
    error: projectRes.error?.message ?? null,
  };
}

export type { ChecklistItem, Milestone };
