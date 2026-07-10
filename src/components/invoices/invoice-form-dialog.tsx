"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  createInvoiceAction,
  updateInvoiceAction,
} from "@/lib/actions/invoices";
import { computeTotals } from "@/lib/totals";
import type { Invoice, Client, InvoiceStatus } from "@/lib/types";

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
}
interface Props {
  open: boolean;
  onClose: () => void;
  clients: { id: string; name: string }[];
  initial?: Invoice | null;
  initialItems?: { description: string; quantity: number; rate: number }[];
  initialClientId?: string;
  defaultNumber?: string;
}
interface Result {
  ok: boolean;
  error?: string;
  id?: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function InvoiceFormDialog({
  open,
  onClose,
  clients,
  initial,
  initialItems,
  initialClientId,
  defaultNumber,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, pending] = useFormAction<unknown, FormData>(
    async (prevState, fd) =>
      (initial
        ? await updateInvoiceAction(initial.id, prevState, fd)
        : await createInvoiceAction(prevState, fd)) as Result,
    {} as Result
  );

  const [clientId, setClientId] = useState(
    initial?.client_id ?? initialClientId ?? ""
  );
  const [status, setStatus] = useState<InvoiceStatus>(
    initial?.status ?? "draft"
  );
  const [taxRate, setTaxRate] = useState(initial?.tax_rate ?? 0);
  const [discount, setDiscount] = useState(initial?.discount ?? 0);
  const [items, setItems] = useState<LineItem[]>(
    initialItems && initialItems.length
      ? initialItems
      : [{ description: "", quantity: 1, rate: 0 }]
  );

  const totals = useMemo(
    () => computeTotals(items, taxRate, discount),
    [items, taxRate, discount]
  );

  useEffect(() => {
    if (state && (state as Result).ok === true) {
      toast(initial ? "Invoice updated" : "Invoice created", "success");
      if (!initial && (state as Result).id) router.push(`/invoices/${(state as Result).id}`);
      else router.refresh();
      onClose();
    }
    if (state && (state as Result).ok === false && (state as Result).error) {
      toast((state as Result).error ?? "Something went wrong", "error");
    }
  }, [state, initial, router, onClose, toast]);

  const payload = JSON.stringify({
    client_id: clientId,
    invoice_number: initial?.invoice_number ?? defaultNumber ?? "",
    status,
    issue_date: initial?.issue_date ?? today(),
    due_date: initial?.due_date ?? null,
    tax_rate: taxRate,
    discount,
    payment_notes: initial?.payment_notes ?? null,
    items,
  });

  return (
    <Dialog open={open} onClose={onClose} title={initial ? "Edit invoice" : "New invoice"} size="lg">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="payload" value={payload} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Client" htmlFor="client_id_fake">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Invoice number" htmlFor="num_fake">
            <Input
              readOnly
              value={initial?.invoice_number ?? defaultNumber ?? ""}
              className="bg-surface"
            />
          </Field>
          <Field label="Status" htmlFor="status_fake">
            <Select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
          <Field label="Issue date" htmlFor="issue_fake">
            <Input type="date" defaultValue={initial?.issue_date ?? today()} />
          </Field>
          <Field label="Due date" htmlFor="due_fake">
            <Input type="date" defaultValue={initial?.due_date ?? ""} />
          </Field>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">Line items</span>
          <div className="space-y-2 rounded-lg border border-surface-border bg-surface-raised p-3">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  className="h-9 flex-[3] rounded-md border border-surface-border bg-surface-raised px-3 text-sm"
                  placeholder="Description"
                  value={it.description}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x))
                    )
                  }
                />
                <input
                  type="number"
                  min={0}
                  className="h-9 w-16 rounded-md border border-surface-border bg-surface-raised px-2 text-sm"
                  value={it.quantity}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value) } : x))
                    )
                  }
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-9 w-24 rounded-md border border-surface-border bg-surface-raised px-2 text-sm"
                  placeholder="Rate"
                  value={it.rate}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, rate: Number(e.target.value) } : x))
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-ink-soft hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, { description: "", quantity: 1, rate: 0 }])}
              className="flex items-center gap-1 text-sm text-accent-hover"
            >
              <Plus className="h-4 w-4" /> Add line item
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Field label="Tax rate %" htmlFor="tax_fake">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
            />
          </Field>
          <Field label="Discount" htmlFor="disc_fake">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </Field>
        </div>

        <Field label="Payment notes" htmlFor="pay_fake">
          <Textarea defaultValue={initial?.payment_notes ?? ""} placeholder="Payment method, terms, bank details…" />
        </Field>

        <div className="flex items-center justify-between rounded-xl bg-surface p-4 text-sm">
          <div className="space-y-1 text-ink-soft">
            <p>Subtotal: ${totals.subtotal.toFixed(2)}</p>
            <p>Tax: ${totals.tax.toFixed(2)}</p>
            <p>Discount: ${Number(discount || 0).toFixed(2)}</p>
          </div>
          <p className="text-lg font-semibold text-ink">
            Total: ${totals.total.toFixed(2)}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-surface-border bg-surface-raised px-4 text-sm font-medium text-ink hover:bg-surface"
          >
            Cancel
          </button>
          <Button type="submit" loading={pending}>
            {initial ? "Save changes" : "Create invoice"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
