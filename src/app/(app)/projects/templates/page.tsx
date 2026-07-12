import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LayoutTemplate } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { listTemplates } from "@/lib/actions/project-templates";
import { TemplateList } from "@/components/projects/template-list";
import { TemplateFormDialog } from "@/components/projects/template-form-dialog";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [templates, clientsRes] = await Promise.all([
    listTemplates(),
    supabase.from("clients").select("id,name").order("name"),
  ]);
  const clients = (clientsRes.data ?? []) as { id: string; name: string }[];
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft hover:bg-surface"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-ink">Project Templates</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Reusable templates to speed up project setup
            </p>
          </div>
        </div>
      </div>

      <TemplateList templates={templates} clients={clients} />

      <TemplateFormDialog
        open={sp.new === "1"}
        onClose={() => {}}
        clients={clients}
      />
    </div>
  );
}
