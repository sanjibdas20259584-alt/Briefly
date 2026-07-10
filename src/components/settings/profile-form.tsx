"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { updateProfileAction } from "@/lib/actions/settings";
import { useFormAction } from "@/lib/use-form-action";

export function ProfileForm({ ownerName }: { ownerName: string }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useFormAction<
    unknown,
    FormData
  >(async (_p, fd) => await updateProfileAction(_p, fd), { ok: false });

  useEffect(() => {
    if (state && (state as any).ok === true) toast("Profile updated", "success");
    if (state && (state as any).ok === false && (state as any).error)
      toast((state as any).error, "error");
  }, [state, toast]);

  return (
    <form action={formAction} className="max-w-sm space-y-3">
      <Field label="Your name" required>
        <Input name="owner_name" required defaultValue={ownerName} />
      </Field>
      <Button type="submit" loading={pending}>
        Save
      </Button>
    </form>
  );
}
