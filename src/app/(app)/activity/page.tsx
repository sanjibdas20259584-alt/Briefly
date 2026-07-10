import { redirect } from "next/navigation";
import { Activity as ActivityIcon } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { getRecentActivity, ENTITY_LABEL } from "@/lib/queries/activity";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";

export default async function ActivityPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activity = await getRecentActivity(100);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Activity</h1>
        <p className="mt-1 text-sm text-ink-soft">Everything you do in Briefly, logged privately.</p>
      </div>

      {activity.length === 0 ? (
        <EmptyState
          icon={<ActivityIcon className="h-5 w-5" />}
          title="No activity yet"
          description="Create a client, project, invoice, or proposal and it will show up here."
        />
      ) : (
        <Card className="p-4">
          <ul className="space-y-1">
            {activity.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface"
              >
                <div className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">
                    <span className="font-medium">
                      {ENTITY_LABEL[a.entity_type] ?? a.entity_type}
                    </span>{" "}
                    {a.summary}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-ink-muted">
                  {formatDateTime(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
