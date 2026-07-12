import { getServerSupabase } from "@/lib/supabase/server";
import type {
  Client,
  Note,
  Project,
  Invoice,
  Proposal,
  Interaction,
  CustomField,
  CustomFieldValue,
} from "@/lib/types";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [clientRes, projectsRes, invoicesRes, proposalsRes, notesRes, interactionsRes] =
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
      supabase
        .from("interactions")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  let customFields: CustomField[] = [];
  let customFieldValues: CustomFieldValue[] = [];

  if (user) {
    const [fieldsRes, valuesRes] = await Promise.all([
      supabase
        .from("custom_fields")
        .select("*")
        .eq("user_id", user.id)
        .eq("entity_type", "client")
        .order("position"),
      supabase
        .from("custom_field_values")
        .select("*")
        .eq("user_id", user.id)
        .eq("entity_id", id),
    ]);
    customFields = (fieldsRes.data ?? []) as CustomField[];
    customFieldValues = (valuesRes.data ?? []) as CustomFieldValue[];
  }

  return {
    client: clientRes.data as Client | null,
    projects: (projectsRes.data ?? []) as Project[],
    invoices: (invoicesRes.data ?? []) as Invoice[],
    proposals: (proposalsRes.data ?? []) as Proposal[],
    notes: (notesRes.data ?? []) as Note[],
    interactions: (interactionsRes.data ?? []) as Interaction[],
    customFields,
    customFieldValues,
    error: (clientRes.error?.message ?? null) as string | null,
  };
}
