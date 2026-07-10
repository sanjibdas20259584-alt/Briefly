"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useFormAction } from "@/lib/use-form-action";
import {
  createClientAction,
  updateClientAction,
} from "@/lib/actions/clients";
import type { Client, ClientStatus } from "@/lib/types";

interface ClientFormDialogProps {
  open: boolean;
  onClose: () => void;
  initial?: Client | null;
}

interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function socialToString(s: Record<string, string> | undefined): string {
  if (!s) return "{}";
  return JSON.stringify(s);
}

export function ClientFormDialog({
  open,
  onClose,
  initial,
}: ClientFormDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [state, formAction, pending] = useFormAction<ActionResult, FormData>(
    async (prevState, fd) =>
      (initial
        ? await updateClientAction(initial.id, prevState, fd)
        : await createClientAction(prevState, fd)) as ActionResult,
    {} as ActionResult
  );

  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [social, setSocial] = useState<Record<string, string>>(
    initial?.social ?? {}
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok === true) {
      toast(
        initial
          ? "Client updated"
          : "Client added — ready to track projects",
        "success"
      );
      if (!initial && state.id) router.push(`/clients/${state.id}`);
      onClose();
      router.refresh();
    }
    if (state.ok === false && state.error) {
      toast(state.error, "error");
    }
  }, [state, initial, router, onClose, toast]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? "Edit client" : "New client"}
      description={
        initial
          ? "Update contact info, tags, and notes."
          : "Add someone you work with."
      }
      size="lg"
    >
      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Name" required htmlFor="name">
            <Input
              id="name"
              name="name"
              required
              defaultValue={initial?.name ?? ""}
              placeholder="Lydia Vance"
            />
          </Field>
          <Field label="Company" htmlFor="company">
            <Input
              id="company"
              name="company"
              defaultValue={initial?.company ?? ""}
              placeholder="Luminate Studio"
            />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={initial?.email ?? ""}
              placeholder="hello@company.com"
            />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <Input
              id="phone"
              name="phone"
              defaultValue={initial?.phone ?? ""}
              placeholder="+1 555..."
            />
          </Field>
          <Field label="Website" htmlFor="website">
            <Input
              id="website"
              name="website"
              defaultValue={initial?.website ?? ""}
              placeholder="https://company.com"
            />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select
              id="status"
              name="status"
              defaultValue={initial?.status ?? "active"}
            >
              <option value="lead">Lead</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>

        <Field label="Tags (comma separated)" htmlFor="tags">
          <Input
            id="tags"
            name="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="retail, retainer, design-heavy"
          />
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Social links
          </span>
          <div className="space-y-2 rounded-lg border border-surface-border bg-surface-raised p-3">
            {["instagram", "twitter", "linkedin", "behance"].map((key) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-24 text-xs uppercase text-ink-soft">{key}</span>
                <input
                  className="h-9 flex-1 rounded-md border border-surface-border bg-surface-raised px-3 text-sm"
                  placeholder={`${
                    key === "twitter" ? "https://x.com/" : `https://${key}.com/`
                  }...`}
                  value={social[key] ?? ""}
                  onChange={(e) =>
                    setSocial((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <input
            type="hidden"
            name="social"
            value={socialToString(social)}
          />
        </div>

        <Field label="Notes" htmlFor="notes">
          <Textarea
            id="notes"
            name="notes"
            defaultValue={initial?.notes ?? ""}
            placeholder="Context, scope notes, inside details."
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="favorite"
            defaultChecked={initial?.favorite ?? false}
            className="h-4 w-4 rounded border-surface-border text-accent focus:ring-accent"
          />
          Mark as favorite
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-surface-border bg-surface-raised px-4 text-sm font-medium text-ink hover:bg-surface"
          >
            Cancel
          </button>
          <Button type="submit" loading={pending}>
            {initial ? "Save changes" : "Create client"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
