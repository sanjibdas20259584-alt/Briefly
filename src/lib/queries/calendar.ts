import { getServerSupabase } from "@/lib/supabase/server";
import type { CalendarEvent, Reminder } from "@/lib/types";

export async function listCalendarEvents(
  start?: string,
  end?: string
): Promise<CalendarEvent[]> {
  const supabase = await getServerSupabase();
  let query = supabase
    .from("calendar_events")
    .select("*")
    .order("start_time", { ascending: true });

  if (start) query = query.gte("start_time", start);
  if (end) query = query.lte("start_time", end);

  const { data } = await query.limit(500);
  return (data ?? []) as CalendarEvent[];
}

export async function getCalendarMonthEvents(
  year: number,
  month: number
): Promise<CalendarEvent[]> {
  const start = new Date(year, month, 1).toISOString();
  const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
  return listCalendarEvents(start, end);
}

export async function listRemindersAsEvents(): Promise<CalendarEvent[]> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("reminders")
    .select("*")
    .neq("status", "skipped")
    .order("due_at", { ascending: true })
    .limit(200);

  const reminders = (data ?? []) as Reminder[];
  return reminders.map((r) => ({
    id: `reminder-${r.id}`,
    user_id: r.user_id,
    client_id: r.related_type === "client" ? r.related_id : null,
    project_id: r.related_type === "project" ? r.related_id : null,
    title: r.title,
    description: r.note,
    start_time: r.due_at,
    end_time: null,
    all_day: false,
    color: r.status === "done" ? "#10b981" : r.status === "skipped" ? "#94a3b8" : "#f59e0b",
    reminder: true,
    created_at: r.created_at,
  }));
}

export async function getCalendarContext() {
  const supabase = await getServerSupabase();
  const [clients, projects] = await Promise.all([
    supabase.from("clients").select("id,name").order("name"),
    supabase.from("projects").select("id,title").order("title"),
  ]);
  return {
    clients: (clients.data ?? []) as { id: string; name: string }[],
    projects: (projects.data ?? []) as { id: string; title: string }[],
  };
}
