/**
 * Server-side tool executor for the chatbot.
 * Maps tool names → server actions / direct queries. Never exposes secrets.
 */
import "server-only";

import { getServerSupabase } from "@/lib/supabase/server";
import {
  createClientAction,
  updateClientAction,
  deleteClientAction,
} from "@/lib/actions/clients";
import {
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
} from "@/lib/actions/projects";
import {
  createInvoiceAction,
  updateInvoiceAction,
  deleteInvoiceAction,
  setInvoiceStatusAction,
} from "@/lib/actions/invoices";
import {
  createProposalAction,
  updateProposalAction,
  deleteProposalAction,
  setProposalStatusAction,
} from "@/lib/actions/proposals";
import {
  createReminderAction,
  updateReminderAction,
  deleteReminderAction,
} from "@/lib/actions/reminders";

function toFormData(obj: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "object") fd.set(k, JSON.stringify(v));
    else if (typeof v === "boolean") fd.set(k, v ? "on" : "");
    else fd.set(k, String(v));
  }
  return fd;
}

function friendly(result: unknown): string {
  if (!result || typeof result !== "object") return JSON.stringify(result);
  const r = result as { ok?: boolean; error?: string; id?: string; data?: unknown };
  if (r.ok === false) return `Error: ${r.error ?? "Unknown error"}`;
  if (r.ok === true && r.id) return `Success. id=${r.id}`;
  if (r.ok === true && r.data !== undefined) {
    const data = r.data;
    if (Array.isArray(data)) return `Found ${data.length} item(s).\n${JSON.stringify(data, null, 2)}`;
    return `Success.\n${JSON.stringify(data, null, 2)}`;
  }
  if (r.ok === true) return "Success.";
  return JSON.stringify(result);
}

async function userId(): Promise<string | null> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function executeChatTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ ok: boolean; summary: string; raw?: unknown }> {
  try {
    const uid = await userId();
    if (!uid) return { ok: false, summary: "Unauthorized" };

    const supabase = await getServerSupabase();
    const limit = Math.min(Number(args.limit) || 50, 100);

    switch (name) {
      case "list_clients": {
        let q = supabase.from("clients").select("*").eq("user_id", uid).order("name").limit(limit);
        if (args.status) q = q.eq("status", String(args.status));
        if (args.query) {
          const s = String(args.query);
          q = q.or(`name.ilike.%${s}%,company.ilike.%${s}%,email.ilike.%${s}%`);
        }
        const { data, error } = await q;
        if (error) return { ok: false, summary: error.message };
        return {
          ok: true,
          summary: friendly({ ok: true, data }),
          raw: data,
        };
      }
      case "create_client": {
        const res = await createClientAction({}, toFormData(args));
        return { ok: !!res.ok, summary: friendly(res), raw: res };
      }
      case "update_client": {
        const { id, ...rest } = args;
        const res = await updateClientAction(String(id), {}, toFormData(rest));
        return { ok: !!res.ok, summary: friendly(res), raw: res };
      }
      case "delete_client": {
        const res = await deleteClientAction(String(args.id));
        return { ok: !!res.ok, summary: friendly(res), raw: res };
      }

      case "list_projects": {
        let q = supabase
          .from("projects")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (args.status) q = q.eq("status", String(args.status));
        if (args.client_id) q = q.eq("client_id", String(args.client_id));
        if (args.query) q = q.ilike("title", `%${String(args.query)}%`);
        const { data, error } = await q;
        if (error) return { ok: false, summary: error.message };
        return { ok: true, summary: friendly({ ok: true, data }), raw: data };
      }
      case "create_project": {
        const payload = {
          ...args,
          checklist: args.checklist ?? [],
          milestones: args.milestones ?? [],
        };
        const res = await createProjectAction({}, toFormData(payload));
        return { ok: !!res.ok, summary: friendly(res), raw: res };
      }
      case "update_project": {
        const { id, ...rest } = args;
        const payload = {
          ...rest,
          checklist: rest.checklist ?? [],
          milestones: rest.milestones ?? [],
        };
        const res = await updateProjectAction(String(id), {}, toFormData(payload));
        return { ok: !!res.ok, summary: friendly(res), raw: res };
      }
      case "delete_project": {
        const res = await deleteProjectAction(String(args.id));
        return { ok: !!res.ok, summary: friendly(res), raw: res };
      }

      case "list_invoices": {
        let q = supabase
          .from("invoices")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (args.status) q = q.eq("status", String(args.status));
        if (args.client_id) q = q.eq("client_id", String(args.client_id));
        const { data, error } = await q;
        if (error) return { ok: false, summary: error.message };
        return { ok: true, summary: friendly({ ok: true, data }), raw: data };
      }
      case "create_invoice": {
        const supabase2 = await getServerSupabase();
        const { data: num } = await supabase2.rpc("next_invoice_number", { p_user: uid });
        const draft = {
          client_id: args.client_id ?? null,
          invoice_number: String(num ?? `INV-${Date.now()}`),
          status: args.status ?? "draft",
          issue_date: args.issue_date ?? new Date().toISOString().slice(0, 10),
          due_date: args.due_date ?? null,
          tax_rate: Number(args.tax_rate ?? 0),
          discount: Number(args.discount ?? 0),
          payment_notes: args.payment_notes ?? null,
          items: (args.items as unknown[]) ?? [],
        };
        const fd = new FormData();
        fd.set("payload", JSON.stringify(draft));
        const res = await createInvoiceAction({}, fd);
        return {
          ok: !!res.ok,
          summary: res.ok
            ? `Created invoice ${draft.invoice_number}${res.id ? ` (${res.id})` : ""}`
            : friendly(res),
          raw: res,
        };
      }
      case "update_invoice": {
        const { id, ...rest } = args;
        if (rest.items || rest.invoice_number || rest.tax_rate !== undefined) {
          const { data: existing } = await supabase
            .from("invoices")
            .select("*, invoice_items(*)")
            .eq("id", String(id))
            .single();
          if (!existing) return { ok: false, summary: "Invoice not found" };
          const items =
            (rest.items as { description: string; quantity: number; rate: number }[]) ??
            (existing.invoice_items ?? []).map((it: { description: string; quantity: number; rate: number }) => ({
              description: it.description,
              quantity: it.quantity,
              rate: it.rate,
            }));
          const draft = {
            client_id: rest.client_id ?? existing.client_id,
            invoice_number: rest.invoice_number ?? existing.invoice_number,
            status: rest.status ?? existing.status,
            issue_date: rest.issue_date ?? existing.issue_date,
            due_date: rest.due_date ?? existing.due_date,
            tax_rate: rest.tax_rate ?? existing.tax_rate,
            discount: rest.discount ?? existing.discount,
            payment_notes: rest.payment_notes ?? existing.payment_notes,
            items,
          };
          const fd = new FormData();
          fd.set("payload", JSON.stringify(draft));
          const res = await updateInvoiceAction(String(id), {}, fd);
          return { ok: !!res.ok, summary: friendly(res), raw: res };
        }
        if (rest.status) {
          const res = await setInvoiceStatusAction(String(id), rest.status as never);
          return { ok: !!res.ok, summary: friendly(res), raw: res };
        }
        return { ok: false, summary: "Nothing to update" };
      }
      case "send_invoice": {
        const res = await setInvoiceStatusAction(String(args.id), "sent");
        return {
          ok: !!res.ok,
          summary: res.ok ? `Invoice marked as sent` : friendly(res),
          raw: res,
        };
      }
      case "delete_invoice": {
        const res = await deleteInvoiceAction(String(args.id));
        return { ok: !!res.ok, summary: friendly(res), raw: res };
      }

      case "list_proposals": {
        let q = supabase
          .from("proposals")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (args.status) q = q.eq("status", String(args.status));
        if (args.client_id) q = q.eq("client_id", String(args.client_id));
        const { data, error } = await q;
        if (error) return { ok: false, summary: error.message };
        return { ok: true, summary: friendly({ ok: true, data }), raw: data };
      }
      case "create_proposal": {
        const res = await createProposalAction({}, toFormData(args));
        return { ok: !!res.ok, summary: friendly(res), raw: res };
      }
      case "update_proposal": {
        const { id, ...rest } = args;
        if (rest.status && Object.keys(rest).length === 1) {
          const res = await setProposalStatusAction(String(id), rest.status as never);
          return { ok: !!res.ok, summary: friendly(res), raw: res };
        }
        const res = await updateProposalAction(String(id), {}, toFormData(rest));
        return { ok: !!res.ok, summary: friendly(res), raw: res };
      }
      case "send_proposal": {
        const res = await setProposalStatusAction(String(args.id), "sent");
        return {
          ok: !!res.ok,
          summary: res.ok ? "Proposal marked as sent" : friendly(res),
          raw: res,
        };
      }
      case "delete_proposal": {
        const res = await deleteProposalAction(String(args.id));
        return { ok: !!res.ok, summary: friendly(res), raw: res };
      }

      case "list_reminders": {
        let q = supabase
          .from("reminders")
          .select("*")
          .eq("user_id", uid)
          .order("due_at", { ascending: true })
          .limit(limit);
        if (args.status) q = q.eq("status", String(args.status));
        const { data, error } = await q;
        if (error) return { ok: false, summary: error.message };
        return { ok: true, summary: friendly({ ok: true, data }), raw: data };
      }
      case "create_reminder": {
        const res = await createReminderAction({}, toFormData(args));
        return { ok: !!res.ok, summary: friendly(res), raw: res };
      }
      case "update_reminder": {
        const { id, ...rest } = args;
        const res = await updateReminderAction(String(id), {}, toFormData(rest));
        return { ok: !!res.ok, summary: friendly(res), raw: res };
      }
      case "delete_reminder": {
        const res = await deleteReminderAction(String(args.id));
        return { ok: !!res.ok, summary: friendly(res), raw: res };
      }

      case "get_analytics": {
        const range = String(args.range || "30d");
        const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "1y" ? 365 : 30;
        const start = new Date();
        start.setDate(start.getDate() - days);
        const startISO = start.toISOString();

        const [invoicesRes, projectsRes, clientsRes, proposalsRes] = await Promise.all([
          supabase.from("invoices").select("*").eq("user_id", uid).gte("created_at", startISO),
          supabase.from("projects").select("*").eq("user_id", uid),
          supabase.from("clients").select("id").eq("user_id", uid),
          supabase.from("proposals").select("*").eq("user_id", uid).gte("created_at", startISO),
        ]);
        const invoices = invoicesRes.data ?? [];
        const paid = invoices.filter((i) => i.status === "paid");
        const outstanding = invoices
          .filter((i) => i.status === "sent" || i.status === "overdue")
          .reduce((s, i) => s + Number(i.total), 0);
        const totalRevenue = paid.reduce((s, i) => s + Number(i.total), 0);
        const data = {
          range,
          totalRevenue,
          outstanding,
          totalInvoices: invoices.length,
          paidCount: paid.length,
          totalClients: (clientsRes.data ?? []).length,
          totalProjects: (projectsRes.data ?? []).length,
          totalProposals: (proposalsRes.data ?? []).length,
        };
        return { ok: true, summary: friendly({ ok: true, data }), raw: data };
      }

      default:
        // Try memory tools
        if (name.startsWith("memory_")) {
          const { executeMemoryTool } = await import("@/lib/chat/memory-tools");
          return executeMemoryTool(name, args, uid);
        }
        // Try Google Drive tools
        if (name.startsWith("gdrive_")) {
          const { executeGDriveTool } = await import("@/lib/google-drive/tools");
          return executeGDriveTool(name, args, uid);
        }
        return { ok: false, summary: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return {
      ok: false,
      summary: e instanceof Error ? e.message : "Tool execution failed",
    };
  }
}
