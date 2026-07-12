import { redirect, notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getProjectDetail } from "@/lib/queries/projects";
import { ProjectDetailClient } from "@/components/projects/project-detail-client";
import type { TimeEntry } from "@/lib/types";

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const projectId = (await params).id;
  const { project, clients, proposals, invoices, reminders } =
    await getProjectDetail(projectId);
  if (!project) notFound();

  let clientName: string | null = null;
  if (project.client_id) {
    const { data } = await supabase
      .from("clients")
      .select("name")
      .eq("id", project.client_id)
      .single();
    clientName = data?.name ?? null;
  }

  const linkedProposals = proposals.filter((p) => p.client_id === project.client_id);

  const { data: timeEntries } = await supabase
    .from("time_entries")
    .select("*")
    .eq("project_id", projectId)
    .order("started_at", { ascending: false });

  const { data: activeEntry } = await supabase
    .from("time_entries")
    .select("*")
    .is("ended_at", null)
    .eq("project_id", projectId)
    .limit(1)
    .single();

  return (
    <ProjectDetailClient
      project={project}
      clients={clients}
      proposals={linkedProposals}
      invoices={invoices}
      reminders={reminders}
      clientName={clientName}
      timeEntries={(timeEntries ?? []) as TimeEntry[]}
      activeEntry={(activeEntry as TimeEntry) ?? null}
    />
  );
}
