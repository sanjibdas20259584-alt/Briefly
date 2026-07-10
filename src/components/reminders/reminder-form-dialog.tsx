"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createReminderAction } from "@/lib/actions/reminders";
import type { ReminderRepeat, ReminderRelatedType } from "@/lib/types";

interface Ctx {
  clients: { id: string; name: string }[];
  projects: { id: string; title: string }[];
  invoices: { id: string; invoice_number: string }[];
  proposals: { id: string; title: string }[];
}
interface Props {
  open: boolean;
  onClose: () => void;
  ctx: Ctx;
  defaultRelated?: { type: ReminderRelatedType; id: string };
}

interface Result {
  ok: boolean;
  error?: string;
  id?: string;
}

function fmtLocal(d: Date) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export function ReminderFormDialog({ open, onClose, ctx, defaultRelated }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, pending] = useFormAction<unknown, FormData>(
    async (_p, fd) => (await createReminderAction(_p, fd)) as Result,
    {} as Result
  );

  const [relType, setRelType] = useState<ReminderRelatedType | "">(
    defaultRelated?.type ?? ""
  );

  useEffect(() => {
    if (state && (state as Result).ok === true) {
      toast("Reminder created", "success");
      onClose();
      router.refresh();
    }
    if (state && (state as Result).ok === false && (state as Result).error) {
      toast((state as Result).error ?? "Something went wrong", "error");
    }
  }, [state, onClose, router, toast]);

  return (
    <Dialog open={open} onClose={onClose} title="New reminder" size="lg">
      <form action={formAction} className="space-y-4">
        <Field label="Title" required htmlFor="title">
          <Input id="title" name="title" required placeholder="Follow up call" />
        </Field>
        <Field label="Note" htmlFor="note">
          <Textarea id="note" name="note" placeholder="What this reminder is about" />
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Date & time" required htmlFor="due">
            <Input id="due" name="due_at" type="datetime-local" defaultValue={fmtLocal(new Date())} required />
          </Field>
          <Field label="Repeat" htmlFor="repeat">
            <Select id="repeat" name="repeat" defaultValue="none">
              <option value="none">One-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Related to" htmlFor="rtype">
            <Select
              value={relType}
              onChange={(e) => setRelType(e.target.value as ReminderRelatedType | "")}
              name="related_type"
            >
              <option value="">Nothing</option>
              <option value="client">Client</option>
              <option value="project">Project</option>
              <option value="invoice">Invoice</option>
              <option value="proposal">Proposal</option>
            </Select>
          </Field>
          <Field label="Item" htmlFor="ritem">
            <Select id="ritem" name="related_id" disabled={!relType}>
              <option value="">Select…</option>
              {relType === "client" &&
                ctx.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              {relType === "project" &&
                ctx.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              {relType === "invoice" &&
                ctx.invoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoice_number}
                  </option>
                ))}
              {relType === "proposal" &&
                ctx.proposals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
            </Select>
          </Field>
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
            Create reminder
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
