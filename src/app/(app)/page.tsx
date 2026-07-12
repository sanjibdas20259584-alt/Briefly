import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  FolderKanban,
  FileText,
  Bell,
  Plus,
  ArrowRight,
  AlertTriangle,
  Clock,
  TrendingUp,
  Sparkles,
  Calendar,
} from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { getRecentActivity } from "@/lib/queries/activity";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ENTITY_LABEL } from "@/lib/queries/activity";
import { formatDateTime } from "@/lib/utils";

const QUICK_ACTIONS = [
  { href: "/clients?new=1", label: "Client", icon: Users },
  { href: "/projects?new=1", label: "Project", icon: FolderKanban },
  { href: "/invoices?new=1", label: "Invoice", icon: FileText },
  { href: "/proposals?new=1", label: "Proposal", icon: Plus },
];

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function DashboardPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: settings } = await supabase
    .from("app_settings")
    .select("owner_name")
    .eq("user_id", user.id)
    .single();
  const ownerName = settings?.owner_name?.trim() || "Sanjib";

  const [stats, activity] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(8),
  ]);

  const hasData = stats.activeClients > 0 || stats.activeProjects > 0;
  const needsAttention = stats.unpaidInvoices > 0 || stats.upcomingReminders > 0;

  const StatCard = ({
    label,
    value,
    sub,
    icon: Icon,
    href,
    accent,
  }: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    accent?: boolean;
  }) => (
    <Link href={href}>
      <Card hoverable className={`p-4 sm:p-5 ${accent ? "border-accent/30" : ""}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm text-ink-soft">{label}</span>
          <Icon className={`h-4 w-4 ${accent ? "text-accent" : "text-ink-muted"}`} />
        </div>
        <p className="mt-2 text-xl sm:text-2xl font-semibold text-ink">{value}</p>
        {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
      </Card>
    </Link>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-ink">
          Welcome back, {ownerName}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {needsAttention
            ? "You have items that need your attention."
            : hasData
              ? "Here's your business overview."
              : "Let's get your freelancing workspace set up."}
        </p>
      </div>

      {/* Attention Banner */}
      {needsAttention && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Needs attention
              </p>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-amber-700 dark:text-amber-300">
                {stats.unpaidInvoices > 0 && (
                  <Link href="/invoices" className="hover:underline">
                    {stats.unpaidInvoices} unpaid invoice{stats.unpaidInvoices > 1 ? "s" : ""} ({money(stats.unpaidAmount)})
                  </Link>
                )}
                {stats.upcomingReminders > 0 && (
                  <Link href="/reminders" className="hover:underline">
                    {stats.upcomingReminders} upcoming reminder{stats.upcomingReminders > 1 ? "s" : ""}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Active clients"
          value={stats.activeClients}
          icon={Users}
          href="/clients"
        />
        <StatCard
          label="Active projects"
          value={stats.activeProjects}
          icon={FolderKanban}
          href="/projects"
        />
        <StatCard
          label="Unpaid invoices"
          value={stats.unpaidInvoices}
          sub={stats.unpaidAmount > 0 ? `${money(stats.unpaidAmount)} outstanding` : undefined}
          icon={FileText}
          href="/invoices"
          accent={stats.unpaidInvoices > 0}
        />
        <StatCard
          label="Upcoming reminders"
          value={stats.upcomingReminders}
          icon={Bell}
          href="/reminders"
          accent={stats.upcomingReminders > 0}
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-3 sm:px-5 sm:py-4">
              <h2 className="text-sm sm:text-base font-semibold text-ink">Recent activity</h2>
              <Link
                href="/activity"
                className="flex items-center gap-1 text-xs sm:text-sm text-ink-soft transition-colors hover:text-ink"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <CardBody className="p-1 sm:p-2">
              {activity.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <Clock className="h-10 w-10 text-ink-muted empty-state-icon" />
                  <p className="mt-3 text-sm font-medium text-ink">No activity yet</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    Create a client or project to get started.
                  </p>
                  <Link href="/clients?new=1" className="mt-3">
                    <Button size="sm">
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Client
                    </Button>
                  </Link>
                </div>
              ) : (
                activity.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 sm:px-4 active:bg-surface"
                  >
                    <div className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">
                        <span className="font-medium">
                          {ENTITY_LABEL[a.entity_type] ?? a.entity_type}
                        </span>{" "}
                        {a.summary}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-ink-muted">
                      {formatDateTime(a.created_at, "").replace(/,.*/, "")}
                    </span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card>
            <div className="border-b border-surface-border px-4 py-3 sm:px-5 sm:py-4">
              <h2 className="text-sm sm:text-base font-semibold text-ink">Quick actions</h2>
              <p className="mt-1 text-xs sm:text-sm text-ink-soft">
                Start something new.
              </p>
            </div>
            <CardBody className="grid grid-cols-2 gap-2 p-3 sm:gap-3 sm:p-4">
              {QUICK_ACTIONS.map((qa) => {
                const Icon = qa.icon;
                return (
                  <Link key={qa.href} href={qa.href}>
                    <div className="flex h-full flex-col items-center justify-center gap-1.5 rounded-xl border border-surface-border bg-surface p-3 sm:p-4 text-center transition-all active:scale-[0.97] active:bg-accent-subtle hover:border-accent/40 hover:bg-accent-subtle">
                      <Icon className="h-5 w-5 text-accent-hover" />
                      <span className="text-xs sm:text-sm font-medium text-ink">
                        New {qa.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </CardBody>
          </Card>

          {/* Assistant Card */}
          <Card className="mt-4">
            <Link href="/chatbot">
              <CardBody className="flex items-center gap-3 p-4 transition-colors hover:bg-surface active:bg-surface">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">AI Assistant</p>
                  <p className="text-xs text-ink-soft">
                    Ask anything about your business
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted" />
              </CardBody>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
