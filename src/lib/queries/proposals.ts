import { getServerSupabase } from "@/lib/supabase/server";
import type { Proposal, ProposalItem, Client } from "@/lib/types";

export async function listProposals(status?: string): Promise<Proposal[]> {
  const supabase = await getServerSupabase();
  let q = supabase
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (status && status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as Proposal[];
}

export async function getProposalDetail(id: string) {
  const supabase = await getServerSupabase();
  const [propRes, itemsRes, clientsRes] = await Promise.all([
    supabase.from("proposals").select("*").eq("id", id).single<Proposal>(),
    supabase.from("proposal_items").select("*").eq("proposal_id", id).order("position"),
    supabase.from("clients").select("id,name").order("name"),
  ]);
  let client: Client | null = null;
  if (propRes.data?.client_id) {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("id", propRes.data.client_id)
      .single<Client>();
    client = data;
  }
  return {
    proposal: propRes.data as Proposal | null,
    items: (itemsRes.data ?? []) as ProposalItem[],
    clients: (clientsRes.data ?? []) as Client[],
    client,
    error: propRes.error?.message ?? null,
  };
}
