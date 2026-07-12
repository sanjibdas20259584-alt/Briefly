"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { Play, Pause, Plus, Trash2, Clock } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useFormAction } from "@/lib/use-form-action";
import {
  startTimeEntryAction,
  stopTimeEntryAction,
  deleteTimeEntryAction,
  createTimeEntryAction,
} from "@/lib/actions/time-entries";
import { formatDateTime } from "@/lib/utils";
import type { TimeEntry } from "@/lib/types";

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function useElapsed(startedAt: string | null) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) { setElapsed(0); return; }
    const calc = () => Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    setElapsed(calc());
    const id = setInterval(() => setElapsed(calc()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return elapsed;
}

export function TimeTracker({
  projectId,
  entries,
  activeEntry,
}: {
  projectId: string;
  entries: TimeEntry[];
  activeEntry: TimeEntry | null;
}) {
  const { toast } = useToast();
  const [showManual, setShowManual] = useState(false);
  const [pending, startTransition] = useTransition();
  const [taskName, setTaskName] = useState("");

  const isRunning = activeEntry?.project_id === projectId;
  const runningElapsed = useElapsed(isRunning ? activeEntry!.started_at : null);

  const onStart = useCallback(() => {
    startTransition(async () => {
      const res = await startTimeEntryAction(projectId, taskName || null);
      if (res.ok) {
        toast("Timer started", "success");
        setTaskName("");
      } else {
        toast(res.error ?? "Failed", "error");
      }
    });
  }, [projectId, taskName, toast]);

  const onStop = useCallback(() => {
    if (!activeEntry) return;
    startTransition(async () => {
      const res = await stopTimeEntryAction(activeEntry.id);
      if (res.ok) toast("Timer stopped", "success");
      else toast(res.error ?? "Failed", "error");
    });
  }, [activeEntry, toast]);

  const onDelete = useCallback(
    (entry: TimeEntry) => {
      startTransition(async () => {
        const res = await deleteTimeEntryAction(entry.id, projectId);
        if (res.ok) toast("Entry deleted", "success");
        else toast(res.error ?? "Failed", "error");
      });
    },
    [projectId, toast]
  );

  const totalBillable = entries.reduce((sum, e) => sum + (e.duration ?? 0), 0);

  return (
    <Card>
      <CardHeader
        title="Time tracking"
        description={`${entries.length} ${entries.length === 1 ? "entry" : "entries"} · ${formatDuration(totalBillable)} total`}
        action={
          <Button variant="outline" size="sm" onClick={() => setShowManual(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Manual
          </Button>
        }
      />
      <CardBody className="space-y-4">
        {/* Timer controls */}
        <div className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface p-3">
          <Input
            placeholder="What are you working on?"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            disabled={isRunning}
            className="flex-1"
          />
          {isRunning ? (
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg font-semibold text-accent tabular-nums">
                {formatDuration(runningElapsed)}
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={onStop}
                loading={pending}
              >
                <Pause className="mr-1 h-3.5 w-3.5" /> Stop
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={onStart} loading={pending}>
              <Play className="mr-1 h-3.5 w-3.5" /> Start
            </Button>
          )}
        </div>

        {/* Entries list */}
        {entries.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-soft">
            No time entries yet. Start the timer or add a manual entry.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-surface-border px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {entry.task && (
                      <span className="truncate font-medium text-ink">{entry.task}</span>
                    )}
                    {entry.billable ? (
                      <Badge tone="accent">billable</Badge>
                    ) : (
                      <Badge tone="muted">non-billable</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {formatDateTime(entry.started_at)}
                    {entry.ended_at && ` — ${formatDateTime(entry.ended_at)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm tabular-nums text-ink">
                    {formatDuration(entry.duration)}
                  </span>
                  {!entry.ended_at && (
                    <Badge tone="accent">running</Badge>
                  )}
                  <button
                    onClick={() => onDelete(entry)}
                    className="text-ink-soft hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>

      <ManualEntryDialog
        open={showManual}
        onClose={() => setShowManual(false)}
        projectId={projectId}
      />
    </Card>
  );
}

interface ManualResult {
  ok: boolean;
  error?: string;
}

function ManualEntryDialog({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const { toast } = useToast();
  const [state, formAction, pending] = useFormAction<unknown, FormData>(
    async (prevState, fd) =>
      (await createTimeEntryAction(prevState, fd)) as ManualResult,
    {} as ManualResult
  );

  useEffect(() => {
    if (state && (state as ManualResult).ok === true) {
      toast("Time entry added", "success");
      onClose();
    }
    if (state && (state as ManualResult).ok === false && (state as ManualResult).error) {
      toast((state as ManualResult).error!, "error");
    }
  }, [state, onClose, toast]);

  return (
    <Dialog open={open} onClose={onClose} title="Add time entry" size="md">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="project_id" value={projectId} />
        <Field label="Task" htmlFor="task">
          <Input id="task" name="task" placeholder="e.g. Design review" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start" htmlFor="started_at" required>
            <Input id="started_at" name="started_at" type="datetime-local" required />
          </Field>
          <Field label="End" htmlFor="ended_at">
            <Input id="ended_at" name="ended_at" type="datetime-local" />
          </Field>
        </div>
        <Field label="Duration (minutes)" htmlFor="duration" hint="Leave blank if start/end are filled">
          <Input id="duration" name="duration" type="number" min={0} />
        </Field>
        <Field label="Description" htmlFor="description">
          <Textarea id="description" name="description" placeholder="Optional notes" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Rate ($/hr)" htmlFor="rate">
            <Input id="rate" name="rate" type="number" min={0} step={0.01} />
          </Field>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="billable"
                defaultChecked
                className="h-4 w-4 rounded border-surface-border text-accent"
              />
              Billable
            </label>
          </div>
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
            Add entry
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
