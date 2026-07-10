"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Client, ClientStatus, Note } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ClientInput {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  social?: Record<string, string>;
  notes?: string | null;
  status?: ClientStatus;
  tags?: string[];
  favorite?: boolean;
  last_contact_date?: string | null;
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

function parseSocial(raw: unknown): Record<string, string> {
  if (raw && typeof raw === "object") {
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>)
        .filter(([, v]) => v != null && String(v).trim() !== "")
        .map(([k, v]) => [k, String(v)])
    );
  }
  return {};
}

export async function createClientAction(prevState: unknown, fd: FormData) {
  const input: ClientInput = {
    name: String(fd.get("name") ?? "").trim(),
    company: String(fd.get("company") ?? "").trim() || null,
    email: String(fd.get("email") ?? "").trim() || null,
    phone: String(fd.get("phone") ?? "").trim() || null,
    website: String(fd.get("website") ?? "").trim() || null,
    notes: String(fd.get("notes") ?? "") || null,
    status: (String(fd.get("status") ?? "active") as ClientStatus) || "active",
    tags: parseTags(fd.get("tags")),
    favorite: fd.get("favorite") === "on",
    social: parseSocial(JSON.parse(String(fd.get("social") ?? "{}"))),
  };
  if (!input.name) return { ok: false, error: "Name is required." } as const;

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const { data, error } = await supabase
    .from("clients")
    .insert({ ...input, user_id: user.id })
    .select()
    .single<Client>();
  if (error) return { ok: false, error: error.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "create",
    p_entity_type: "client",
    p_entity_id: data.id,
    p_summary: `Added client ${input.name}`,
  });

  revalidatePath("/clients");
  revalidatePath("/");
  return { ok: true, id: data.id } as const;
}

export async function updateClientAction(
  id: string,
  prevState: unknown,
  fd: FormData
) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const input: Partial<ClientInput> = {
    name: String(fd.get("name") ?? "").trim(),
    company: String(fd.get("company") ?? "").trim() || null,
    email: String(fd.get("email") ?? "").trim() || null,
    phone: String(fd.get("phone") ?? "").trim() || null,
    website: String(fd.get("website") ?? "").trim() || null,
    notes: String(fd.get("notes") ?? "") || null,
    status: (String(fd.get("status") ?? "active") as ClientStatus) || "active",
    tags: parseTags(fd.get("tags")),
    favorite: fd.get("favorite") === "on",
    social: parseSocial(JSON.parse(String(fd.get("social") ?? "{}"))),
  };
  if (!input.name) return { ok: false, error: "Name is required." } as const;

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("clients")
    .update(input)
    .eq("id", id);
  if (error) return { ok: false, error: error.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "update",
    p_entity_type: "client",
    p_entity_id: id,
    p_summary: `Updated client "${input.name}"`,
  });
  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  revalidatePath("/activity");
  return { ok: true } as const;
}

export async function deleteClientAction(id: string) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { ok: false, error: error.message } as const;

  await supabase.rpc("log_activity", {
    p_action: "delete",
    p_entity_type: "client",
    p_entity_id: id,
    p_summary: `Removed client "${client?.name ?? id}"`,
  });
  revalidatePath("/clients");
  revalidatePath("/activity");
  return { ok: true } as const;
}

export async function toggleFavoriteAction(id: string, favorite: boolean) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  await supabase.from("clients").update({ favorite }).eq("id", id);
  revalidatePath("/clients");
  return { ok: true } as const;
}

export async function addNoteAction(prevState: unknown, fd: FormData) {
  const clientId = String(fd.get("client_id") ?? "");
  const title = String(fd.get("title") ?? "").trim() || null;
  const body = String(fd.get("body") ?? "").trim() || null;
  if (!clientId || !body)
    return { ok: false, error: "Note body is required." } as const;

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const { error } = await supabase
    .from("notes")
    .insert({ user_id: user.id, client_id: clientId, title, body });
  if (error) return { ok: false, error: error.message } as const;

  await supabase
    .from("clients")
    .update({ last_contact_date: new Date().toISOString().slice(0, 10) })
    .eq("id", clientId);

  await supabase.rpc("log_activity", {
    p_action: "note",
    p_entity_type: "client",
    p_entity_id: clientId,
    p_summary: "Added a note",
  });

  revalidatePath(`/clients/${clientId}`);
  return { ok: true } as const;
}

export async function deleteNoteAction(noteId: string, clientId: string) {
  if (!UUID_RE.test(noteId)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  await supabase.from("notes").delete().eq("id", noteId);
  revalidatePath(`/clients/${clientId}`);
  return { ok: true } as const;
}

// Client and Note types are available via @/lib/types
