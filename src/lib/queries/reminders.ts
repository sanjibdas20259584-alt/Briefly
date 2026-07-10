import { getServerSupabase } from "@/lib/supabase/server";
import type { Reminder, TelegramDeliveryLog, Client, Project, Invoice, Proposal } from "@/lib/types";

export async function listReminders(): Promise<Reminder[]> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("reminders")
    .select("*")
    .order("due_at", { ascending: true })
    .limit(200);
  return (data ?? []) as Reminder[];
}

export async function getReminderContext() {
  const supabase = await getServerSupabase();
  const [clients, projects, invoices, proposals, logs] = await Promise.all([
    supabase.from("clients").select("id,name").order("name"),
    supabase.from("projects").select("id,title").order("title"),
    supabase.from("invoices").select("id,invoice_number").order("invoice_number"),
    supabase.from("proposals").select("id,title").order("title"),
    supabase
      .from("telegram_delivery_logs")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(20),
  ]);
  return {
    clients: (clients.data ?? []) as Pick<Client, "id" | "name">[],
    projects: (projects.data ?? []) as Pick<Project, "id" | "title">[],
    invoices: (invoices.data ?? []) as Pick<Invoice, "id" | "invoice_number">[],
    proposals: (proposals.data ?? []) as Pick<Proposal, "id" | "title">[],
    logs: (logs.data ?? []) as TelegramDeliveryLog[],
  };
}
