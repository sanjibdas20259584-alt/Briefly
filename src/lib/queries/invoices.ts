import { getServerSupabase } from "@/lib/supabase/server";
import type {
  Invoice,
  InvoiceItem,
  Client,
  Project,
} from "@/lib/types";

export async function listInvoices(status?: string): Promise<Invoice[]> {
  const supabase = await getServerSupabase();
  let q = supabase
    .from("invoices")
    .select("*")
    .order("issue_date", { ascending: false })
    .limit(300);
  if (status && status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as Invoice[];
}

export async function getInvoiceDetail(id: string) {
  const supabase = await getServerSupabase();
  const [invRes, itemsRes, clientsRes] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).single<Invoice>(),
    supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("position"),
    supabase.from("clients").select("id,name,email,company").order("name"),
  ]);
  let client: Client | null = null;
  if (invRes.data?.client_id) {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("id", invRes.data.client_id)
      .single<Client>();
    client = data;
  }
  return {
    invoice: invRes.data as Invoice | null,
    items: (itemsRes.data ?? []) as InvoiceItem[],
    clients: (clientsRes.data ?? []) as Client[],
    client,
    error: invRes.error?.message ?? null,
  };
}

export type { Project };
