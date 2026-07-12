import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getServerSupabase } from "@/lib/supabase/server";
import { getFinanceData } from "@/lib/queries/finance";
import { FinanceClient } from "@/components/finance/finance-client";

export default async function FinancePage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [financeData, clientsRes, projectsRes] = await Promise.all([
    getFinanceData(),
    supabase.from("clients").select("id,name").order("name"),
    supabase.from("projects").select("id,title").order("title"),
  ]);

  const clients = (clientsRes.data ?? []) as { id: string; name: string }[];
  const projects = (projectsRes.data ?? []) as { id: string; title: string }[];

  return (
    <Suspense
      fallback={<div className="text-sm text-ink-soft">Loading finance…</div>}
    >
      <FinanceClient data={financeData} clients={clients} projects={projects} />
    </Suspense>
  );
}
