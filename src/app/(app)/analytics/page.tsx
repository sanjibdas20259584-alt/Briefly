import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAnalytics, type AnalyticsRange } from "@/lib/queries/analytics";
import { AnalyticsClient } from "@/components/analytics/analytics-client";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const range = (["7d", "30d", "90d", "1y"].includes(sp.range ?? "")
    ? sp.range
    : "30d") as AnalyticsRange;

  const data = await getAnalytics(range);

  return (
    <Suspense fallback={<div className="text-sm text-ink-soft">Loading analytics…</div>}>
      <AnalyticsClient data={data} />
    </Suspense>
  );
}
