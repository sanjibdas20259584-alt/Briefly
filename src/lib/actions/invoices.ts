"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { computeTotals, round2 } from "@/lib/totals";
import type { Invoice, InvoiceItem, InvoiceStatus } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface InvoiceDraft {
  client_id?: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date?: string | null;
  tax_rate: number;
  discount: number;
  payment_notes?: string | null;
  items: { description: string; quantity: number; rate: number }[];
}

export async function createInvoiceAction(prevState: unknown, fd: FormData) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const raw = JSON.parse(String(fd.get("payload") ?? "{}")) as InvoiceDraft;
  if (!raw.items || raw.items.length === 0)
    return { ok: false, error: "Add at least one line item." } as const;
  if (raw.client_id && !UUID_RE.test(raw.client_id)) raw.client_id = null;

  const { subtotal, tax, total } = computeTotals(
    raw.items,
    raw.tax_rate,
    raw.discount
  );

  const { data: inv, error } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      client_id: raw.client_id ?? null,
      invoice_number: raw.invoice_number,
      status: raw.status,
      issue_date: raw.issue_date,
      due_date: raw.due_date ?? null,
      tax_rate: raw.tax_rate,
      discount: raw.discount,
      payment_notes: raw.payment_notes ?? null,
      subtotal,
      tax,
      total,
      paid_at: raw.status === "paid" ? new Date().toISOString() : null,
    })
    .select()
    .single<Invoice>();
  if (error) return { ok: false, error: error.message } as const;

  const items = raw.items.map((it, idx) => ({
    invoice_id: inv.id,
    description: it.description || null,
    quantity: it.quantity,
    rate: it.rate,
    subtotal: round2((Number(it.quantity) || 0) * (Number(it.rate) || 0)),
    position: idx,
  }));
  const { error: itemErr } = await supabase.from("invoice_items").insert(items);
  if (itemErr) return { ok: false, error: itemErr.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "create",
    p_entity_type: "invoice",
    p_entity_id: inv.id,
    p_summary: `Created invoice ${raw.invoice_number}`,
  });
  revalidatePath("/invoices");
  revalidatePath("/");
  return { ok: true, id: inv.id } as const;
}

export async function updateInvoiceAction(
  id: string,
  prevState: unknown,
  fd: FormData
) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const raw = JSON.parse(String(fd.get("payload") ?? "{}")) as InvoiceDraft;
  if (raw.client_id && !UUID_RE.test(raw.client_id)) raw.client_id = null;

  const { subtotal, tax, total } = computeTotals(
    raw.items,
    raw.tax_rate,
    raw.discount
  );

  const { error } = await supabase
    .from("invoices")
    .update({
      client_id: raw.client_id ?? null,
      invoice_number: raw.invoice_number,
      status: raw.status,
      issue_date: raw.issue_date,
      due_date: raw.due_date ?? null,
      tax_rate: raw.tax_rate,
      discount: raw.discount,
      payment_notes: raw.payment_notes ?? null,
      subtotal,
      tax,
      total,
      paid_at: raw.status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message } as const;

  await supabase.from("invoice_items").delete().eq("invoice_id", id);
  const items = raw.items.map((it, idx) => ({
    invoice_id: id,
    description: it.description || null,
    quantity: it.quantity,
    rate: it.rate,
    subtotal: round2((Number(it.quantity) || 0) * (Number(it.rate) || 0)),
    position: idx,
  }));
  const { error: itemErr } = await supabase.from("invoice_items").insert(items);
  if (itemErr) return { ok: false, error: itemErr.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "update",
    p_entity_type: "invoice",
    p_entity_id: id,
    p_summary: `Updated invoice ${raw.invoice_number}`,
  });
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/activity");
  return { ok: true } as const;
}

export async function setInvoiceStatusAction(id: string, status: InvoiceStatus) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("invoices")
    .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message } as const;
  await supabase.rpc("log_activity", {
    p_action: "status",
    p_entity_type: "invoice",
    p_entity_id: id,
    p_summary: `Marked invoice ${status}`,
  });
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/activity");
  return { ok: true } as const;
}

export async function deleteInvoiceAction(id: string) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const { data } = await supabase.from("invoices").select("invoice_number").eq("id", id).single();
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) return { ok: false, error: error.message } as const;
  await supabase.rpc("log_activity", {
    p_action: "delete",
    p_entity_type: "invoice",
    p_entity_id: id,
    p_summary: `Removed invoice ${data?.invoice_number ?? id}`,
  });
  revalidatePath("/invoices");
  revalidatePath("/activity");
  return { ok: true } as const;
}

export async function duplicateInvoiceAction(id: string) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).single<Invoice>();
  const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", id).order("position");
  if (!inv) return { ok: false, error: "Not found." } as const;

  const { data: newInv, error } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      client_id: inv.client_id,
      invoice_number: await nextNumber(user.id),
      status: "draft",
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: null,
      tax_rate: inv.tax_rate,
      discount: inv.discount,
      subtotal: inv.subtotal,
      tax: inv.tax,
      total: inv.total,
      payment_notes: inv.payment_notes,
    })
    .select()
    .single<Invoice>();
  if (error) return { ok: false, error: error.message } as const;

  if (items && items.length) {
    await supabase.from("invoice_items").insert(
      items.map((it: InvoiceItem) => ({
        invoice_id: newInv.id,
        description: it.description,
        quantity: it.quantity,
        rate: it.rate,
        subtotal: it.subtotal,
        position: it.position,
      }))
    );
  }
  await supabase.rpc("log_activity", {
    p_action: "create",
    p_entity_type: "invoice",
    p_entity_id: newInv.id,
    p_summary: `Duplicated invoice ${inv.invoice_number}`,
  });
  revalidatePath("/invoices");
  return { ok: true, id: newInv.id } as const;
}

async function nextNumber(userId: string): Promise<string> {
  const supabase = await getServerSupabase();
  const { data } = await supabase.rpc("next_invoice_number", { p_user: userId });
  return String(data);
}
