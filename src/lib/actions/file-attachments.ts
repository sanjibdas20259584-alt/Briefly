"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type { FileAttachment } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EntityType = "client" | "project" | "invoice" | "proposal";

export async function listFileAttachments(
  entityType: EntityType,
  entityId: string
): Promise<FileAttachment[]> {
  if (!UUID_RE.test(entityId)) return [];
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("file_attachments")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return (data ?? []) as FileAttachment[];
}

export async function createFileAttachment(
  entityType: EntityType,
  entityId: string,
  file: {
    file_name: string;
    file_url: string;
    file_size?: number;
    mime_type?: string;
    folder?: string;
  }
) {
  if (!UUID_RE.test(entityId)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const { data, error } = await supabase
    .from("file_attachments")
    .insert({
      user_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
      file_name: file.file_name,
      file_url: file.file_url,
      file_size: file.file_size,
      mime_type: file.mime_type,
      folder: file.folder,
    })
    .select()
    .single<FileAttachment>();
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath(`/${entityType}s/${entityId}`);
  return { ok: true, id: data.id } as const;
}

export async function deleteFileAttachment(attachmentId: string) {
  if (!UUID_RE.test(attachmentId)) return { ok: false, error: "Invalid id." } as const;
  const supabase = await getServerSupabase();

  const { data: attachment } = await supabase
    .from("file_attachments")
    .select("entity_type, entity_id")
    .eq("id", attachmentId)
    .single();

  const { error } = await supabase
    .from("file_attachments")
    .delete()
    .eq("id", attachmentId);
  if (error) return { ok: false, error: error.message } as const;

  if (attachment) {
    revalidatePath(`/${attachment.entity_type}s/${attachment.entity_id}`);
  }
  return { ok: true } as const;
}
