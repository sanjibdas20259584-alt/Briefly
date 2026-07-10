"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Send } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ReminderList } from "@/components/reminders/reminder-list";
import { ReminderFormDialog } from "@/components/reminders/reminder-form-dialog";
import { useToast } from "@/components/ui/toast";
import type { Reminder, TelegramDeliveryLog, Client, Project, Invoice, Proposal } from "@/lib/types";

export function RemindersClient({
  reminders,
  ctx,
  logs,
  defaultRelated,
  autoOpenNew,
}: {
  reminders: Reminder[];
  ctx: {
    clients: Pick<Client, "id" | "name">[];
    projects: Pick<Project, "id" | "title">[];
    invoices: Pick<Invoice, "id" | "invoice_number">[];
    proposals: Pick<Proposal, "id" | "title">[];
    logs: TelegramDeliveryLog[];
  };
  logs: TelegramDeliveryLog[];
  defaultRelated?: { type: "client" | "project" | "invoice" | "proposal"; id: string };
  autoOpenNew?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(autoOpenNew ?? false);
  const [pendingSend, startTransition] = useTransition();

  const pending = reminders.filter((r) => r.status === "pending");
  const done = reminders.filter((r) => r.status !== "pending");

  function testTelegram() {
    startTransition(async () => {
      const res = await fetch("/api/telegram/test", { method: "POST" });
      const json = await res.json();
      if (json.ok) toast("Test message sent to Telegram", "success");
      else toast(json.error ?? "Telegram not configured", "error");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Reminders</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {pending.length} pending · {done.length} done
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={testTelegram} loading={pendingSend}>
            <Send className="mr-1 h-4 w-4" /> Test Telegram
          </Button>
          <Button onClick={() => setOpen(true)}>New reminder</Button>
        </div>
      </div>

      <ReminderList reminders={reminders} />

      {reminders.length === 0 && (
        <EmptyState
          icon={<Bell className="h-5 w-5" />}
          title="No reminders"
          description="Reminders ping you on Telegram. Connect Telegram in Settings, then create one here."
          action={{ label: "New reminder", onClick: () => setOpen(true) }}
        />
      )}

      {logs.length > 0 && (
        <Card>
          <CardHeader title="Delivery history" description="Recent Telegram sends" />
          <CardBody className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2 text-sm">
                <span className="truncate text-ink-soft">{(log.message ?? "").replace(/<[^>]+>/g, "")}</span>
                <span className="ml-2 flex items-center gap-2">
                  <Badge tone={log.status === "sent" ? "accent" : "danger"}>{log.status}</Badge>
                  <span className="text-xs text-ink-muted">
                    {new Date(log.sent_at).toLocaleString()}
                  </span>
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <ReminderFormDialog open={open} onClose={() => setOpen(false)} ctx={ctx} defaultRelated={defaultRelated} />
    </div>
  );
}
