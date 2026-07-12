"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  createExpenseAction,
  updateExpenseAction,
} from "@/lib/actions/expenses";
import type { Expense, ExpenseCategory } from "@/lib/types";

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "software", label: "Software" },
  { value: "hardware", label: "Hardware" },
  { value: "travel", label: "Travel" },
  { value: "office", label: "Office" },
  { value: "marketing", label: "Marketing" },
  { value: "professional", label: "Professional Services" },
  { value: "utilities", label: "Utilities" },
  { value: "insurance", label: "Insurance" },
  { value: "tax", label: "Tax" },
  { value: "other", label: "Other" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  clients: { id: string; name: string }[];
  projects: { id: string; title: string }[];
  initial?: Expense | null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

interface Result {
  ok: boolean;
  error?: string;
  id?: string;
}

export function ExpenseFormDialog({
  open,
  onClose,
  clients,
  projects,
  initial,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, pending] = useFormAction<unknown, FormData>(
    async (prevState, fd) =>
      (initial
        ? await updateExpenseAction(initial.id, prevState, fd)
        : await createExpenseAction(prevState, fd)) as Result,
    {} as Result
  );

  const [clientId, setClientId] = useState(initial?.client_id ?? "");
  const [projectId, setProjectId] = useState(initial?.project_id ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(
    initial?.category ?? "other"
  );

  useEffect(() => {
    if (state && (state as Result).ok === true) {
      toast(initial ? "Expense updated" : "Expense created", "success");
      router.refresh();
      onClose();
    }
    if (state && (state as Result).ok === false && (state as Result).error) {
      toast((state as Result).error ?? "Something went wrong", "error");
    }
  }, [state, initial, router, onClose, toast]);

  const payload = JSON.stringify({
    client_id: clientId || null,
    project_id: projectId || null,
    description: initial?.description ?? "",
    amount: initial?.amount ?? 0,
    category,
    date: initial?.date ?? today(),
    receipt_url: initial?.receipt_url ?? null,
    notes: initial?.notes ?? null,
    currency: initial?.currency ?? "USD",
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? "Edit expense" : "New expense"}
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="payload" value={payload} />

        <Field label="Description" htmlFor="desc_exp" required>
          <Input
            id="desc_exp"
            name="description"
            defaultValue={initial?.description ?? ""}
            placeholder="e.g. Adobe Creative Cloud subscription"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount" htmlFor="amount_exp" required>
            <Input
              id="amount_exp"
              name="amount"
              type="number"
              min={0}
              step="0.01"
              defaultValue={initial?.amount ?? ""}
              placeholder="0.00"
              required
            />
          </Field>
          <Field label="Date" htmlFor="date_exp" required>
            <Input
              id="date_exp"
              name="date"
              type="date"
              defaultValue={initial?.date ?? today()}
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" htmlFor="cat_exp">
            <Select
              id="cat_exp"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Currency" htmlFor="curr_exp">
            <Input
              id="curr_exp"
              name="currency"
              defaultValue={initial?.currency ?? "USD"}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Client" htmlFor="client_exp">
            <Select
              id="client_exp"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Project" htmlFor="project_exp">
            <Select
              id="project_exp"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Receipt URL" htmlFor="receipt_exp">
          <Input
            id="receipt_exp"
            name="receipt_url"
            defaultValue={initial?.receipt_url ?? ""}
            placeholder="https://..."
          />
        </Field>

        <Field label="Notes" htmlFor="notes_exp">
          <Textarea
            id="notes_exp"
            name="notes"
            defaultValue={initial?.notes ?? ""}
            placeholder="Optional notes about this expense"
          />
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
            {initial ? "Save changes" : "Create expense"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
