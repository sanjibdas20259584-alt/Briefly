/** OpenAI-compatible tool definitions for the freelancing assistant. */

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const CHAT_TOOLS: FunctionDefinition[] = [
  {
    name: "list_clients",
    description: "List clients, optionally filtered by status or search query",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["active", "lead", "inactive"] },
        query: { type: "string", description: "Search name/company/email" },
        limit: { type: "number", default: 50 },
      },
    },
  },
  {
    name: "create_client",
    description: "Create a new client",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        company: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        website: { type: "string" },
        notes: { type: "string" },
        status: { type: "string", enum: ["active", "lead", "inactive"] },
        tags: { type: "array", items: { type: "string" } },
        favorite: { type: "boolean" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_client",
    description: "Update an existing client by id",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        company: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        website: { type: "string" },
        notes: { type: "string" },
        status: { type: "string", enum: ["active", "lead", "inactive"] },
        tags: { type: "array", items: { type: "string" } },
        favorite: { type: "boolean" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_client",
    description: "Delete a client by id",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "list_projects",
    description: "List projects with optional filters",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["idea", "active", "waiting", "completed", "archived"],
        },
        client_id: { type: "string" },
        query: { type: "string" },
        limit: { type: "number", default: 50 },
      },
    },
  },
  {
    name: "create_project",
    description: "Create a project",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        client_id: { type: "string" },
        description: { type: "string" },
        status: {
          type: "string",
          enum: ["idea", "active", "waiting", "completed", "archived"],
        },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        start_date: { type: "string" },
        due_date: { type: "string" },
        progress: { type: "number" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_project",
    description: "Update a project by id",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        client_id: { type: "string" },
        description: { type: "string" },
        status: {
          type: "string",
          enum: ["idea", "active", "waiting", "completed", "archived"],
        },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        start_date: { type: "string" },
        due_date: { type: "string" },
        progress: { type: "number" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_project",
    description: "Delete a project",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "list_invoices",
    description: "List invoices with optional filters",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["draft", "sent", "paid", "overdue", "cancelled"],
        },
        client_id: { type: "string" },
        limit: { type: "number", default: 50 },
      },
    },
  },
  {
    name: "create_invoice",
    description: "Create an invoice with line items",
    parameters: {
      type: "object",
      properties: {
        client_id: { type: "string" },
        status: {
          type: "string",
          enum: ["draft", "sent", "paid", "overdue", "cancelled"],
        },
        issue_date: { type: "string" },
        due_date: { type: "string" },
        tax_rate: { type: "number" },
        discount: { type: "number" },
        payment_notes: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              rate: { type: "number" },
            },
            required: ["description", "rate"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "update_invoice",
    description: "Update an invoice (including status and items)",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        client_id: { type: "string" },
        status: {
          type: "string",
          enum: ["draft", "sent", "paid", "overdue", "cancelled"],
        },
        issue_date: { type: "string" },
        due_date: { type: "string" },
        tax_rate: { type: "number" },
        discount: { type: "number" },
        payment_notes: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              rate: { type: "number" },
            },
          },
        },
      },
      required: ["id"],
    },
  },
  {
    name: "send_invoice",
    description: "Mark an invoice as sent",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "delete_invoice",
    description: "Delete an invoice",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "list_proposals",
    description: "List proposals",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["draft", "sent", "viewed", "accepted", "rejected", "archived"],
        },
        client_id: { type: "string" },
        limit: { type: "number", default: 50 },
      },
    },
  },
  {
    name: "create_proposal",
    description: "Create a proposal",
    parameters: {
      type: "object",
      properties: {
        client_id: { type: "string" },
        title: { type: "string" },
        scope: { type: "string" },
        timeline: { type: "string" },
        pricing: { type: "string" },
        terms: { type: "string" },
        status: {
          type: "string",
          enum: ["draft", "sent", "viewed", "accepted", "rejected", "archived"],
        },
      },
      required: ["title"],
    },
  },
  {
    name: "update_proposal",
    description: "Update a proposal",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        client_id: { type: "string" },
        title: { type: "string" },
        scope: { type: "string" },
        timeline: { type: "string" },
        pricing: { type: "string" },
        terms: { type: "string" },
        status: {
          type: "string",
          enum: ["draft", "sent", "viewed", "accepted", "rejected", "archived"],
        },
      },
      required: ["id"],
    },
  },
  {
    name: "send_proposal",
    description: "Mark a proposal as sent",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "delete_proposal",
    description: "Delete a proposal",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "list_reminders",
    description: "List reminders",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pending", "done", "skipped"] },
        limit: { type: "number", default: 50 },
      },
    },
  },
  {
    name: "create_reminder",
    description: "Create a reminder (due_at ISO 8601)",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        note: { type: "string" },
        due_at: { type: "string" },
        repeat: { type: "string", enum: ["none", "daily", "weekly", "monthly"] },
        related_type: {
          type: "string",
          enum: ["client", "project", "invoice", "proposal"],
        },
        related_id: { type: "string" },
      },
      required: ["title", "due_at"],
    },
  },
  {
    name: "update_reminder",
    description: "Update a reminder",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        note: { type: "string" },
        due_at: { type: "string" },
        repeat: { type: "string", enum: ["none", "daily", "weekly", "monthly"] },
        status: { type: "string", enum: ["pending", "done", "skipped"] },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_reminder",
    description: "Delete a reminder",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "get_analytics",
    description: "Get revenue and pipeline analytics for a date range",
    parameters: {
      type: "object",
      properties: {
        range: { type: "string", enum: ["7d", "30d", "90d", "1y"], default: "30d" },
      },
    },
  },
];

export function toolsAsOpenAI(): { type: "function"; function: FunctionDefinition }[] {
  // Import Google Drive tools dynamically to avoid circular deps
  const allTools = [...CHAT_TOOLS];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GOOGLE_DRIVE_TOOLS } = require("@/lib/google-drive/tools");
    allTools.push(...GOOGLE_DRIVE_TOOLS);
  } catch {
    // Google Drive not available
  }
  return allTools.map((f) => ({ type: "function" as const, function: f }));
}

export function buildSystemPrompt(ctx: {
  ownerName: string;
  activeProjects: { title: string; status: string }[];
  unpaidInvoices: { invoice_number: string; total: number; status: string }[];
  upcomingReminders: { title: string; due_at: string }[];
  clients: { id?: string; name?: string }[];
  openProposals: { title?: string }[];
}): string {
  const due = (d: string) => new Date(d).toLocaleDateString();
  const today = new Date().toISOString().split("T")[0];
  return [
    `You are Briefly — a calm, practical personal freelancing assistant for ${ctx.ownerName}.`,
    `Today is ${today}.`,
    `Help with prioritization, follow-ups, proposals, invoices, and outreach.`,
    `Be concise and specific. Prefer using tools when the user asks to create, update, list, or change data.`,
    `After tool use, summarize what you did in plain language.`,
    ``,
    `CONTEXT:`,
    `- Active projects: ${ctx.activeProjects.map((p) => `${p.title} (${p.status})`).join(", ") || "none"}`,
    `- Unpaid invoices: ${
      ctx.unpaidInvoices
        .map((i) => `${i.invoice_number} $${i.total} (${i.status})`)
        .join(", ") || "none"
    }`,
    `- Upcoming reminders: ${
      ctx.upcomingReminders.map((r) => `${r.title} @ ${due(r.due_at)}`).join(", ") || "none"
    }`,
    `- Total clients: ${ctx.clients?.length ?? 0}`,
    `- Open proposals: ${ctx.openProposals?.length ?? 0}`,
    ``,
    `You also have access to the user's Google Drive (gdrive_* tools). You can list, search,`,
    `read, create, rename, move, delete, share, and trash files and folders. Use these tools`,
    `when the user asks about their files, documents, or wants to manage Google Drive.`,
  ].join("\n");
}
