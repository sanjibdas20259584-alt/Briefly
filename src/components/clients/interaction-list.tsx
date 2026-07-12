"use client";

import { useState } from "react";
import {
  Phone,
  Mail,
  CalendarDays,
  MessageCircle,
  StickyNote,
  MoreHorizontal,
  Trash2,
  Clock,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/dialog";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { deleteInteractionAction } from "@/lib/actions/interactions";
import type { Interaction, InteractionType } from "@/lib/types";

const TYPE_CONFIG: Record<
  InteractionType,
  { icon: typeof Phone; label: string; tone: "accent" | "neutral" | "warn" }
> = {
  call: { icon: Phone, label: "Call", tone: "accent" },
  email: { icon: Mail, label: "Email", tone: "neutral" },
  meeting: { icon: CalendarDays, label: "Meeting", tone: "warn" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp", tone: "accent" },
  note: { icon: StickyNote, label: "Note", tone: "neutral" },
  other: { icon: MoreHorizontal, label: "Other", tone: "neutral" },
};

export function InteractionList({
  interactions,
  clientId,
}: {
  interactions: Interaction[];
  clientId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await deleteInteractionAction(deleteId, clientId);
    setDeleting(false);
    setDeleteId(null);
    if (res.ok) {
      toast("Interaction deleted", "success");
      router.refresh();
    } else {
      toast(res.error ?? "Failed to delete", "error");
    }
  }

  if (!interactions.length) {
    return (
      <EmptyState
        title="No interactions yet"
        description="Log your first interaction with this client."
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {interactions.map((ix) => {
          const cfg = TYPE_CONFIG[ix.type] ?? TYPE_CONFIG.other;
          const Icon = cfg.icon;
          return (
            <Card key={ix.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-soft">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={cfg.tone}>{cfg.label}</Badge>
                    {ix.subject && (
                      <span className="text-sm font-medium text-ink truncate">
                        {ix.subject}
                      </span>
                    )}
                  </div>
                  {ix.content && (
                    <p className="mt-1.5 text-sm text-ink-soft whitespace-pre-wrap">
                      {ix.content}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                    {ix.duration != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ix.duration} min
                      </span>
                    )}
                    {ix.outcome && <span>Outcome: {ix.outcome}</span>}
                    <span>
                      {ix.completed_at
                        ? formatDateTime(ix.completed_at)
                        : ix.scheduled_at
                          ? `Scheduled ${formatDateTime(ix.scheduled_at)}`
                          : formatDate(ix.created_at)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteId(ix.id)}
                  className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-red-500"
                  aria-label="Delete interaction"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete interaction"
        message="Are you sure you want to delete this interaction? This cannot be undone."
        loading={deleting}
      />
    </>
  );
}
