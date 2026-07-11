/**
 * AI Memory system — long-term memory brain for the chatbot.
 * Stores and retrieves memories from the database.
 */
import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { AiMemory, MemoryCategory } from "@/lib/types";

/**
 * Save a memory to the database.
 */
export async function saveMemory(
  userId: string,
  content: string,
  opts: {
    category?: MemoryCategory;
    importance?: number;
    source?: string;
    tags?: string[];
  } = {}
): Promise<AiMemory | null> {
  const service = getServiceSupabase();
  const { data, error } = await service
    .from("ai_memories")
    .insert({
      user_id: userId,
      content,
      category: opts.category ?? "general",
      importance: opts.importance ?? 5,
      source: opts.source ?? "conversation",
      tags: opts.tags ?? [],
    })
    .select()
    .single();

  if (error) {
    console.error("[memory] Save failed:", error.message);
    return null;
  }
  return data as AiMemory;
}

/**
 * Search memories by content (text search).
 */
export async function searchMemories(
  userId: string,
  query: string,
  limit = 10
): Promise<AiMemory[]> {
  const service = getServiceSupabase();
  const { data, error } = await service
    .from("ai_memories")
    .select("*")
    .eq("user_id", userId)
    .ilike("content", `%${query}%`)
    .order("importance", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[memory] Search failed:", error.message);
    return [];
  }
  return (data ?? []) as AiMemory[];
}

/**
 * Get recent memories for context injection.
 */
export async function getRecentMemories(
  userId: string,
  limit = 20
): Promise<AiMemory[]> {
  const service = getServiceSupabase();
  const { data, error } = await service
    .from("ai_memories")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as AiMemory[];
}

/**
 * Get memories by category.
 */
export async function getMemoriesByCategory(
  userId: string,
  category: MemoryCategory,
  limit = 20
): Promise<AiMemory[]> {
  const service = getServiceSupabase();
  const { data } = await service
    .from("ai_memories")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category)
    .order("importance", { ascending: false })
    .limit(limit);

  return (data ?? []) as AiMemory[];
}

/**
 * Get the most important memories (high importance).
 */
export async function getImportantMemories(
  userId: string,
  limit = 10
): Promise<AiMemory[]> {
  const service = getServiceSupabase();
  const { data } = await service
    .from("ai_memories")
    .select("*")
    .eq("user_id", userId)
    .gte("importance", 7)
    .order("importance", { ascending: false })
    .limit(limit);

  return (data ?? []) as AiMemory[];
}

/**
 * Delete a memory.
 */
export async function deleteMemory(userId: string, memoryId: string): Promise<boolean> {
  const service = getServiceSupabase();
  const { error } = await service
    .from("ai_memories")
    .delete()
    .eq("id", memoryId)
    .eq("user_id", userId);

  return !error;
}

/**
 * Format memories for injection into system prompt.
 */
export function formatMemoriesForPrompt(memories: AiMemory[]): string {
  if (!memories.length) return "";
  return memories
    .map((m) => {
      const tags = m.tags?.length ? ` [${m.tags.join(", ")}]` : "";
      return `- [${m.category}] (importance: ${m.importance}) ${m.content}${tags}`;
    })
    .join("\n");
}

/**
 * Analyze a conversation and extract memories to save.
 * Called after each chat exchange to auto-save important information.
 */
export async function autoSaveMemories(
  userId: string,
  userMessage: string,
  assistantReply: string
): Promise<void> {
  // Keywords that indicate important information worth remembering
  const patterns: { regex: RegExp; category: MemoryCategory; importance: number }[] = [
    // Projects
    { regex: /(?:working on|building|project|app|website|software)\s+(?:called|named|for)\s+(.+)/i, category: "project", importance: 7 },
    { regex: /(?:my project|current project|next project|future project)\s+(.+)/i, category: "project", importance: 6 },
    // Goals
    { regex: /(?:my goal|want to|plan to|going to|need to)\s+(.+)/i, category: "goal", importance: 7 },
    // Preferences
    { regex: /(?:i prefer|i like|i want|i always|i never|my preference)\s+(.+)/i, category: "preference", importance: 6 },
    // Instructions
    { regex: /(?:always|never|make sure|remember to|don't)\s+(.+)/i, category: "instruction", importance: 8 },
    // Clients
    { regex: /(?:client|customer|contact)\s+(?:named?|called?)\s+(.+)/i, category: "client", importance: 6 },
    // Facts
    { regex: /(?:my name is|i am|i'm|my email|my phone|my company)\s+(.+)/i, category: "fact", importance: 7 },
  ];

  const combinedText = `${userMessage} ${assistantReply}`;

  for (const pattern of patterns) {
    const match = combinedText.match(pattern.regex);
    if (match) {
      const content = match[0].trim();
      if (content.length > 10 && content.length < 500) {
        await saveMemory(userId, content, {
          category: pattern.category,
          importance: pattern.importance,
          source: "auto-extract",
        });
      }
    }
  }
}
