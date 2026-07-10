import { getServerSupabase } from "@/lib/supabase/server";

export interface DashboardStats {
  activeClients: number;
  activeProjects: number;
  unpaidInvoices: number;
  unpaidAmount: number;
  upcomingReminders: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await getServerSupabase();

  const [{ count: activeClients }, { count: activeProjects }, invoicesRes, remindersRes] =
    await Promise.all([
      supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("invoices")
        .select("status,total")
        .in("status", ["sent", "overdue"]),
      supabase
        .from("reminders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .gte("due_at", new Date().toISOString()),
    ]);

  const unpaid = (invoicesRes.data ?? []).filter(
    (i) => i.status === "sent" || i.status === "overdue"
  );
  const unpaidAmount = unpaid.reduce(
    (sum, i) => sum + Number(i.total ?? 0),
    0
  );

  return {
    activeClients: activeClients ?? 0,
    activeProjects: activeProjects ?? 0,
    unpaidInvoices: unpaid.length,
    unpaidAmount,
    upcomingReminders: remindersRes.count ?? 0,
  };
}
