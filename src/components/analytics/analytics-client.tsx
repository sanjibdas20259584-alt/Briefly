"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { AnalyticsData, AnalyticsRange } from "@/lib/queries/analytics";
import { cn } from "@/lib/utils";

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
];

const PIE_COLORS = ["#10b981", "#f59e0b", "#78716c", "#ef4444", "#3b82f6", "#a855f7"];

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function AnalyticsClient({ data }: { data: AnalyticsData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const range = (searchParams.get("range") as AnalyticsRange) || data.range || "30d";

  function setRange(r: AnalyticsRange) {
    router.push(`/analytics?range=${r}`);
  }

  const stats = [
    { label: "Revenue (period)", value: money(data.totalRevenue) },
    { label: "Outstanding", value: money(data.outstanding) },
    { label: "Avg paid invoice", value: money(data.avgInvoiceValue) },
    { label: "Utilization", value: `${data.utilization}%` },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Revenue, pipeline, and project health at a glance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={cn(
                "h-9 rounded-lg border px-3 text-sm font-medium transition-colors",
                range === r.value
                  ? "border-accent bg-accent-subtle text-accent-hover"
                  : "border-surface-border bg-surface-raised text-ink-soft hover:text-ink"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-sm text-ink-soft">{s.label}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Monthly revenue" description="Paid invoices in period" />
          <CardBody className="h-72">
            {data.monthlyRevenue.length === 0 ? (
              <EmptyChart label="No paid invoices in this range" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--fg-muted)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "var(--fg-muted)", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => money(v)}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Invoice status" description="Distribution in period" />
          <CardBody className="h-72">
            {data.invoicesByStatus.length === 0 ? (
              <EmptyChart label="No invoices in this range" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.invoicesByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ status, count }) => `${status} (${count})`}
                  >
                    {data.invoicesByStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Projects by status" description="All projects" />
          <CardBody className="h-72">
            {data.projectsByStatus.length === 0 ? (
              <EmptyChart label="No projects yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.projectsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="status" tick={{ fill: "var(--fg-muted)", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--fg-muted)", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="#059669" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Active project progress"
            description="Checklist / progress % on open work"
          />
          <CardBody className="h-72">
            {data.projectProgress.length === 0 ? (
              <EmptyChart label="No active projects" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.projectProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="title"
                    tick={{ fill: "var(--fg-muted)", fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis domain={[0, 100]} tick={{ fill: "var(--fg-muted)", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => `${v}%`}
                  />
                  <Line
                    type="monotone"
                    dataKey="progress"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#10b981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat label="Clients" value={String(data.totalClients)} />
        <MiniStat label="Active projects" value={String(data.activeProjects)} />
        <MiniStat label="Completed projects" value={String(data.completedProjects)} />
        <MiniStat
          label="Invoices (period)"
          value={`${data.paidInvoices} paid / ${data.totalInvoices}`}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-sm text-ink-soft">Win rate</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{data.winRate}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-ink-soft">Avg project value</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{money(data.avgProjectValue)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-ink-soft">Client lifetime value</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {data.clientLifetimeValue.length > 0 ? money(data.clientLifetimeValue[0].value) : "—"}
          </p>
          {data.clientLifetimeValue.length > 0 && (
            <p className="mt-1 text-xs text-ink-soft">
              Top: {data.clientLifetimeValue[0].client}
            </p>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Revenue by client" description="Paid invoices in period" />
        <CardBody className="h-72">
          {data.revenueByClient.length === 0 ? (
            <EmptyChart label="No paid invoices with clients in this range" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByClient}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="client" tick={{ fill: "var(--fg-muted)", fontSize: 12 }} />
                <YAxis tick={{ fill: "var(--fg-muted)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                  formatter={(v: number) => money(v)}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-ink-soft">
      {label}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </Card>
  );
}
