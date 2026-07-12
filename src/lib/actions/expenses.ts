"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Expense, ExpenseCategory } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ExpenseDraft {
  client_id?: string | null;
  project_id?: string | null;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  receipt_url?: string | null;
  notes?: string | null;
  currency?: string;
}

export async function createExpenseAction(prevState: unknown, fd: FormData) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const raw = JSON.parse(String(fd.get("payload") ?? "{}")) as ExpenseDraft;
  if (!raw.description?.trim())
    return { ok: false, error: "Description is required." } as const;
  if (!raw.amount || raw.amount <= 0)
    return { ok: false, error: "Amount must be greater than 0." } as const;
  if (raw.client_id && !UUID_RE.test(raw.client_id)) raw.client_id = null;
  if (raw.project_id && !UUID_RE.test(raw.project_id)) raw.project_id = null;

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      user_id: user.id,
      client_id: raw.client_id ?? null,
      project_id: raw.project_id ?? null,
      description: raw.description.trim(),
      amount: raw.amount,
      category: raw.category || "other",
      date: raw.date || new Date().toISOString().slice(0, 10),
      receipt_url: raw.receipt_url ?? null,
      notes: raw.notes ?? null,
      currency: raw.currency || "USD",
    })
    .select()
    .single<Expense>();
  if (error) return { ok: false, error: error.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "create",
    p_entity_type: "expense",
    p_entity_id: data.id,
    p_summary: `Created expense: ${raw.description}`,
  });
  revalidatePath("/finance");
  revalidatePath("/");
  return { ok: true, id: data.id } as const;
}

export async function updateExpenseAction(
  id: string,
  prevState: unknown,
  fd: FormData
) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const raw = JSON.parse(String(fd.get("payload") ?? "{}")) as ExpenseDraft;
  if (!raw.description?.trim())
    return { ok: false, error: "Description is required." } as const;
  if (!raw.amount || raw.amount <= 0)
    return { ok: false, error: "Amount must be greater than 0." } as const;
  if (raw.client_id && !UUID_RE.test(raw.client_id)) raw.client_id = null;
  if (raw.project_id && !UUID_RE.test(raw.project_id)) raw.project_id = null;

  const { error } = await supabase
    .from("expenses")
    .update({
      client_id: raw.client_id ?? null,
      project_id: raw.project_id ?? null,
      description: raw.description.trim(),
      amount: raw.amount,
      category: raw.category || "other",
      date: raw.date || new Date().toISOString().slice(0, 10),
      receipt_url: raw.receipt_url ?? null,
      notes: raw.notes ?? null,
      currency: raw.currency || "USD",
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "update",
    p_entity_type: "expense",
    p_entity_id: id,
    p_summary: `Updated expense: ${raw.description}`,
  });
  revalidatePath("/finance");
  return { ok: true } as const;
}

export async function deleteExpenseAction(id: string) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("expenses")
    .select("description")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message } as const;
  await supabase.rpc("log_activity", {
    p_action: "delete",
    p_entity_type: "expense",
    p_entity_id: id,
    p_summary: `Deleted expense: ${data?.description ?? id}`,
  });
  revalidatePath("/finance");
  revalidatePath("/activity");
  return { ok: true } as const;
}
