import { getServerSupabase } from "@/lib/supabase/server";

export type AnalyticsRange = "7d" | "30d" | "90d" | "1y";

export interface AnalyticsData {
  range: AnalyticsRange;
  totalRevenue: number;
  outstanding: number;
  avgInvoiceValue: number;
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalClients: number;
  activeProjects: number;
  completedProjects: number;
  totalProjects: number;
  utilization: number;
  monthlyRevenue: { month: string; value: number }[];
  invoicesByStatus: { status: string; count: number }[];
  projectsByStatus: { status: string; count: number }[];
  projectProgress: { title: string; progress: number }[];
}

function rangeToDays(range: AnalyticsRange): number {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  if (range === "1y") return 365;
  return 30;
}

export async function getAnalytics(range: AnalyticsRange = "30d"): Promise<AnalyticsData> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return empty(range);
  }

  const days = rangeToDays(range);
  const start = new Date();
  start.setDate(start.getDate() - days);
  const startISO = start.toISOString();

  const [invoicesRes, allInvoicesRes, projectsRes, clientsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", startISO),
    supabase.from("invoices").select("status,total,paid_at,created_at").eq("user_id", user.id),
    supabase.from("projects").select("*").eq("user_id", user.id),
    supabase.from("clients").select("id,status").eq("user_id", user.id),
  ]);

  const periodInvoices = invoicesRes.data ?? [];
  const allInvoices = allInvoicesRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const clients = clientsRes.data ?? [];

  const paidPeriod = periodInvoices.filter((i) => i.status === "paid");
  const totalRevenue = paidPeriod.reduce((s, i) => s + Number(i.total || 0), 0);

  const outstanding = allInvoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + Number(i.total || 0), 0);

  const avgInvoiceValue =
    paidPeriod.length > 0 ? totalRevenue / paidPeriod.length : 0;

  const monthlyRevenue: Record<string, number> = {};
  paidPeriod.forEach((inv) => {
    const month = (inv.paid_at || inv.created_at || "").slice(0, 7);
    if (!month) return;
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(inv.total || 0);
  });

  const invoicesByStatus: Record<string, number> = {};
  periodInvoices.forEach((i) => {
    invoicesByStatus[i.status] = (invoicesByStatus[i.status] || 0) + 1;
  });

  const projectsByStatus: Record<string, number> = {};
  projects.forEach((p) => {
    projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;
  });

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const totalProjects = projects.length;
  const utilization =
    totalProjects > 0
      ? Math.round(
          (projects.filter((p) => p.status === "active" || p.status === "completed")
            .length /
            totalProjects) *
            100
        )
      : 0;

  const projectProgress = projects
    .filter((p) => p.status === "active" || p.status === "waiting")
    .slice(0, 8)
    .map((p) => ({ title: p.title, progress: Number(p.progress || 0) }));

  return {
    range,
    totalRevenue,
    outstanding,
    avgInvoiceValue,
    totalInvoices: periodInvoices.length,
    paidInvoices: paidPeriod.length,
    overdueInvoices: periodInvoices.filter((i) => i.status === "overdue").length,
    totalClients: clients.length,
    activeProjects,
    completedProjects,
    totalProjects,
    utilization,
    monthlyRevenue: Object.entries(monthlyRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, value })),
    invoicesByStatus: Object.entries(invoicesByStatus).map(([status, count]) => ({
      status,
      count,
    })),
    projectsByStatus: Object.entries(projectsByStatus).map(([status, count]) => ({
      status,
      count,
    })),
    projectProgress,
  };
}

function empty(range: AnalyticsRange): AnalyticsData {
  return {
    range,
    totalRevenue: 0,
    outstanding: 0,
    avgInvoiceValue: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
    totalClients: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalProjects: 0,
    utilization: 0,
    monthlyRevenue: [],
    invoicesByStatus: [],
    projectsByStatus: [],
    projectProgress: [],
  };
}
