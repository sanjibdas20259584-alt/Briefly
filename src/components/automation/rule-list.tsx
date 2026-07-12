"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Zap, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  deleteAutomationRule,
  toggleAutomationRule,
} from "@/lib/actions/automation";
import type { AutomationRule, TriggerType, ActionType } from "@/lib/actions/automation";

const TRIGGER_LABELS: Record<TriggerType, string> = {
  invoice_overdue: "Invoice overdue",
  project_completed: "Project completed",
  client_inactive: "Client inactive",
  reminder_due: "Reminder due",
  custom: "Custom",
};

const ACTION_LABELS: Record<ActionType, string> = {
  send_telegram: "Send Telegram",
  create_reminder: "Create reminder",
  update_status: "Update status",
  send_email: "Send email",
  webhook: "Webhook",
};

interface Props {
  rules: AutomationRule[];
  onEdit: (rule: AutomationRule) => void;
}

export function RuleList({ rules, onEdit }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<AutomationRule | null>(null);

  function handleToggle(rule: AutomationRule) {
    startTransition(async () => {
      const result = await toggleAutomationRule(rule.id, !rule.enabled);
      if (result.ok) {
        toast(rule.enabled ? "Rule disabled" : "Rule enabled", "success");
        router.refresh();
      } else {
        toast(result.error ?? "Failed to toggle rule", "error");
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteAutomationRule(deleteTarget.id);
      if (result.ok) {
        toast("Rule deleted", "success");
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast(result.error ?? "Failed to delete rule", "error");
      }
    });
  }

  if (rules.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="flex items-center gap-4 rounded-xl border border-surface-border bg-surface-raised px-4 py-3 transition-colors hover:bg-surface"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent-hover">
              <Zap className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink">{rule.name}</span>
                <Badge tone={rule.enabled ? "accent" : "muted"}>
                  {rule.enabled ? "Active" : "Disabled"}
                </Badge>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
                <span>When: {TRIGGER_LABELS[rule.trigger_type]}</span>
                <span>→</span>
                <span>Then: {ACTION_LABELS[rule.action_type]}</span>
                {rule.last_run && (
                  <span className="ml-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(rule.last_run).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={rule.enabled}
                onChange={() => handleToggle(rule)}
                label={`Toggle ${rule.name}`}
              />
              <button
                onClick={() => onEdit(rule)}
                className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                aria-label="Edit rule"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeleteTarget(rule)}
                className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label="Delete rule"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete automation rule"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        loading={pending}
      />
    </>
  );
}
