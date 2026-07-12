"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Pencil, Trash2, Check } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { deleteProjectAction } from "@/lib/actions/projects";
import { formatDate, formatMoney } from "@/lib/utils";
import type { Project, Client, Invoice, Reminder, Proposal, TimeEntry } from "@/lib/types";
import { TimeTracker } from "@/components/projects/time-tracker";

export function ProjectDetailClient({
  project,
  clients,
  proposals,
  invoices,
  reminders,
  clientName,
  timeEntries,
  activeEntry,
}: {
  project: Project;
  clients: { id: string; name: string }[];
  proposals: { id: string; title: string; client_id: string | null }[];
  invoices: Invoice[];
  reminders: Reminder[];
  clientName: string | null;
  timeEntries: TimeEntry[];
  activeEntry: TimeEntry | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      const res = await deleteProjectAction(project.id);
      if (res.ok) {
        toast("Project removed", "success");
        router.push("/projects");
      } else toast(res.error ?? "Failed", "error");
    });
  }

  const doneCount = project.checklist.filter((c) => c.done).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-surface"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-ink">{project.title}</h1>
            <p className="text-sm text-ink-soft">
              {clientName ? (
                <Link href={`/clients/${project.client_id}`} className="hover:text-accent">
                  {clientName}
                </Link>
              ) : (
                "No client"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-surface"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setConfirm(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader title="Summary" />
            <CardBody className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone="accent">{project.status}</Badge>
                <Badge tone="warn">{project.priority}</Badge>
                {project.start_date && (
                  <Badge tone="muted">Start {formatDate(project.start_date)}</Badge>
                )}
                {project.due_date && (
                  <Badge tone="muted">Due {formatDate(project.due_date)}</Badge>
                )}
              </div>
              {project.description ? (
                <p className="whitespace-pre-wrap text-sm text-ink-soft">{project.description}</p>
              ) : (
                <p className="text-sm text-ink-muted">No description.</p>
              )}
              <div>
                <div className="mb-1 flex justify-between text-xs text-ink-soft">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <ProgressBar value={project.progress} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Checklist" description={`${doneCount}/${project.checklist.length} done`} />
            <CardBody>
              {project.checklist.length === 0 ? (
                <p className="text-sm text-ink-soft">No checklist items.</p>
              ) : (
                <ul className="space-y-2">
                  {project.checklist.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 text-sm">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                          item.done ? "border-accent bg-accent text-white" : "border-surface-border"
                        }`}
                      >
                        {item.done && <Check className="h-3 w-3" />}
                      </span>
                      <span className={item.done ? "text-ink-muted line-through" : "text-ink"}>
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Milestones" />
            <CardBody>
              {project.milestones.length === 0 ? (
                <p className="text-sm text-ink-soft">No milestones.</p>
              ) : (
                <div className="space-y-2">
                  {project.milestones.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2 text-sm"
                    >
                      <span className={m.done ? "text-ink-muted line-through" : "text-ink"}>
                        {m.title}
                      </span>
                      <span className="text-xs text-ink-soft">{formatDate(m.due, "—")}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <TimeTracker
            projectId={project.id}
            entries={timeEntries}
            activeEntry={activeEntry}
          />

          <Card>
            <CardHeader title="Files & links" />
            <CardBody>
              <p className="text-sm text-ink-soft">
                Keep Briefly light — add Figma, Drive, or asset links in the description above or
                as milestones. Everything stays private to you.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Reminders" />
            <CardBody>
              {reminders.length === 0 ? (
                <EmptyState
                  title="No reminders"
                  description="Create a reminder for this project from the Reminders page."
                  action={{ label: "Go to reminders", href: `/reminders?new=1&project=${project.id}` }}
                  className="border-0 p-6"
                />
              ) : (
                <ul className="space-y-2">
                  {reminders.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2 text-sm"
                    >
                      <span className="text-ink">{r.title}</span>
                      <span className="text-xs text-ink-soft">{formatDate(r.due_at, "—")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Linked" />
            <CardBody className="space-y-4">
              <div>
                <p className="mb-1 text-xs uppercase text-ink-soft">Client</p>
                {clientName ? (
                  <Link href={`/clients/${project.client_id}`} className="text-sm text-accent-hover hover:underline">
                    {clientName}
                  </Link>
                ) : (
                  <p className="text-sm text-ink-soft">—</p>
                )}
              </div>
              <div>
                <p className="mb-1 text-xs uppercase text-ink-soft">Proposal</p>
                {project.proposal_id ? (
                  <Link href={`/proposals/${project.proposal_id}`} className="text-sm text-accent-hover hover:underline">
                    View proposal
                  </Link>
                ) : (
                  <p className="text-sm text-ink-soft">—</p>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Invoices" description={invoices.length ? undefined : "For this client"} />
            <CardBody>
              {invoices.length === 0 ? (
                <p className="text-sm text-ink-soft">No invoices yet.</p>
              ) : (
                <ul className="space-y-2">
                  {invoices.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between text-sm">
                      <Link href={`/invoices/${inv.id}`} className="text-ink hover:text-accent">
                        {inv.invoice_number}
                      </Link>
                      <span className="text-ink-soft">{formatMoney(inv.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <ProjectFormDialog open={open} onClose={() => setOpen(false)} initial={project} clients={clients} />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={onDelete}
        title="Delete project?"
        message={`This permanently removes "${project.title}". Related reminders stay linked until you delete them.`}
        confirmLabel="Delete project"
        loading={pending}
      />
    </div>
  );
}
