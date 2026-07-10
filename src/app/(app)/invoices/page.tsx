import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { listInvoices } from "@/lib/queries/invoices";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { InvoicesToolbar } from "@/components/invoices/invoices-toolbar";
import { formatDate, formatMoney } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/lib/types";

const STATUS_TONE: Record<InvoiceStatus, "muted" | "neutral" | "accent" | "warn" | "danger"> = {
  draft: "muted",
  sent: "neutral",
  paid: "accent",
  overdue: "danger",
  cancelled: "muted",
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const [invoices, clientsRes] = await Promise.all([
    listInvoices(sp.status),
    supabase.from("clients").select("id,name").order("name"),
  ]);
  const clients = (clientsRes.data ?? []) as any[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Invoices</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
        </p>
      </div>

      <InvoicesToolbar clients={clients} initialStatus={sp.status} />

      {invoices.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No invoices yet"
          description="Generate an invoice with line items, tax, discount, and a PDF export."
          action={{ label: "New invoice", href: "/invoices?new=1" }}
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase text-ink-soft">
              <tr>
                <th className="p-3">Number</th>
                <th className="p-3">Client</th>
                <th className="p-3">Issued</th>
                <th className="p-3">Due</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-surface-border hover:bg-surface">
                  <td className="p-3">
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-ink hover:text-accent">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="p-3 text-ink-soft">{clientName(clients, inv.client_id)}</td>
                  <td className="p-3 text-ink-soft">{formatDate(inv.issue_date)}</td>
                  <td className="p-3 text-ink-soft">{formatDate(inv.due_date, "—")}</td>
                  <td className="p-3">
                    <Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge>
                  </td>
                  <td className="p-3 text-right font-medium text-ink">{formatMoney(inv.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function clientName(clients: any[], id?: string | null) {
  if (!id) return "—";
  return clients.find((c) => c.id === id)?.name ?? "—";
}
