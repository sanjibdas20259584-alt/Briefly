import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  listCalendarEvents,
  listRemindersAsEvents,
  getCalendarContext,
} from "@/lib/queries/calendar";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const start = new Date(year, month, 1).toISOString();
  const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const [events, reminderEvents, ctx] = await Promise.all([
    listCalendarEvents(start, end),
    listRemindersAsEvents(),
    getCalendarContext(),
  ]);

  return (
    <CalendarView events={events} reminderEvents={reminderEvents} ctx={ctx} />
  );
}
