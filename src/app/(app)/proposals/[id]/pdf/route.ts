import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { buildProposalPdf } from "@/lib/pdf/proposal-pdf";
import type { Proposal, ProposalItem, Client } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: prop } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single<Proposal>();
  const { data: items } = await supabase
    .from("proposal_items")
    .select("*")
    .eq("proposal_id", id)
    .order("position");
  const { data: settings } = await supabase
    .from("app_settings")
    .select("owner_name")
    .eq("user_id", user.id)
    .single();

  let client: Client | null = null;
  if (prop?.client_id) {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("id", prop.client_id)
      .single<Client>();
    client = data;
  }
  if (!prop) return new Response("Not found", { status: 404 });

  const pdf = await buildProposalPdf({
    title: prop.title,
    clientName: client?.name ?? "Client",
    clientCompany: client?.company,
    ownerName: settings?.owner_name?.trim() || "Sanjib",
    scope: prop.scope,
    timeline: prop.timeline,
    pricing: prop.pricing,
    terms: prop.terms,
    items: (items ?? []) as ProposalItem[],
  });

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="proposal-${prop.id.slice(0, 8)}.pdf"`,
    },
  });
}
