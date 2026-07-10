"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Pencil, Trash2, FileDown, Copy } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ProposalFormDialog } from "@/components/proposals/proposal-form-dialog";
import {
  deleteProposalAction,
  duplicateProposalAction,
  setProposalStatusAction,
} from "@/lib/actions/proposals";
import { formatDate, formatMoney } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { Proposal, ProposalItem, ProposalStatus } from "@/lib/types";

export function ProposalDetailClient({
  proposal,
  items,
  clients,
  clientName,
}: {
  proposal: Proposal;
  items: ProposalItem[];
  clients: { id: string; name: string }[];
  clientName: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const initialItems = items.map((i) => ({ description: i.description ?? "", amount: i.amount }));

  function mark(s: ProposalStatus) {
    startTransition(async () => {
      await setProposalStatusAction(proposal.id, s);
      router.refresh();
    });
  }
  function onDuplicate() {
    startTransition(async () => {
      const res = await duplicateProposalAction(proposal.id);
      if (res.ok && res.id) router.push(`/proposals/${res.id}`);
      else toast(res.error ?? "Failed", "error");
    });
  }
  function onDelete() {
    startTransition(async () => {
      const res = await deleteProposalAction(proposal.id);
      if (res.ok) {
        toast("Proposal removed", "success");
        router.push("/proposals");
      } else toast(res.error ?? "Failed", "error");
    });
  }

  const Section = ({ label, body }: { label: string; body?: string | null }) =>
    body ? (
      <div>
        <h3 className="mb-1 text-sm font-semibold text-ink">{label}</h3>
        <p className="whitespace-pre-wrap text-sm text-ink-soft">{body}</p>
      </div>
    ) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/proposals"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-surface"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-ink">{proposal.title}</h1>
            <p className="text-sm text-ink-soft">
              For {clientName ?? "—"} · Created {formatDate(proposal.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/proposals/${proposal.id}/pdf`} target="_blank">
            <button className="flex h-9 items-center gap-1 rounded-lg border border-surface-border bg-surface-raised px-3 text-sm text-ink-soft hover:bg-surface">
              <FileDown className="h-4 w-4" /> PDF
            </button>
          </Link>
          <button onClick={onDuplicate} className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-surface" title="Duplicate">
            <Copy className="h-4 w-4" />
          </button>
          <button onClick={() => setOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-surface" title="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setConfirm(true)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-red-50 hover:text-red-600" title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={proposal.status === "accepted" ? "accent" : proposal.status === "rejected" ? "danger" : "neutral"}>
              {proposal.status}
            </Badge>
            <div className="ml-auto flex gap-2">
              {proposal.status === "draft" && (
                <button onClick={() => mark("sent")} disabled={pending} className="h-9 rounded-lg border border-surface-border bg-surface-raised px-4 text-sm font-medium text-ink hover:bg-surface disabled:opacity-70">
                  Mark sent
                </button>
              )}
              {proposal.status !== "accepted" && (
                <button onClick={() => mark("accepted")} disabled={pending} className="h-9 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-70">
                  Mark accepted
                </button>
              )}
              {proposal.status !== "rejected" && (
                <button onClick={() => mark("rejected")} disabled={pending} className="h-9 rounded-lg border border-surface-border bg-surface-raised px-4 text-sm font-medium text-ink hover:bg-surface disabled:opacity-70">
                  Reject
                </button>
              )}
            </div>
          </div>

          <Section label="Scope of Work" body={proposal.scope} />
          <Section label="Timeline" body={proposal.timeline} />
          <Section label="Pricing" body={proposal.pricing} />

          {items.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">Items</h3>
              <div className="overflow-hidden rounded-xl border border-surface-border">
                <table className="w-full text-sm">
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id} className="border-t border-surface-border first:border-0">
                        <td className="p-3 text-ink">{it.description ?? "—"}</td>
                        <td className="p-3 text-right text-ink">{formatMoney(it.amount)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-surface-border bg-surface">
                      <td className="p-3 font-semibold text-ink">Total</td>
                      <td className="p-3 text-right font-semibold text-accent-hover">{formatMoney(total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Section label="Terms & Conditions" body={proposal.terms} />
        </CardBody>
      </Card>

      <ProposalFormDialog open={open} onClose={() => setOpen(false)} clients={clients} initial={proposal} initialItems={initialItems} />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={onDelete}
        title="Delete proposal?"
        message={`This permanently removes "${proposal.title}".`}
        confirmLabel="Delete proposal"
        loading={pending}
      />
    </div>
  );
}
