"use server";

import { getServerSupabase } from "@/lib/supabase/server";

export async function getNextInvoiceNumber(): Promise<string> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "INV-XXXXXX-001";
  const { data } = await supabase.rpc("next_invoice_number", { p_user: user.id });
  return String(data);
}
