"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Legend,
} from "recharts";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ExpenseFormDialog } from "@/components/finance/expense-form-dialog";
import { deleteExpenseAction } from "@/lib/actions/expenses";
import { useToast } from "@/components/ui/toast";
import { formatMoney, formatDate } from "@/lib/utils";
import type { FinanceData } from "@/lib/queries/finance";
import type { Expense, ExpenseCategory } from "@/lib/types";

const PIE_COLORS = [
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#a855f7",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#ec4899",
  "#78716c",
];

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  software: "Software",
  hardware: "Hardware",
  travel: "Travel",
  office: "Office",
  marketing: "Marketing",
  professional: "Professional",
  utilities: "Utilities",
  insurance: "Insurance",
  tax: "Tax",
  other: "Other",
};

const CATEGORY_TONE: Record<
  ExpenseCategory,
  "accent" | "warn" | "danger" | "neutral" | "muted"
> = {
  software: "accent",
  hardware: "warn",
  travel: "neutral",
  office: "muted",
  marketing: "accent",
  professional: "neutral",
  utilities: "muted",
  insurance: "muted",
  tax: "danger",
  other: "muted",
};

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

interface Props {
  data: FinanceData;
  clients: { id: string; name: string }[];
  projects: { id: string; title: string }[];
}

export function FinanceClient({ data, clients, projects }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { summary, monthlyPAndL, categoryBreakdown, recentExpenses } = data;

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteExpenseAction(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if ((result as any).ok) {
      toast("Expense deleted", "success");
      router.refresh();
    } else {
      toast((result as any).error || "Failed to delete", "error");
    }
  }

  const statCards = [
    {
      label: "Total Income",
      value: money(summary.totalIncome),
      color: "text-emerald-600",
    },
    {
      label: "Total Expenses",
      value: money(summary.totalExpenses),
      color: "text-red-600",
    },
    {
      label: "Net Profit",
      value: money(summary.netProfit),
      color: summary.netProfit >= 0 ? "text-emerald-600" : "text-red-600",
    },
    {
      label: "Profit Margin",
      value: `${summary.profitMargin}%`,
      color:
        summary.profitMargin >= 0 ? "text-emerald-600" : "text-red-600",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Finance</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Profit & Loss overview and expense tracking.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingExpense(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> New expense
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-sm text-ink-soft">{s.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${s.color}`}>
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Monthly Income vs Expenses"
            description="Last 12 months"
          />
          <CardBody className="h-72">
            {monthlyPAndL.length === 0 ? (
              <EmptyChart label="No financial data yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyPAndL}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "var(--fg-muted)", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => money(v)}
                  />
                  <Legend />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="#ef4444"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Expenses by Category"
            description="All time breakdown"
          />
          <CardBody className="h-72">
            {categoryBreakdown.length === 0 ? (
              <EmptyChart label="No expenses recorded" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ category, total }) =>
                      `${CATEGORY_LABELS[category as ExpenseCategory] || category}: ${money(total)}`
                    }
                  >
                    {categoryBreakdown.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => money(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Category breakdown table */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader
            title="Category Breakdown"
            description="Expense totals by category"
          />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase text-ink-soft">
                <tr>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Count</th>
                  <th className="p-3 text-right">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.map((cat) => (
                  <tr
                    key={cat.category}
                    className="border-t border-surface-border"
                  >
                    <td className="p-3">
                      <Badge tone={CATEGORY_TONE[cat.category]}>
                        {CATEGORY_LABELS[cat.category] || cat.category}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-medium text-ink">
                      {formatMoney(cat.total)}
                    </td>
                    <td className="p-3 text-right text-ink-soft">
                      {cat.count}
                    </td>
                    <td className="p-3 text-right text-ink-soft">
                      {summary.totalExpenses > 0
                        ? `${Math.round((cat.total / summary.totalExpenses) * 100)}%`
                        : "0%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* Recent expenses */}
      <Card>
        <CardHeader
          title="Recent Expenses"
          description={`${data.totalExpenseCount} total expenses`}
        />
        {recentExpenses.length === 0 ? (
          <CardBody>
            <p className="text-sm text-ink-soft">
              No expenses yet. Click &quot;New expense&quot; to add one.
            </p>
          </CardBody>
        ) : (
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase text-ink-soft">
                <tr>
                  <th className="p-3">Description</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentExpenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="border-t border-surface-border hover:bg-surface"
                  >
                    <td className="p-3 font-medium text-ink">
                      {exp.description}
                    </td>
                    <td className="p-3">
                      <Badge tone={CATEGORY_TONE[exp.category]}>
                        {CATEGORY_LABELS[exp.category] || exp.category}
                      </Badge>
                    </td>
                    <td className="p-3 text-ink-soft">{formatDate(exp.date)}</td>
                    <td className="p-3 text-right font-medium text-ink">
                      {formatMoney(exp.amount)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExpense(exp);
                            setFormOpen(true);
                          }}
                          className="rounded p-1 text-ink-soft transition-colors hover:bg-surface hover:text-ink"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(exp)}
                          className="rounded p-1 text-ink-soft transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        )}
      </Card>

      {/* Form dialog */}
      <ExpenseFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingExpense(null);
        }}
        clients={clients}
        projects={projects}
        initial={editingExpense}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete expense"
        message={`Are you sure you want to delete "${deleteTarget?.description}"? This cannot be undone.`}
        loading={deleting}
      />
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
