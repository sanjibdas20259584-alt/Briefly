import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { listAutomationRules } from "@/lib/actions/automation";
import { AutomationClient } from "@/components/automation/automation-client";

export default async function AutomationPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rules = await listAutomationRules();

  return <AutomationClient rules={rules} />;
}
