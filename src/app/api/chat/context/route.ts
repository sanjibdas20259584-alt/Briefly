import { getServerSupabase } from "@/lib/supabase/server";
import type { ModelProviderPublic } from "@/lib/types";

export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const [
    settingsRes,
    clientsRes,
    projectsRes,
    invoicesRes,
    proposalsRes,
    remindersRes,
    providersRes,
    messagesRes,
  ] = await Promise.all([
    supabase.from("app_settings").select("owner_name").eq("user_id", user.id).single(),
    supabase.from("clients").select("id,name,status").order("name"),
    supabase.from("projects").select("id,title,status,due_date").eq("status", "active"),
    supabase
      .from("invoices")
      .select("id,invoice_number,total,due_date,status")
      .in("status", ["sent", "overdue"]),
    supabase
      .from("proposals")
      .select("id,title,status")
      .in("status", ["sent", "viewed", "draft"]),
    supabase
      .from("reminders")
      .select("id,title,due_at")
      .eq("status", "pending")
      .gte("due_at", new Date().toISOString()),
    supabase
      .from("model_providers")
      .select("id,user_id,name,base_url,model_name,headers,is_default,api_key_enc,created_at")
      .order("is_default", { ascending: false }),
    supabase
      .from("chatbot_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const providers: ModelProviderPublic[] = ((providersRes.data ?? []) as any[]).map(
    (p) => ({
      id: p.id,
      user_id: p.user_id,
      name: p.name,
      base_url: p.base_url,
      model_name: p.model_name,
      headers: p.headers ?? {},
      is_default: p.is_default,
      has_key: !!p.api_key_enc,
      created_at: p.created_at,
    })
  );

  return Response.json({
    ownerName: settingsRes.data?.owner_name?.trim() || "Sanjib",
    clients: clientsRes.data ?? [],
    activeProjects: projectsRes.data ?? [],
    unpaidInvoices: invoicesRes.data ?? [],
    openProposals: proposalsRes.data ?? [],
    upcomingReminders: remindersRes.data ?? [],
    providers,
    recentMessages: ((messagesRes.data ?? []) as any[]).reverse(),
  });
}
