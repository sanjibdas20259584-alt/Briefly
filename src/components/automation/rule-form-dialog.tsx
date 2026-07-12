"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  createAutomationRule,
  updateAutomationRule,
} from "@/lib/actions/automation";
import type {
  AutomationRule,
  TriggerType,
  ActionType,
} from "@/lib/actions/automation";

interface Result {
  ok: boolean;
  error?: string;
  id?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  rule?: AutomationRule | null;
}

export function RuleFormDialog({ open, onClose, rule }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!rule;

  const actionFn = isEdit
    ? (id: string, prevState: unknown, fd: FormData) =>
        updateAutomationRule(id, prevState, fd)
    : createAutomationRule;

  const [state, formAction, pending] = useFormAction<Result, FormData>(
    async (_p, fd) =>
      isEdit
        ? (await updateAutomationRule(rule!.id, _p, fd)) as Result
        : (await createAutomationRule(_p, fd)) as Result,
    {} as Result
  );

  useEffect(() => {
    if (state && state.ok === true) {
      toast(isEdit ? "Rule updated" : "Rule created", "success");
      onClose();
      router.refresh();
    }
    if (state && state.ok === false && state.error) {
      toast(state.error ?? "Something went wrong", "error");
    }
  }, [state, isEdit, onClose, router, toast]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit automation rule" : "New automation rule"}
      description="Set up a trigger and action to automate your workflow"
      size="lg"
    >
      <form action={formAction} className="space-y-4">
        <Field label="Rule name" required htmlFor="name">
          <Input
            id="name"
            name="name"
            required
            placeholder="e.g. Remind when invoice overdue"
            defaultValue={rule?.name ?? ""}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Trigger" required htmlFor="trigger_type" hint="When this rule should fire">
            <Select
              id="trigger_type"
              name="trigger_type"
              defaultValue={rule?.trigger_type ?? ""}
              required
            >
              <option value="">Select trigger…</option>
              <option value="invoice_overdue">Invoice overdue</option>
              <option value="project_completed">Project completed</option>
              <option value="client_inactive">Client inactive</option>
              <option value="reminder_due">Reminder due</option>
              <option value="custom">Custom</option>
            </Select>
          </Field>

          <Field label="Action" required htmlFor="action_type" hint="What should happen">
            <Select
              id="action_type"
              name="action_type"
              defaultValue={rule?.action_type ?? ""}
              required
            >
              <option value="">Select action…</option>
              <option value="send_telegram">Send Telegram message</option>
              <option value="create_reminder">Create reminder</option>
              <option value="update_status">Update status</option>
              <option value="send_email">Send email</option>
              <option value="webhook">Call webhook</option>
            </Select>
          </Field>
        </div>

        <Field label="Trigger config (JSON)" htmlFor="trigger_config" hint="Optional additional conditions">
          <Input
            id="trigger_config"
            name="trigger_config"
            placeholder='{"days_overdue": 7}'
            defaultValue={rule?.trigger_config ? JSON.stringify(rule.trigger_config) : ""}
          />
        </Field>

        <Field label="Action config (JSON)" htmlFor="action_config" hint="Optional action parameters">
          <Input
            id="action_config"
            name="action_config"
            placeholder='{"message": "Invoice is overdue"}'
            defaultValue={rule?.action_config ? JSON.stringify(rule.action_config) : ""}
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
            {isEdit ? "Update rule" : "Create rule"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
