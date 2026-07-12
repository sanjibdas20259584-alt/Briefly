"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RuleList } from "@/components/automation/rule-list";
import { RuleFormDialog } from "@/components/automation/rule-form-dialog";
import type { AutomationRule } from "@/lib/actions/automation";

export function AutomationClient({ rules }: { rules: AutomationRule[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editRule, setEditRule] = useState<AutomationRule | null>(null);

  function handleEdit(rule: AutomationRule) {
    setEditRule(rule);
    setFormOpen(true);
  }

  function handleClose() {
    setFormOpen(false);
    setEditRule(null);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Automation</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Automate repetitive tasks with trigger-action rules
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>New rule</Button>
      </div>

      {rules.length > 0 ? (
        <RuleList rules={rules} onEdit={handleEdit} />
      ) : (
        <EmptyState
          icon={<Zap className="h-5 w-5" />}
          title="No automation rules"
          description="Create rules to automate tasks like sending reminders when invoices are overdue or updating statuses when projects complete."
          action={{ label: "New rule", onClick: () => setFormOpen(true) }}
        />
      )}

      <RuleFormDialog open={formOpen} onClose={handleClose} rule={editRule} />
    </div>
  );
}
