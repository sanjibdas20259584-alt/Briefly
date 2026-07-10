import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderKanban } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { listProjects } from "@/lib/queries/projects";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectsToolbar } from "@/components/projects/projects-toolbar";
import { formatDate } from "@/lib/utils";
import type { Project } from "@/lib/types";

const STATUS_TONE = {
  idea: "muted",
  active: "accent",
  waiting: "warn",
  completed: "neutral",
  archived: "muted",
} as const;
const PRIORITY_TONE = {
  low: "muted",
  medium: "neutral",
  high: "warn",
  urgent: "danger",
} as const;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const [projects, clientsRes] = await Promise.all([
    listProjects(sp.status),
    supabase.from("clients").select("id,name").order("name"),
  ]);
  const clients = (clientsRes.data ?? []) as { id: string; name: string }[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Projects</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </p>
      </div>

      <ProjectsToolbar clients={clients} initialStatus={sp.status} />

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-5 w-5" />}
          title="No projects yet"
          description="Track work for your clients. Add checklists, milestones, and progress."
          action={{ label: "New project", href: "/projects?new=1" }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const done = project.checklist.filter((c) => c.done).length;
  return (
    <Link href={`/projects/${project.id}`}>
      <Card hoverable className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{project.title}</p>
            <p className="mt-0.5 text-xs text-ink-soft">Due {formatDate(project.due_date, "—")}</p>
          </div>
          <Badge tone={STATUS_TONE[project.status]}>{project.status}</Badge>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-ink-soft">
            <span>Progress</span>
            <span>{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} />
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs">
          <Badge tone={PRIORITY_TONE[project.priority]}>{project.priority}</Badge>
          {project.checklist.length > 0 && (
            <span className="text-ink-soft">
              {done}/{project.checklist.length} tasks
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
