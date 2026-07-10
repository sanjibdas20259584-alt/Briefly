import { redirect, notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getProposalDetail } from "@/lib/queries/proposals";
import { ProposalDetailClient } from "@/components/proposals/proposal-detail-client";

export default async function ProposalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { proposal, items, clients, client } = await getProposalDetail((await params).id);
  if (!proposal) notFound();

  return (
    <ProposalDetailClient
      proposal={proposal}
      items={items}
      clients={clients}
      clientName={client?.name ?? null}
    />
  );
}
