"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Proposal, ProposalItem, ProposalStatus } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ProposalDraft {
  client_id?: string | null;
  title: string;
  scope?: string | null;
  timeline?: string | null;
  pricing?: string | null;
  terms?: string | null;
  status: ProposalStatus;
  items: { description: string; amount: number }[];
}

export async function createProposalAction(prevState: unknown, fd: FormData) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const raw = JSON.parse(String(fd.get("payload") ?? "{}")) as ProposalDraft;
  if (!raw.title) return { ok: false, error: "Title is required." } as const;
  if (raw.client_id && !UUID_RE.test(raw.client_id)) raw.client_id = null;

  const { data: prop, error } = await supabase
    .from("proposals")
    .insert({
      user_id: user.id,
      client_id: raw.client_id ?? null,
      title: raw.title,
      scope: raw.scope ?? null,
      timeline: raw.timeline ?? null,
      pricing: raw.pricing ?? null,
      terms: raw.terms ?? null,
      status: raw.status,
      acceptance_status: raw.status === "accepted" ? "accepted" : raw.status === "rejected" ? "rejected" : "pending",
      sent_at: raw.status === "sent" ? new Date().toISOString() : null,
    })
    .select()
    .single<Proposal>();
  if (error) return { ok: false, error: error.message } as const;

  if (raw.items?.length) {
    const items = raw.items.map((it, idx) => ({
      proposal_id: prop.id,
      description: it.description || null,
      amount: it.amount,
      position: idx,
    }));
    await supabase.from("proposal_items").insert(items);
  }

  await supabase.rpc("log_activity", {
    p_action: "create",
    p_entity_type: "proposal",
    p_entity_id: prop.id,
    p_summary: `Created proposal "${raw.title}"`,
  });
  revalidatePath("/proposals");
  revalidatePath("/");
  return { ok: true, id: prop.id } as const;
}

export async function updateProposalAction(
  id: string,
  prevState: unknown,
  fd: FormData
) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const raw = JSON.parse(String(fd.get("payload") ?? "{}")) as ProposalDraft;
  if (!raw.title) return { ok: false, error: "Title is required." } as const;
  if (raw.client_id && !UUID_RE.test(raw.client_id)) raw.client_id = null;

  const { error } = await supabase
    .from("proposals")
    .update({
      client_id: raw.client_id ?? null,
      title: raw.title,
      scope: raw.scope ?? null,
      timeline: raw.timeline ?? null,
      pricing: raw.pricing ?? null,
      terms: raw.terms ?? null,
      status: raw.status,
      acceptance_status:
        raw.status === "accepted" ? "accepted" : raw.status === "rejected" ? "rejected" : "pending",
      sent_at: raw.status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message } as const;

  await supabase.from("proposal_items").delete().eq("proposal_id", id);
  if (raw.items?.length) {
    const items = raw.items.map((it, idx) => ({
      proposal_id: id,
      description: it.description || null,
      amount: it.amount,
      position: idx,
    }));
    await supabase.from("proposal_items").insert(items);
  }

  await supabase.rpc("log_activity", {
    p_action: "update",
    p_entity_type: "proposal",
    p_entity_id: id,
    p_summary: `Updated proposal "${raw.title}"`,
  });
  revalidatePath(`/proposals/${id}`);
  revalidatePath("/proposals");
  revalidatePath("/activity");
  return { ok: true } as const;
}

export async function setProposalStatusAction(id: string, status: ProposalStatus) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("proposals")
    .update({
      status,
      acceptance_status:
        status === "accepted" ? "accepted" : status === "rejected" ? "rejected" : "pending",
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message } as const;
  await supabase.rpc("log_activity", {
    p_action: "status",
    p_entity_type: "proposal",
    p_entity_id: id,
    p_summary: `Marked proposal ${status}`,
  });
  revalidatePath(`/proposals/${id}`);
  revalidatePath("/proposals");
  revalidatePath("/activity");
  return { ok: true } as const;
}

export async function deleteProposalAction(id: string) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const { data } = await supabase.from("proposals").select("title").eq("id", id).single();
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) return { ok: false, error: error.message } as const;
  await supabase.rpc("log_activity", {
    p_action: "delete",
    p_entity_type: "proposal",
    p_entity_id: id,
    p_summary: `Removed proposal "${data?.title ?? id}"`,
  });
  revalidatePath("/proposals");
  revalidatePath("/activity");
  return { ok: true } as const;
}

export async function duplicateProposalAction(id: string) {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;
  const { data: prop } = await supabase.from("proposals").select("*").eq("id", id).single<Proposal>();
  const { data: items } = await supabase.from("proposal_items").select("*").eq("proposal_id", id).order("position");
  if (!prop) return { ok: false, error: "Not found." } as const;

  const { data: newProp, error } = await supabase
    .from("proposals")
    .insert({
      user_id: user.id,
      client_id: prop.client_id,
      title: `${prop.title} (copy)`,
      scope: prop.scope,
      timeline: prop.timeline,
      pricing: prop.pricing,
      terms: prop.terms,
      status: "draft",
    })
    .select()
    .single<Proposal>();
  if (error) return { ok: false, error: error.message } as const;
  if (items?.length) {
    await supabase.from("proposal_items").insert(
      items.map((it: ProposalItem) => ({
        proposal_id: newProp.id,
        description: it.description,
        amount: it.amount,
        position: it.position,
      }))
    );
  }
  await supabase.rpc("log_activity", {
    p_action: "create",
    p_entity_type: "proposal",
    p_entity_id: newProp.id,
    p_summary: `Duplicated proposal "${prop.title}"`,
  });
  revalidatePath("/proposals");
  return { ok: true, id: newProp.id } as const;
}
