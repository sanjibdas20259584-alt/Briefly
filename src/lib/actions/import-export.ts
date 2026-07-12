"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import type { Client, Project, Invoice } from "@/lib/types";

// ─── Export ─────────────────────────────────────────────────────────────────

export async function exportDataAction(
  _prevState: unknown,
  _fd: FormData
): Promise<{ ok: boolean; error?: string; data?: string }> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const [clientsRes, projectsRes, invoicesRes] = await Promise.all([
    supabase.from("clients").select("*").order("created_at"),
    supabase.from("projects").select("*").order("created_at"),
    supabase.from("invoices").select("*, invoice_items(*)").order("created_at"),
  ]);

  if (clientsRes.error) return { ok: false, error: clientsRes.error.message };
  if (projectsRes.error) return { ok: false, error: projectsRes.error.message };
  if (invoicesRes.error) return { ok: false, error: invoicesRes.error.message };

  const exportPayload = {
    exported_at: new Date().toISOString(),
    clients: (clientsRes.data ?? []) as Client[],
    projects: (projectsRes.data ?? []) as Project[],
    invoices: (invoicesRes.data ?? []) as Invoice[],
  };

  return { ok: true, data: JSON.stringify(exportPayload, null, 2) };
}

// ─── Import Clients ─────────────────────────────────────────────────────────

interface ImportableClient {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
  status?: string;
  tags?: string[];
}

export async function importClientsAction(
  _prevState: unknown,
  json: string
): Promise<{ ok: boolean; error?: string; imported?: number }> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }

  const raw: ImportableClient[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as any)?.clients)
      ? (parsed as any).clients
      : [];

  if (raw.length === 0) {
    return { ok: false, error: "No clients found in the data." };
  }

  const rows = raw
    .filter((c) => c.name && typeof c.name === "string")
    .map((c) => ({
      user_id: user.id,
      name: c.name.trim(),
      company: c.company ?? null,
      email: c.email ?? null,
      phone: c.phone ?? null,
      website: c.website ?? null,
      notes: c.notes ?? null,
      status: c.status ?? "active",
      tags: Array.isArray(c.tags) ? c.tags : [],
    }));

  if (rows.length === 0) {
    return { ok: false, error: "No valid clients found (each must have a name)." };
  }

  const { error } = await supabase.from("clients").insert(rows);
  if (error) return { ok: false, error: error.message };

  return { ok: true, imported: rows.length };
}

// ─── Template ───────────────────────────────────────────────────────────────

export function getTemplateData(): string {
  const template = {
    clients: [
      {
        name: "Acme Corp",
        company: "Acme Corporation",
        email: "hello@acme.com",
        phone: "+1 555-0100",
        website: "https://acme.com",
        notes: "Key client",
        status: "active",
        tags: ["vip", "recurring"],
      },
    ],
  };
  return JSON.stringify(template, null, 2);
}
