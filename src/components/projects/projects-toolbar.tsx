"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ProjectFormDialog } from "./project-form-dialog";

export function ProjectsToolbar({
  clients,
  initialStatus,
  defaultClientId,
}: {
  clients: { id: string; name: string }[];
  initialStatus?: string;
  defaultClientId?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState(initialStatus ?? "all");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (params.get("new") === "1") setOpen(true);
  }, [params]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={status}
        onChange={(e) => {
          const sp = new URLSearchParams();
          if (e.target.value !== "all") sp.set("status", e.target.value);
          router.push(`/projects${sp.toString() ? "?" + sp.toString() : ""}`);
          setStatus(e.target.value);
        }}
        className="w-40"
      >
        <option value="all">All statuses</option>
        <option value="idea">Idea</option>
        <option value="active">Active</option>
        <option value="waiting">Waiting</option>
        <option value="completed">Completed</option>
        <option value="archived">Archived</option>
      </Select>
      <div className="ml-auto flex items-center gap-2">
        <Link href="/projects/kanban">
          <Button variant="ghost" size="sm">
            <LayoutGrid className="mr-1.5 h-4 w-4" />
            Kanban
          </Button>
        </Link>
        <Button onClick={() => setOpen(true)}>New project</Button>
      </div>
      <ProjectFormDialog
        open={open}
        onClose={() => setOpen(false)}
        clients={clients}
        defaultClientId={defaultClientId}
      />
    </div>
  );
}
