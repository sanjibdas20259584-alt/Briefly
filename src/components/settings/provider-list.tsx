"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Check, KeyRound, TestTube } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  deleteProviderAction,
  setDefaultProviderAction,
  testProviderAction,
} from "@/lib/actions/settings";
import { ProviderFormDialog } from "./provider-form-dialog";
import type { ModelProviderPublic } from "@/lib/types";

export function ProviderList({ providers }: { providers: ModelProviderPublic[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ModelProviderPublic | null>(null);

  function openEdit(p: ModelProviderPublic) {
    setEditing(p);
    setEditOpen(true);
  }
  function test(id: string) {
    startTransition(async () => {
      const res = await testProviderAction(id);
      if (res.ok) toast("Connection OK", "success");
      else toast(res.error ?? "Test failed", "error");
    });
  }
  function setDefault(id: string) {
    startTransition(async () => {
      await setDefaultProviderAction(id);
      router.refresh();
    });
  }
  function remove(id: string) {
    startTransition(async () => {
      await deleteProviderAction(id);
      router.refresh();
    });
  }

  if (providers.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        No providers yet. Add an OpenAI-compatible endpoint (e.g. OpenRouter) to use the assistant.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {providers.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-4 rounded-2xl border border-surface-border bg-surface-raised p-4"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-ink-soft">
            <KeyRound className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ink">{p.name}</p>
            <p className="truncate text-xs text-ink-soft">
              {p.base_url} · {p.model_name} · {p.has_key ? "key set" : "no key"}
            </p>
          </div>
          {p.is_default ? (
            <Badge tone="accent">default</Badge>
          ) : (
            <button
              onClick={() => setDefault(p.id)}
              disabled={pending}
              className="text-xs text-ink-soft hover:text-accent"
            >
              set default
            </button>
          )}
          <button
            onClick={() => test(p.id)}
            disabled={pending}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-surface"
            title="Test connection"
          >
            <TestTube className="h-4 w-4" />
          </button>
          <button
            onClick={() => openEdit(p)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-surface"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => remove(p.id)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <ProviderFormDialog open={editOpen} onClose={() => setEditOpen(false)} initial={editing} />
    </div>
  );
}
