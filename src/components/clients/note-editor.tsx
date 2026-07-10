"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { addNoteAction } from "@/lib/actions/clients";

export function NoteEditor({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, pending] = useFormAction<
    unknown,
    FormData
  >(async (_p, fd) => await addNoteAction(_p, fd), { ok: false });

  useEffect(() => {
    if (state && (state as any).ok === true) {
      toast("Note added", "success");
      router.refresh();
    }
    if (state && (state as any).ok === false && (state as any).error) {
      toast((state as any).error, "error");
    }
  }, [state, toast, router]);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-surface-border bg-surface-raised p-4">
      <input type="hidden" name="client_id" value={clientId} />
      <Input name="title" placeholder="Note title (optional)" />
      <Textarea name="body" placeholder="Add a note about this client…" required />
      <div className="flex justify-end">
        <Button type="submit" loading={pending} size="sm">
          Add note
        </Button>
      </div>
    </form>
  );
}
