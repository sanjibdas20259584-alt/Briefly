import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { buildInvoicePdf } from "@/lib/pdf/invoice-pdf";
import type { Invoice, InvoiceItem, Client } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: inv } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single<Invoice>();
  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id)
    .order("position");
  const { data: settings } = await supabase
    .from("app_settings")
    .select("owner_name")
    .eq("user_id", user.id)
    .single();

  let client: Client | null = null;
  if (inv?.client_id) {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("id", inv.client_id)
      .single<Client>();
    client = data;
  }

  if (!inv) return new Response("Not found", { status: 404 });

  const pdf = await buildInvoicePdf({
    invoiceNumber: inv.invoice_number,
    status: inv.status,
    issueDate: inv.issue_date,
    dueDate: inv.due_date,
    clientName: client?.name ?? "Client",
    clientCompany: client?.company,
    clientEmail: client?.email,
    ownerName: settings?.owner_name?.trim() || "Sanjib",
    items: (items ?? []) as InvoiceItem[],
    subtotal: inv.subtotal,
    tax: inv.tax,
    discount: inv.discount,
    total: inv.total,
    paymentNotes: inv.payment_notes,
  });

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${inv.invoice_number}.pdf"`,
    },
  });
}
