import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { listReminders, getReminderContext } from "@/lib/queries/reminders";
import { RemindersClient } from "@/components/reminders/reminders-client";

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; project?: string }>;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const [reminders, ctx] = await Promise.all([listReminders(), getReminderContext()]);

  return (
    <RemindersClient
      reminders={reminders}
      ctx={ctx}
      logs={ctx.logs}
      defaultRelated={
        sp.project ? { type: "project", id: sp.project } : undefined
      }
      autoOpenNew={sp.new === "1"}
    />
  );
}
