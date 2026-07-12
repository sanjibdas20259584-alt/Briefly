import { getServerSupabase } from "@/lib/supabase/server";
import type { Expense, ExpenseCategory } from "@/lib/types";

export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

export interface MonthlyPAndL {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

export interface CategoryBreakdown {
  category: ExpenseCategory;
  total: number;
  count: number;
}

export interface FinanceData {
  summary: FinanceSummary;
  monthlyPAndL: MonthlyPAndL[];
  categoryBreakdown: CategoryBreakdown[];
  recentExpenses: Expense[];
  expenses: Expense[];
  totalExpenseCount: number;
}

export async function getFinanceData(): Promise<FinanceData> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty();

  const [invoicesRes, expensesRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("total,status,paid_at,created_at")
      .eq("user_id", user.id),
    supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(500),
  ]);

  const invoices = invoicesRes.data ?? [];
  const expenses = (expensesRes.data ?? []) as Expense[];

  // Total income = sum of paid invoices
  const totalIncome = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.total || 0), 0);

  // Total expenses
  const totalExpenses = expenses.reduce(
    (s, e) => s + Number(e.amount || 0),
    0
  );

  const netProfit = totalIncome - totalExpenses;
  const profitMargin =
    totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  // Monthly P&L (last 12 months)
  const monthlyIncomeMap: Record<string, number> = {};
  const monthlyExpenseMap: Record<string, number> = {};

  invoices
    .filter((i) => i.status === "paid")
    .forEach((inv) => {
      const month = (inv.paid_at || inv.created_at || "").slice(0, 7);
      if (!month) return;
      monthlyIncomeMap[month] =
        (monthlyIncomeMap[month] || 0) + Number(inv.total || 0);
    });

  expenses.forEach((e) => {
    const month = (e.date || "").slice(0, 7);
    if (!month) return;
    monthlyExpenseMap[month] =
      (monthlyExpenseMap[month] || 0) + Number(e.amount || 0);
  });

  // Merge all months
  const allMonths = new Set([
    ...Object.keys(monthlyIncomeMap),
    ...Object.keys(monthlyExpenseMap),
  ]);
  const monthlyPAndL = Array.from(allMonths)
    .sort()
    .slice(-12)
    .map((month) => {
      const income = monthlyIncomeMap[month] || 0;
      const exp = monthlyExpenseMap[month] || 0;
      return { month, income, expenses: exp, profit: income - exp };
    });

  // Category breakdown
  const catMap: Record<string, { total: number; count: number }> = {};
  expenses.forEach((e) => {
    const cat = e.category || "other";
    if (!catMap[cat]) catMap[cat] = { total: 0, count: 0 };
    catMap[cat].total += Number(e.amount || 0);
    catMap[cat].count += 1;
  });
  const categoryBreakdown = Object.entries(catMap)
    .map(([category, data]) => ({
      category: category as ExpenseCategory,
      ...data,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    summary: { totalIncome, totalExpenses, netProfit, profitMargin },
    monthlyPAndL,
    categoryBreakdown,
    recentExpenses: expenses.slice(0, 10),
    expenses,
    totalExpenseCount: expenses.length,
  };
}

function empty(): FinanceData {
  return {
    summary: {
      totalIncome: 0,
      totalExpenses: 0,
      netProfit: 0,
      profitMargin: 0,
    },
    monthlyPAndL: [],
    categoryBreakdown: [],
    recentExpenses: [],
    expenses: [],
    totalExpenseCount: 0,
  };
}
