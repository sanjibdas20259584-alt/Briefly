"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  createProposalAction,
  updateProposalAction,
} from "@/lib/actions/proposals";
import type { Proposal, ProposalStatus } from "@/lib/types";

interface Item {
  description: string;
  amount: number;
}
interface Props {
  open: boolean;
  onClose: () => void;
  clients: any[];
  initial?: Proposal | null;
  initialItems?: Item[];
  initialClientId?: string;
}
interface Result {
  ok: boolean;
  error?: string;
  id?: string;
}

export function ProposalFormDialog({
  open,
  onClose,
  clients,
  initial,
  initialItems,
  initialClientId,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, pending] = useFormAction<unknown, FormData>(
    async (prevState, fd) =>
      (initial
        ? await updateProposalAction(initial.id, prevState, fd)
        : await createProposalAction(prevState, fd)) as Result,
    {} as Result
  );

  const [clientId, setClientId] = useState(initial?.client_id ?? initialClientId ?? "");
  const [status, setStatus] = useState<ProposalStatus>(initial?.status ?? "draft");
  const [items, setItems] = useState<Item[]>(
    initialItems && initialItems.length ? initialItems : [{ description: "", amount: 0 }]
  );

  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  useEffect(() => {
    if (state && (state as Result).ok === true) {
      toast(initial ? "Proposal updated" : "Proposal created", "success");
      if (!initial && (state as Result).id) router.push(`/proposals/${(state as Result).id}`);
      else router.refresh();
      onClose();
    }
    if (state && (state as Result).ok === false && (state as Result).error) {
      toast((state as Result).error ?? "Something went wrong", "error");
    }
  }, [state, initial, router, onClose, toast]);

  const payload = JSON.stringify({
    client_id: clientId,
    title: initial?.title ?? "",
    status,
    scope: initial?.scope ?? null,
    timeline: initial?.timeline ?? null,
    pricing: initial?.pricing ?? null,
    terms: initial?.terms ?? null,
    items,
  });

  return (
    <Dialog open={open} onClose={onClose} title={initial ? "Edit proposal" : "New proposal"} size="lg">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="payload" value={payload} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Title" required htmlFor="t">
            <Input id="t" name="title_fake" required defaultValue={initial?.title ?? ""} />
          </Field>
          <Field label="Client" htmlFor="c">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="s">
            <Select value={status} onChange={(e) => setStatus(e.target.value as ProposalStatus)}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
        </div>
        <Field label="Scope of work" htmlFor="scope">
          <Textarea id="scope" name="scope_fake" defaultValue={initial?.scope ?? ""} />
        </Field>
        <Field label="Timeline" htmlFor="timeline">
          <Textarea id="timeline" name="timeline_fake" defaultValue={initial?.timeline ?? ""} />
        </Field>
        <Field label="Pricing" htmlFor="pricing">
          <Textarea id="pricing" name="pricing_fake" defaultValue={initial?.pricing ?? ""} />
        </Field>

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
                    setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))
                  }
                />
                <input
                  type="number"
                  step="0.01"
                  className="h-9 w-28 rounded-md border border-surface-border bg-surface-raised px-2 text-sm"
                  placeholder="Amount"
                  value={it.amount}
                  onChange={(e) =>
                    setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, amount: Number(e.target.value) } : x)))
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
              onClick={() => setItems((prev) => [...prev, { description: "", amount: 0 }])}
              className="flex items-center gap-1 text-sm text-accent-hover"
            >
              <Plus className="h-4 w-4" /> Add item
            </button>
          </div>
          <p className="mt-1 text-sm text-ink-soft">Total: ${total.toFixed(2)}</p>
        </div>

        <Field label="Terms & conditions" htmlFor="terms">
          <Textarea id="terms" name="terms_fake" defaultValue={initial?.terms ?? ""} />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-surface-border bg-surface-raised px-4 text-sm font-medium text-ink hover:bg-surface"
          >
            Cancel
          </button>
          <Button type="submit" loading={pending}>
            {initial ? "Save changes" : "Create proposal"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
