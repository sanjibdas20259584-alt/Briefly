"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatDate } from "@/lib/utils";
import type { Project, ProjectStatus, ProjectPriority } from "@/lib/types";

const COLUMNS: { status: ProjectStatus; label: string }[] = [
  { status: "idea", label: "Idea" },
  { status: "active", label: "Active" },
  { status: "waiting", label: "Waiting" },
  { status: "completed", label: "Completed" },
  { status: "archived", label: "Archived" },
];

const STATUS_TONE = {
  idea: "muted",
  active: "accent",
  waiting: "warn",
  completed: "neutral",
  archived: "muted",
} as const;

const PRIORITY_TONE = {
  low: "muted",
  medium: "neutral",
  high: "warn",
  urgent: "danger",
} as const;

export function KanbanBoard({
  projects,
  clients,
}: {
  projects: Project[];
  clients: { id: string; name: string }[];
}) {
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  const grouped = new Map<ProjectStatus, Project[]>(
    COLUMNS.map((c) => [c.status, []])
  );
  for (const p of projects) {
    grouped.get(p.status)?.push(p);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const items = grouped.get(col.status) ?? [];
        return (
          <div
            key={col.status}
            className="flex min-w-[280px] max-w-[340px] flex-1 flex-col"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge tone={STATUS_TONE[col.status]}>{col.label}</Badge>
                <span className="text-xs text-ink-muted">{items.length}</span>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-2 rounded-xl border border-surface-border bg-surface p-2">
              {items.length === 0 && (
                <p className="py-8 text-center text-xs text-ink-muted">
                  No projects
                </p>
              )}
              {items.map((p) => (
                <KanbanCard
                  key={p.id}
                  project={p}
                  clientName={
                    p.client_id ? (clientMap.get(p.client_id) ?? null) : null
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  project,
  clientName,
}: {
  project: Project;
  clientName: string | null;
}) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card hoverable className="p-3">
        <p className="truncate text-sm font-medium text-ink">
          {project.title}
        </p>
        {clientName && (
          <p className="mt-0.5 text-xs text-ink-soft">{clientName}</p>
        )}

        <div className="mt-3">
          <ProgressBar value={project.progress} />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <Badge tone={PRIORITY_TONE[project.priority]}>
            {project.priority}
          </Badge>
          <span className="text-ink-muted">
            {formatDate(project.due_date, "")}
          </span>
        </div>
      </Card>
    </Link>
  );
}
