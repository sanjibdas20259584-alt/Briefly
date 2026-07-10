"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  deleteClientAction,
  toggleFavoriteAction,
} from "@/lib/actions/clients";
import { ClientFormDialog } from "./client-form-dialog";
import type { Client } from "@/lib/types";

export function ClientActionsBar({ client }: { client: Client }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  function onFavorite() {
    startTransition(async () => {
      await toggleFavoriteAction(client.id, !client.favorite);
      router.refresh();
    });
  }

  function onDelete() {
    startTransition(async () => {
      const res = await deleteClientAction(client.id);
      if (res.ok) {
        toast("Client removed", "success");
        router.push("/clients");
      } else {
        toast(res.error ?? "Could not delete", "error");
      }
    });
    setConfirmOpen(false);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onFavorite}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft transition-colors hover:bg-surface hover:text-ink"
        title={client.favorite ? "Unfavorite" : "Favorite"}
      >
        <Star
          className="h-4 w-4"
          fill={client.favorite ? "#10b981" : "none"}
          color={client.favorite ? "#10b981" : "currentColor"}
        />
      </button>
      <button
        onClick={() => setEditOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft transition-colors hover:bg-surface hover:text-ink"
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={() => setConfirmOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft transition-colors hover:bg-red-50 hover:text-red-600"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <ClientFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={client}
      />
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onDelete}
        title="Delete client?"
        message={`This will permanently remove ${client.name} and their related projects, invoices, and proposals. This cannot be undone.`}
        confirmLabel="Delete client"
        loading={pending}
      />
    </div>
  );
}
