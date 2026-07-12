"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Copy, LayoutTemplate } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  deleteTemplateAction,
  createProjectFromTemplate,
} from "@/lib/actions/project-templates";
import { TemplateFormDialog } from "./template-form-dialog";
import type { ProjectTemplate } from "@/lib/types";

const STATUS_TONE = {
  idea: "muted" as const,
  active: "accent" as const,
  waiting: "warn" as const,
  completed: "neutral" as const,
  archived: "muted" as const,
};

const PRIORITY_TONE = {
  low: "muted" as const,
  medium: "neutral" as const,
  high: "warn" as const,
  urgent: "danger" as const,
};

export function TemplateList({
  templates,
  clients,
}: {
  templates: ProjectTemplate[];
  clients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [editTemplate, setEditTemplate] = useState<ProjectTemplate | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onDelete = useCallback(() => {
    if (!confirmId) return;
    startTransition(async () => {
      const res = await deleteTemplateAction(confirmId);
      if (res.ok) {
        toast("Template deleted", "success");
        setConfirmId(null);
      } else {
        toast(res.error ?? "Failed", "error");
      }
    });
  }, [confirmId, toast]);

  const onUseTemplate = useCallback(
    (templateId: string) => {
      startTransition(async () => {
        const res = await createProjectFromTemplate(templateId);
        if (res.ok) {
          toast("Project created from template", "success");
          router.push(`/projects/${res.id}`);
        } else {
          toast(res.error ?? "Failed", "error");
        }
      });
    },
    [router, toast]
  );

  const target = templates.find((t) => t.id === confirmId);

  return (
    <div className="space-y-6">
      {templates.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate className="h-5 w-5" />}
          title="No templates yet"
          description="Create reusable project templates to speed up project setup."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <Card key={tpl.id} hoverable className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{tpl.name}</p>
                  {tpl.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">
                      {tpl.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={STATUS_TONE[tpl.status]}>{tpl.status}</Badge>
                <Badge tone={PRIORITY_TONE[tpl.priority]}>{tpl.priority}</Badge>
                {tpl.checklist.length > 0 && (
                  <Badge tone="neutral">{tpl.checklist.length} tasks</Badge>
                )}
                {tpl.milestones.length > 0 && (
                  <Badge tone="neutral">{tpl.milestones.length} milestones</Badge>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => onUseTemplate(tpl.id)}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-70"
                  disabled={pending}
                >
                  <Copy className="h-3.5 w-3.5" /> Use template
                </button>
                <button
                  onClick={() => setEditTemplate(tpl)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-ink-soft hover:bg-surface"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setConfirmId(tpl.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-ink-soft hover:bg-red-50 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editTemplate && (
        <TemplateFormDialog
          open={!!editTemplate}
          onClose={() => setEditTemplate(null)}
          initial={editTemplate}
          clients={clients}
        />
      )}

      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={onDelete}
        title="Delete template?"
        message={`This permanently removes "${target?.name ?? ""}". Existing projects created from this template are unaffected.`}
        confirmLabel="Delete template"
        loading={pending}
      />
    </div>
  );
}
