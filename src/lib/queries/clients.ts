import { getServerSupabase } from "@/lib/supabase/server";
import type { Client, Note, Project, Invoice, Proposal } from "@/lib/types";

export async function listClients(query?: string): Promise<Client[]> {
  const supabase = await getServerSupabase();
  let q = supabase.from("clients").select("*").order("updated_at", { ascending: false });
  if (query && query.trim()) {
    const term = `%${query.toLowerCase()}%`;
    q = q.or(
      `name.ilike.${term},company.ilike.${term},email.ilike.${term},phone.ilike.${term}`
    );
  }
  const { data } = await q.limit(200);
  return (data ?? []) as Client[];
}

export async function getClientDetail(id: string) {
  const supabase = await getServerSupabase();
  const [clientRes, projectsRes, invoicesRes, proposalsRes, notesRes] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single<Client>(),
      supabase
        .from("projects")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false })
        .limit(50)
      ,
      supabase
        .from("invoices")
        .select("*")
        .eq("client_id", id)
        .order("issue_date", { ascending: false })
        .limit(50),
      supabase
        .from("proposals")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("notes")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
  return {
    client: clientRes.data as Client | null,
    projects: (projectsRes.data ?? []) as Project[],
    invoices: (invoicesRes.data ?? []) as Invoice[],
    proposals: (proposalsRes.data ?? []) as Proposal[],
    notes: (notesRes.data ?? []) as Note[],
    error: (clientRes.error?.message ?? null) as string | null,
  };
}
