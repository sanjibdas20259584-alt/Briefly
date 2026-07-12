"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type { InteractionType } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_TYPES: InteractionType[] = [
  "call",
  "email",
  "meeting",
  "whatsapp",
  "note",
  "other",
];

export async function createInteractionAction(prevState: unknown, fd: FormData) {
  const clientId = String(fd.get("client_id") ?? "");
  const type = String(fd.get("type") ?? "note") as InteractionType;
  const subject = String(fd.get("subject") ?? "").trim() || null;
  const content = String(fd.get("content") ?? "").trim() || null;
  const duration = fd.get("duration") ? Number(fd.get("duration")) : null;
  const outcome = String(fd.get("outcome") ?? "").trim() || null;
  const scheduledAt = String(fd.get("scheduled_at") ?? "") || null;

  if (!clientId || !UUID_RE.test(clientId))
    return { ok: false, error: "Invalid client." } as const;
  if (!VALID_TYPES.includes(type))
    return { ok: false, error: "Invalid interaction type." } as const;

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const { error } = await supabase.from("interactions").insert({
    user_id: user.id,
    client_id: clientId,
    type,
    subject,
    content,
    duration,
    outcome,
    scheduled_at: scheduledAt || null,
    completed_at: type !== "meeting" ? new Date().toISOString() : null,
  });
  if (error) return { ok: false, error: error.message } as const;

  await supabase
    .from("clients")
    .update({ last_contact_date: new Date().toISOString().slice(0, 10) })
    .eq("id", clientId);

  await supabase.rpc("log_activity", {
    p_action: "interaction",
    p_entity_type: "client",
    p_entity_id: clientId,
    p_summary: `Logged ${type}${subject ? `: ${subject}` : ""}`,
  });

  revalidatePath(`/clients/${clientId}`);
  return { ok: true } as const;
}

export async function deleteInteractionAction(
  interactionId: string,
  clientId: string
) {
  if (!UUID_RE.test(interactionId))
    return { ok: false, error: "Invalid id." } as const;

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("interactions")
    .delete()
    .eq("id", interactionId);
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath(`/clients/${clientId}`);
  return { ok: true } as const;
}
