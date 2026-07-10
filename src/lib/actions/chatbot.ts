"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ChatbotMessage } from "@/lib/types";

export async function saveMessagesAction(
  providerId: string | null,
  model: string | null,
  userMsg: string,
  assistantMsg: string
) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." } as const;

  await supabase.from("chatbot_messages").insert([
    { user_id: user.id, role: "user", content: userMsg, provider_id: providerId, model },
    { user_id: user.id, role: "assistant", content: assistantMsg, provider_id: providerId, model },
  ]);
  revalidatePath("/chatbot");
  return { ok: true } as const;
}

export async function clearChatAction() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false } as const;
  await supabase.from("chatbot_messages").delete().eq("user_id", user.id);
  revalidatePath("/chatbot");
  return { ok: true } as const;
}
