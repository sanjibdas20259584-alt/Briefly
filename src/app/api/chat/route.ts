import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { processChatMessage, type ChatMessage } from "@/lib/chat/processor";

function jsonError(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const rawMessages: ChatMessage[] = body?.messages ?? [];
  const providerId: string | null = body?.providerId ?? null;

  // Drop client-supplied system messages; we inject our own.
  const messages = rawMessages.filter((m) => m.role !== "system");
  if (!messages.length) return jsonError("No messages", 400);

  // Build conversation history from previous messages (exclude the last one, which is the new user message)
  const history: ChatMessage[] = messages.length > 1
    ? messages.slice(0, -1).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        tool_calls: m.tool_calls,
        tool_call_id: m.tool_call_id,
        name: m.name,
      }))
    : [];

  const lastUserMessage = messages[messages.length - 1];
  const userText = lastUserMessage.content ?? "";

  const result = await processChatMessage(user.id, userText, history, providerId);

  if ("error" in result) {
    return jsonError(result.error, result.status);
  }

  return new Response(
    JSON.stringify({
      content: result.content,
      toolCalls: result.toolCalls,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
