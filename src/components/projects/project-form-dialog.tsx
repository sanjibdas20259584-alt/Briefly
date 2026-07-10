"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  createProjectAction,
  updateProjectAction,
} from "@/lib/actions/projects";
import type { Project, ChecklistItem, Milestone } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: Project | null;
  clients: { id: string; name: string }[];
  defaultClientId?: string;
}
interface Result {
  ok: boolean;
  error?: string;
  id?: string;
}

function useUid() {
  return `c_${Math.random().toString(36).slice(2, 9)}`;
}

export function ProjectFormDialog({
  open,
  onClose,
  initial,
  clients,
  defaultClientId,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, pending] = useFormAction<unknown, FormData>(
    async (prevState, fd) =>
      (initial
        ? await updateProjectAction(initial.id, prevState, fd)
        : await createProjectAction(prevState, fd)) as Result,
    {} as Result
  );

  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    initial?.checklist ?? []
  );
  const [milestones, setMilestones] = useState<Milestone[]>(
    initial?.milestones ?? []
  );

  useEffect(() => {
    if (state && (state as Result).ok === true) {
      toast(initial ? "Project updated" : "Project created", "success");
      if (!initial && (state as Result).id) router.push(`/projects/${(state as Result).id}`);
      onClose();
      router.refresh();
    }
    if (state && (state as Result).ok === false && (state as Result).error) {
      toast((state as Result).error ?? "Something went wrong", "error");
    }
  }, [state, initial, router, onClose, toast]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? "Edit project" : "New project"}
      size="lg"
    >
      <form action={formAction} className="space-y-4">
        <Field label="Title" required htmlFor="title">
          <Input id="title" name="title" required defaultValue={initial?.title ?? ""} />
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Client" htmlFor="client_id">
            <Select id="client_id" name="client_id" defaultValue={initial?.client_id ?? defaultClientId ?? ""}>
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={initial?.status ?? "idea"}>
              <option value="idea">Idea</option>
              <option value="active">Active</option>
              <option value="waiting">Waiting</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          <Field label="Priority" htmlFor="priority">
            <Select id="priority" name="priority" defaultValue={initial?.priority ?? "medium"}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </Field>
          <Field label="Progress (%)" htmlFor="progress">
            <Input
              id="progress"
              name="progress"
              type="number"
              min={0}
              max={100}
              defaultValue={initial?.progress ?? 0}
            />
          </Field>
          <Field label="Start date" htmlFor="start_date">
            <Input id="start_date" name="start_date" type="date" defaultValue={initial?.start_date ?? ""} />
          </Field>
          <Field label="Due date" htmlFor="due_date">
            <Input id="due_date" name="due_date" type="date" defaultValue={initial?.due_date ?? ""} />
          </Field>
        </div>
        <Field label="Description" htmlFor="description">
          <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} />
        </Field>

        {/* Checklist */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">Checklist</span>
          <div className="space-y-2 rounded-lg border border-surface-border bg-surface-raised p-3">
            {checklist.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={(e) =>
                    setChecklist((prev) =>
                      prev.map((c) => (c.id === item.id ? { ...c, done: e.target.checked } : c))
                    )
                  }
                  className="h-4 w-4 rounded border-surface-border text-accent"
                />
                <input
                  className="h-9 flex-1 rounded-md border border-surface-border bg-surface-raised px-3 text-sm"
                  value={item.text}
                  onChange={(e) =>
                    setChecklist((prev) =>
                      prev.map((c) => (c.id === item.id ? { ...c, text: e.target.value } : c))
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() => setChecklist((prev) => prev.filter((c) => c.id !== item.id))}
                  className="text-ink-soft hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setChecklist((prev) => [...prev, { id: useUid(), text: "", done: false }])
              }
              className="flex items-center gap-1 text-sm text-accent-hover"
            >
              <Plus className="h-4 w-4" /> Add item
            </button>
          </div>
          <input type="hidden" name="checklist" value={JSON.stringify(checklist)} />
        </div>

        {/* Milestones */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">Milestones</span>
          <div className="space-y-2 rounded-lg border border-surface-border bg-surface-raised p-3">
            {milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={m.done}
                  onChange={(e) =>
                    setMilestones((prev) =>
                      prev.map((x) => (x.id === m.id ? { ...x, done: e.target.checked } : x))
                    )
                  }
                  className="h-4 w-4 rounded border-surface-border text-accent"
                />
                <input
                  className="h-9 flex-1 rounded-md border border-surface-border bg-surface-raised px-3 text-sm"
                  value={m.title}
                  placeholder="Milestone name"
                  onChange={(e) =>
                    setMilestones((prev) =>
                      prev.map((x) => (x.id === m.id ? { ...x, title: e.target.value } : x))
                    )
                  }
                />
                <input
                  type="date"
                  className="h-9 rounded-md border border-surface-border bg-surface-raised px-2 text-sm"
                  value={m.due ?? ""}
                  onChange={(e) =>
                    setMilestones((prev) =>
                      prev.map((x) => (x.id === m.id ? { ...x, due: e.target.value } : x))
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() => setMilestones((prev) => prev.filter((x) => x.id !== m.id))}
                  className="text-ink-soft hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setMilestones((prev) => [...prev, { id: useUid(), title: "", done: false, due: null }])
              }
              className="flex items-center gap-1 text-sm text-accent-hover"
            >
              <Plus className="h-4 w-4" /> Add milestone
            </button>
          </div>
          <input type="hidden" name="milestones" value={JSON.stringify(milestones)} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-surface-border bg-surface-raised px-4 text-sm font-medium text-ink hover:bg-surface"
          >
            Cancel
          </button>
          <Button type="submit" loading={pending}>
            {initial ? "Save changes" : "Create project"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
