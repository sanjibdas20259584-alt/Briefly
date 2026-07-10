import { getServerSupabase } from "@/lib/supabase/server";
import type {
  Client,
  Project,
  Invoice,
  Proposal,
  Reminder,
  ModelProviderPublic,
  ChatbotMessage,
} from "@/lib/types";

export interface ChatContext {
  ownerName: string;
  clients: Pick<Client, "id" | "name" | "status">[];
  activeProjects: Pick<Project, "id" | "title" | "status" | "due_date">[];
  unpaidInvoices: Pick<Invoice, "id" | "invoice_number" | "total" | "due_date" | "status">[];
  openProposals: Pick<Proposal, "id" | "title" | "status">[];
  upcomingReminders: Pick<Reminder, "id" | "title" | "due_at">[];
  providers: ModelProviderPublic[];
  recentMessages: ChatbotMessage[];
}

export async function getChatContext(): Promise<ChatContext> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

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
    supabase.from("invoices").select("id,invoice_number,total,due_date,status").in("status", ["sent", "overdue"]),
    supabase.from("proposals").select("id,title,status").in("status", ["sent", "viewed", "draft"]),
    supabase.from("reminders").select("id,title,due_at").eq("status", "pending").gte("due_at", new Date().toISOString()),
    supabase.from("model_providers").select("*").order("is_default", { ascending: false }),
    supabase
      .from("chatbot_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const providers = ((providersRes.data ?? []) as any[]).map((p) => ({
    id: p.id,
    user_id: p.user_id,
    name: p.name,
    base_url: p.base_url,
    model_name: p.model_name,
    headers: p.headers ?? {},
    is_default: p.is_default,
    has_key: !!p.api_key_enc,
    created_at: p.created_at,
  }));

  return {
    ownerName: settingsRes.data?.owner_name?.trim() || "Sanjib",
    clients: (clientsRes.data ?? []) as ChatContext["clients"],
    activeProjects: (projectsRes.data ?? []) as ChatContext["activeProjects"],
    unpaidInvoices: (invoicesRes.data ?? []) as ChatContext["unpaidInvoices"],
    openProposals: (proposalsRes.data ?? []) as ChatContext["openProposals"],
    upcomingReminders: (remindersRes.data ?? []) as ChatContext["upcomingReminders"],
    providers,
    recentMessages: ((messagesRes.data ?? []) as ChatbotMessage[]).reverse(),
  };
}
