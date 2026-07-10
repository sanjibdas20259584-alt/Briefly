import { redirect, notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getInvoiceDetail } from "@/lib/queries/invoices";
import { InvoiceDetailClient } from "@/components/invoices/invoice-detail-client";

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { invoice, items, clients, client } = await getInvoiceDetail((await params).id);
  if (!invoice) notFound();

  return (
    <InvoiceDetailClient
      invoice={invoice}
      items={items}
      clients={clients}
      clientName={client?.name ?? null}
      clientCompany={client?.company ?? null}
      clientEmail={client?.email ?? null}
    />
  );
}
