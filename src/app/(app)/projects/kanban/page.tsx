import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { listProjects } from "@/lib/queries/projects";
import { KanbanBoard } from "@/components/projects/kanban-board";

export default async function KanbanPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [projects, clientsRes] = await Promise.all([
    listProjects(),
    supabase.from("clients").select("id,name").order("name"),
  ]);
  const clients = (clientsRes.data ?? []) as { id: string; name: string }[];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Projects — Kanban</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </p>
      </div>

      <KanbanBoard projects={projects} clients={clients} />
    </div>
  );
}
