"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { nanoid } from "nanoid";
import type { PortalToken, Client, Project, Invoice, Proposal, FileAttachment } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generatePortalToken(clientId: string) {
  if (!UUID_RE.test(clientId))
    return { ok: false, error: "Invalid client id." } as const;

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  // Check if client belongs to user
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .single();
  if (!client) return { ok: false, error: "Client not found." } as const;

  const token = nanoid(32);

  const { data, error } = await supabase
    .from("portal_tokens")
    .insert({
      user_id: user.id,
      client_id: clientId,
      token,
      expires_at: null, // No expiry for now
    })
    .select()
    .single<PortalToken>();
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath(`/clients/${clientId}`);
  return { ok: true, token: data.token } as const;
}

export async function revokePortalToken(tokenId: string) {
  if (!UUID_RE.test(tokenId))
    return { ok: false, error: "Invalid token id." } as const;

  const supabase = await getServerSupabase();
  const { error } = await supabase.from("portal_tokens").delete().eq("id", tokenId);
  if (error) return { ok: false, error: error.message } as const;

  return { ok: true } as const;
}

export async function getPortalTokens(clientId: string): Promise<PortalToken[]> {
  if (!UUID_RE.test(clientId)) return [];
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("portal_tokens")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data ?? []) as PortalToken[];
}

export interface PortalData {
  client: Client;
  projects: Project[];
  invoices: Invoice[];
  proposals: Proposal[];
  files: FileAttachment[];
}

export async function getPortalData(token: string): Promise<PortalData | null> {
  const supabase = getServiceSupabase();

  // Find token
  const { data: tokenData } = await supabase
    .from("portal_tokens")
    .select("client_id, user_id, expires_at")
    .eq("token", token)
    .single();

  if (!tokenData?.client_id) return null;

  // Check expiry
  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    return null;
  }

  // Get client data (using service role to bypass RLS)
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", tokenData.client_id)
    .single<Client>();

  if (!client) return null;

  // Get related data
  const [projectsRes, invoicesRes, proposalsRes, filesRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("client_id", tokenData.client_id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("invoices")
      .select("*")
      .eq("client_id", tokenData.client_id)
      .order("issue_date", { ascending: false })
      .limit(50),
    supabase
      .from("proposals")
      .select("*")
      .eq("client_id", tokenData.client_id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("file_attachments")
      .select("*")
      .eq("entity_type", "client")
      .eq("entity_id", tokenData.client_id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    client,
    projects: (projectsRes.data ?? []) as Project[],
    invoices: (invoicesRes.data ?? []) as Invoice[],
    proposals: (proposalsRes.data ?? []) as Proposal[],
    files: (filesRes.data ?? []) as FileAttachment[],
  };
}
