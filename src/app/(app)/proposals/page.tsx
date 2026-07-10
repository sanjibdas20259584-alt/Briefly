import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSignature } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { listProposals } from "@/lib/queries/proposals";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ProposalsToolbar } from "@/components/proposals/proposals-toolbar";
import { formatDate } from "@/lib/utils";
import type { Proposal, ProposalStatus } from "@/lib/types";

const STATUS_TONE: Record<ProposalStatus, "muted" | "neutral" | "accent" | "warn" | "danger"> = {
  draft: "muted",
  sent: "neutral",
  viewed: "neutral",
  accepted: "accent",
  rejected: "danger",
  archived: "muted",
};

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const [proposals, clientsRes] = await Promise.all([
    listProposals(sp.status),
    supabase.from("clients").select("id,name").order("name"),
  ]);
  const clients = (clientsRes.data ?? []) as any[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Proposals</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {proposals.length} {proposals.length === 1 ? "proposal" : "proposals"}
        </p>
      </div>

      <ProposalsToolbar clients={clients} initialStatus={sp.status} />

      {proposals.length === 0 ? (
        <EmptyState
          icon={<FileSignature className="h-5 w-5" />}
          title="No proposals yet"
          description="Write a proposal with scope, timeline, pricing, terms, and a PDF export."
          action={{ label: "New proposal", href: "/proposals?new=1" }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {proposals.map((p) => (
            <Link key={p.id} href={`/proposals/${p.id}`}>
              <Card hoverable className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-medium text-ink">{p.title}</p>
                  <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  {clientName(clients, p.client_id)} · {formatDate(p.created_at)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function clientName(clients: any[], id?: string | null) {
  if (!id) return "—";
  return clients.find((c) => c.id === id)?.name ?? "—";
}
