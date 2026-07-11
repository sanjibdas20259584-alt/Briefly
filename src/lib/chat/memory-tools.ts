/**
 * Memory tools for the AI chatbot — let the AI save, search, and manage memories.
 */
import "server-only";
import {
  saveMemory,
  searchMemories,
  getRecentMemories,
  getMemoriesByCategory,
  getImportantMemories,
  deleteMemory,
} from "@/lib/chat/memory";
import type { FunctionDefinition } from "@/lib/chat/tools";
import type { MemoryCategory } from "@/lib/types";

export const MEMORY_TOOLS: FunctionDefinition[] = [
  {
    name: "memory_save",
    description: "Save an important piece of information to long-term memory. Use this when the user tells you something about themselves, their projects, preferences, instructions, or facts you should remember.",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "The information to remember" },
        category: {
          type: "string",
          enum: ["general", "project", "client", "preference", "instruction", "fact", "goal"],
          description: "Category of the memory",
        },
        importance: { type: "number", description: "Importance 1-10 (default 5). Use 7+ for critical info." },
        tags: { type: "array", items: { type: "string" }, description: "Tags for easy searching" },
      },
      required: ["content"],
    },
  },
  {
    name: "memory_search",
    description: "Search long-term memory for past information about projects, clients, preferences, or facts.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "number", default: 10 },
      },
      required: ["query"],
    },
  },
  {
    name: "memory_list",
    description: "List recent memories, optionally filtered by category.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["general", "project", "client", "preference", "instruction", "fact", "goal"],
        },
        limit: { type: "number", default: 20 },
      },
    },
  },
  {
    name: "memory_delete",
    description: "Delete a memory by its ID.",
    parameters: {
      type: "object",
      properties: {
        memory_id: { type: "string", description: "The memory ID to delete" },
      },
      required: ["memory_id"],
    },
  },
];

function friendly(result: unknown): string {
  if (!result || typeof result !== "object") return JSON.stringify(result);
  return JSON.stringify(result, null, 2);
}

export async function executeMemoryTool(
  name: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ ok: boolean; summary: string }> {
  try {
    switch (name) {
      case "memory_save": {
        const memory = await saveMemory(userId, args.content as string, {
          category: (args.category as MemoryCategory) ?? "general",
          importance: Number(args.importance) || 5,
          tags: (args.tags as string[]) ?? [],
        });
        if (!memory) return { ok: false, summary: "Failed to save memory" };
        return { ok: true, summary: `Memory saved: "${args.content}" [${memory.category}, importance ${memory.importance}]` };
      }
      case "memory_search": {
        const results = await searchMemories(userId, args.query as string, Number(args.limit) || 10);
        if (!results.length) return { ok: true, summary: "No memories found matching that query." };
        return {
          ok: true,
          summary: results.map((m) => `- [${m.category}] ${m.content}`).join("\n"),
        };
      }
      case "memory_list": {
        let results;
        if (args.category) {
          results = await getMemoriesByCategory(userId, args.category as MemoryCategory, Number(args.limit) || 20);
        } else {
          results = await getRecentMemories(userId, Number(args.limit) || 20);
        }
        if (!results.length) return { ok: true, summary: "No memories stored yet." };
        return {
          ok: true,
          summary: results.map((m) => `- [${m.category}] ${m.content}`).join("\n"),
        };
      }
      case "memory_delete": {
        const deleted = await deleteMemory(userId, args.memory_id as string);
        return { ok: deleted, summary: deleted ? "Memory deleted." : "Failed to delete memory." };
      }
      default:
        return { ok: false, summary: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { ok: false, summary: e instanceof Error ? e.message : "Memory operation failed" };
  }
}
