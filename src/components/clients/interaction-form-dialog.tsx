"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createInteractionAction } from "@/lib/actions/interactions";
import type { InteractionType } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
}

const TYPES: { value: InteractionType; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "note", label: "Note" },
  { value: "other", label: "Other" },
];

export function InteractionFormDialog({ open, onClose, clientId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, pending] = useFormAction<unknown, FormData>(
    async (_p, fd) => (await createInteractionAction(_p, fd)) as any,
    {} as any
  );

  useEffect(() => {
    if (state && (state as any).ok === true) {
      toast("Interaction logged", "success");
      onClose();
      router.refresh();
    }
    if (state && (state as any).ok === false && (state as any).error) {
      toast((state as any).error ?? "Something went wrong", "error");
    }
  }, [state, onClose, router, toast]);

  return (
    <Dialog open={open} onClose={onClose} title="Log interaction" size="lg">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="client_id" value={clientId} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Type" required htmlFor="ix-type">
            <Select id="ix-type" name="type" defaultValue="call">
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Subject" htmlFor="ix-subject">
            <Input
              id="ix-subject"
              name="subject"
              placeholder="Follow up on proposal"
            />
          </Field>
        </div>

        <Field label="Details" htmlFor="ix-content">
          <Textarea
            id="ix-content"
            name="content"
            placeholder="What was discussed or communicated…"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Duration (minutes)" htmlFor="ix-duration">
            <Input
              id="ix-duration"
              name="duration"
              type="number"
              min={0}
              placeholder="30"
            />
          </Field>
          <Field label="Outcome" htmlFor="ix-outcome">
            <Input
              id="ix-outcome"
              name="outcome"
              placeholder="Client interested, follow up next week"
            />
          </Field>
        </div>

        <Field label="Scheduled at (optional)" htmlFor="ix-scheduled">
          <Input id="ix-scheduled" name="scheduled_at" type="datetime-local" />
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
            Log interaction
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
