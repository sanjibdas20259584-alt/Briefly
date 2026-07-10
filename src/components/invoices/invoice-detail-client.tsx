"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Pencil, Trash2, FileDown, Copy } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { InvoiceFormDialog } from "@/components/invoices/invoice-form-dialog";
import {
  deleteInvoiceAction,
  duplicateInvoiceAction,
  setInvoiceStatusAction,
} from "@/lib/actions/invoices";
import { formatDate, formatMoney } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { Invoice, InvoiceItem, InvoiceStatus } from "@/lib/types";

export function InvoiceDetailClient({
  invoice,
  items,
  clients,
  clientName,
  clientCompany,
  clientEmail,
}: {
  invoice: Invoice;
  items: InvoiceItem[];
  clients: { id: string; name: string }[];
  clientName: string | null;
  clientCompany: string | null;
  clientEmail: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  const initialItems = items.map((i) => ({
    description: i.description ?? "",
    quantity: i.quantity,
    rate: i.rate,
  }));

  function markStatus(s: InvoiceStatus) {
    startTransition(async () => {
      await setInvoiceStatusAction(invoice.id, s);
      router.refresh();
    });
  }
  function onDuplicate() {
    startTransition(async () => {
      const res = await duplicateInvoiceAction(invoice.id);
      if (res.ok && res.id) router.push(`/invoices/${res.id}`);
      else toast(res.error ?? "Failed", "error");
    });
  }
  function onDelete() {
    startTransition(async () => {
      const res = await deleteInvoiceAction(invoice.id);
      if (res.ok) {
        toast("Invoice removed", "success");
        router.push("/invoices");
      } else toast(res.error ?? "Failed", "error");
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-surface"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-ink">{invoice.invoice_number}</h1>
            <p className="text-sm text-ink-soft">
              Issued {formatDate(invoice.issue_date)} · Due {formatDate(invoice.due_date, "—")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/invoices/${invoice.id}/pdf`} target="_blank">
            <button className="flex h-9 items-center gap-1 rounded-lg border border-surface-border bg-surface-raised px-3 text-sm text-ink-soft hover:bg-surface">
              <FileDown className="h-4 w-4" /> PDF
            </button>
          </Link>
          <button
            onClick={onDuplicate}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-surface"
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-surface"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setConfirm(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge tone={invoice.status === "paid" ? "accent" : invoice.status === "overdue" ? "danger" : "neutral"}>
              {invoice.status}
            </Badge>
            <div className="flex gap-2">
              {invoice.status !== "paid" && (
                <button
                  onClick={() => markStatus("paid")}
                  disabled={pending}
                  className="h-9 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-70"
                >
                  Mark paid
                </button>
              )}
              {invoice.status === "draft" && (
                <button
                  onClick={() => markStatus("sent")}
                  disabled={pending}
                  className="h-9 rounded-lg border border-surface-border bg-surface-raised px-4 text-sm font-medium text-ink hover:bg-surface disabled:opacity-70"
                >
                  Mark sent
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase text-ink-soft">Bill to</p>
              <p className="mt-1 font-medium text-ink">{clientName ?? "—"}</p>
              {clientCompany && <p className="text-ink-soft">{clientCompany}</p>}
              {clientEmail && <p className="text-ink-soft">{clientEmail}</p>}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-surface-border">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase text-ink-soft">
                <tr>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Rate</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-surface-border">
                    <td className="p-3 text-ink">{it.description ?? "—"}</td>
                    <td className="p-3 text-right text-ink-soft">{it.quantity}</td>
                    <td className="p-3 text-right text-ink-soft">{formatMoney(it.rate)}</td>
                    <td className="p-3 text-right text-ink">{formatMoney(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-60 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Subtotal</span>
                <span className="text-ink">{formatMoney(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Tax</span>
                <span className="text-ink">{formatMoney(invoice.tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Discount</span>
                <span className="text-ink">{formatMoney(invoice.discount)}</span>
              </div>
              <div className="flex justify-between border-t border-surface-border pt-2 font-semibold text-ink">
                <span>Total</span>
                <span className="text-accent-hover">{formatMoney(invoice.total)}</span>
              </div>
            </div>
          </div>

          {invoice.payment_notes && (
            <div className="rounded-xl bg-surface p-4 text-sm text-ink-soft">
              <p className="mb-1 text-xs uppercase text-ink-soft">Payment notes</p>
              <p className="whitespace-pre-wrap">{invoice.payment_notes}</p>
            </div>
          )}
        </CardBody>
      </Card>

      <InvoiceFormDialog
        open={open}
        onClose={() => setOpen(false)}
        clients={clients}
        initial={invoice}
        initialItems={initialItems}
      />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={onDelete}
        title="Delete invoice?"
        message={`This permanently removes ${invoice.invoice_number}.`}
        confirmLabel="Delete invoice"
        loading={pending}
      />
    </div>
  );
}
