import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  FolderKanban,
  FileText,
  Bell,
  Plus,
  ArrowRight,
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
    getRecentActivity(7),
  ]);

  const StatCard = ({
    label,
    value,
    sub,
    icon: Icon,
    href,
  }: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
  }) => (
    <Link href={href}>
      <Card hoverable className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-soft">{label}</span>
          <Icon className="h-4 w-4 text-ink-muted" />
        </div>
        <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
        {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
      </Card>
    </Link>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">
          Welcome back, {ownerName}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Here&#39;s what needs your attention today.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
          sub={`${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(stats.unpaidAmount)} outstanding`}
          icon={FileText}
          href="/invoices"
        />
        <StatCard
          label="Upcoming reminders"
          value={stats.upcomingReminders}
          icon={Bell}
          href="/reminders"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between border-b border-surface-border p-5">
              <h2 className="text-base font-semibold text-ink">Recent activity</h2>
              <Link
                href="/activity"
                className="flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-ink"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <CardBody className="space-y-1 p-2">
              {activity.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-ink-soft">
                  No activity yet. Create a client or project to get started.
                </p>
              ) : (
                activity.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-lg px-4 py-2.5 hover:bg-surface"
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
                      {formatDateTime(a.created_at, "").replace(
                        /,.*/,
                        ""
                      )}
                    </span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        <div>
          <Card>
            <div className="border-b border-surface-border p-5">
              <h2 className="text-base font-semibold text-ink">Quick actions</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Start something new, {ownerName}.
              </p>
            </div>
            <CardBody className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map((qa) => {
                const Icon = qa.icon;
                return (
                  <Link key={qa.href} href={qa.href}>
                    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface p-4 text-center transition-colors hover:border-accent/40 hover:bg-accent-subtle">
                      <Icon className="h-5 w-5 text-accent-hover" />
                      <span className="text-sm font-medium text-ink">
                        New {qa.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/clients">
          <Button variant="secondary" size="sm">
            Go to clients
          </Button>
        </Link>
        <Link href="/reminders">
          <Button variant="secondary" size="sm">
            Manage reminders
          </Button>
        </Link>
      </div>
    </div>
  );
}
