import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getChatContext } from "@/lib/queries/chat";
import { ChatWindow } from "@/components/chatbot/chat-window";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";

export default async function ChatbotPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await getChatContext();

  if (ctx.providers.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-xl font-semibold text-ink">Assistant</h1>
        <EmptyState
          title="No model provider yet"
          description="Add an OpenAI-compatible provider (like OpenRouter) in Settings, then chat with Briefly."
          action={{ label: "Go to Settings", href: "/settings" }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <ChatWindow ctx={ctx} />
    </div>
  );
}
