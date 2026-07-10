"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  sendReminderNowAction,
  deleteReminderAction,
} from "@/lib/actions/reminders";
import { formatDateTime } from "@/lib/utils";
import type { Reminder } from "@/lib/types";

export function ReminderList({ reminders }: { reminders: Reminder[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function sendNow(id: string) {
    startTransition(async () => {
      const res = await sendReminderNowAction(id);
      if (res.ok) toast("Sent to Telegram", "success");
      else toast(res.error ?? "Failed to send", "error");
      router.refresh();
    });
  }
  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteReminderAction(id);
      if (res.ok) toast("Reminder removed", "success");
      else toast(res.error ?? "Failed", "error");
      setConfirmId(null);
      router.refresh();
    });
  }

  if (reminders.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-surface-border bg-surface-raised p-10 text-center text-sm text-ink-soft">
        No reminders yet. Create one and get pinged on Telegram.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reminders.map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-4 rounded-2xl border border-surface-border bg-surface-raised p-4"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-soft">
            <Clock className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ink">{r.title}</p>
            <p className="text-xs text-ink-soft">
              {formatDateTime(r.due_at)}
              {r.repeat !== "none" && ` · repeats ${r.repeat}`}
            </p>
          </div>
          {r.status === "done" ? (
            <Badge tone="accent">done</Badge>
          ) : (
            <Badge tone="warn">pending</Badge>
          )}
          <button
            onClick={() => sendNow(r.id)}
            disabled={pending}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-surface hover:text-accent disabled:opacity-50"
            title="Send now"
          >
            <Send className="h-4 w-4" />
          </button>
          <button
            onClick={() => setConfirmId(r.id)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <ConfirmDialog
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId && remove(confirmId)}
        title="Delete reminder?"
        message="This removes the reminder permanently."
        confirmLabel="Delete"
        loading={pending}
      />
    </div>
  );
}
