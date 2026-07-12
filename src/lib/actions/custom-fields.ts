"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type { CustomFieldType } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_FIELD_TYPES: CustomFieldType[] = [
  "text",
  "number",
  "date",
  "select",
  "checkbox",
];

export async function createCustomFieldAction(prevState: unknown, fd: FormData) {
  const fieldName = String(fd.get("field_name") ?? "").trim();
  const fieldType = String(fd.get("field_type") ?? "text") as CustomFieldType;
  const entityType = String(fd.get("entity_type") ?? "client");
  const optionsRaw = String(fd.get("options") ?? "").trim();

  if (!fieldName)
    return { ok: false, error: "Field name is required." } as const;
  if (!VALID_FIELD_TYPES.includes(fieldType))
    return { ok: false, error: "Invalid field type." } as const;

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const options =
    fieldType === "select" && optionsRaw
      ? optionsRaw
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean)
      : null;

  const { data: maxPos } = await supabase
    .from("custom_fields")
    .select("position")
    .eq("user_id", user.id)
    .eq("entity_type", entityType)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const { error } = await supabase.from("custom_fields").insert({
    user_id: user.id,
    entity_type: entityType,
    field_name: fieldName,
    field_type: fieldType,
    options,
    position: (maxPos?.position ?? -1) + 1,
  });
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath("/clients");
  return { ok: true } as const;
}

export async function deleteCustomFieldAction(fieldId: string) {
  if (!UUID_RE.test(fieldId))
    return { ok: false, error: "Invalid id." } as const;

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("custom_fields")
    .delete()
    .eq("id", fieldId);
  if (error) return { ok: false, error: error.message } as const;

  revalidatePath("/clients");
  return { ok: true } as const;
}

export async function setCustomFieldValueAction(prevState: unknown, fd: FormData) {
  const fieldId = String(fd.get("field_id") ?? "");
  const entityId = String(fd.get("entity_id") ?? "");
  const value = String(fd.get("value") ?? "");

  if (!UUID_RE.test(fieldId) || !UUID_RE.test(entityId))
    return { ok: false, error: "Invalid id." } as const;

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  const { data: existing } = await supabase
    .from("custom_field_values")
    .select("id")
    .eq("field_id", fieldId)
    .eq("entity_id", entityId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("custom_field_values")
      .update({ value })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message } as const;
  } else {
    const { error } = await supabase.from("custom_field_values").insert({
      user_id: user.id,
      field_id: fieldId,
      entity_id: entityId,
      value,
    });
    if (error) return { ok: false, error: error.message } as const;
  }

  revalidatePath(`/clients/${entityId}`);
  return { ok: true } as const;
}
