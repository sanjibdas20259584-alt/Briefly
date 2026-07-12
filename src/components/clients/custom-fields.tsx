"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Settings } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useFormAction } from "@/lib/use-form-action";
import {
  createCustomFieldAction,
  deleteCustomFieldAction,
  setCustomFieldValueAction,
} from "@/lib/actions/custom-fields";
import type { CustomField, CustomFieldValue, CustomFieldType } from "@/lib/types";

interface Props {
  fields: CustomField[];
  values: CustomFieldValue[];
  entityId: string;
}

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "checkbox", label: "Checkbox" },
];

function FieldValueInput({
  field,
  value,
  entityId,
}: {
  field: CustomField;
  value: string;
  entityId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, pending] = useFormAction<unknown, FormData>(
    async (_p, fd) =>
      (await setCustomFieldValueAction(_p, fd)) as any,
    {} as any
  );

  useEffect(() => {
    if (state && (state as any).ok === true) {
      toast("Saved", "success");
      router.refresh();
    }
    if (state && (state as any).ok === false && (state as any).error) {
      toast((state as any).error ?? "Failed to save", "error");
    }
  }, [state, router, toast]);

  if (field.field_type === "checkbox") {
    return (
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="field_id" value={field.id} />
        <input type="hidden" name="entity_id" value={entityId} />
        <input type="hidden" name="value" value={value === "true" ? "false" : "true"} />
        <button
          type="submit"
          disabled={pending}
          className={`h-5 w-5 rounded border-2 transition-colors ${
            value === "true"
              ? "border-accent bg-accent"
              : "border-surface-border bg-surface-raised"
          }`}
          aria-label={field.field_name}
        >
          {value === "true" && (
            <svg className="h-3 w-3 text-white" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z" />
            </svg>
          )}
        </button>
      </form>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="field_id" value={field.id} />
      <input type="hidden" name="entity_id" value={entityId} />
      {field.field_type === "select" && field.options ? (
        <Select
          name="value"
          defaultValue={value}
          onBlur={(e) => formAction(new FormData(e.target.closest("form")!))}
          className="h-9 max-w-xs text-sm"
        >
          <option value="">—</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      ) : (
        <Input
          name="value"
          type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"}
          defaultValue={value}
          onBlur={(e) => formAction(new FormData(e.target.closest("form")!))}
          className="h-9 max-w-xs text-sm"
          placeholder={
            field.field_type === "number"
              ? "0"
              : field.field_type === "date"
                ? ""
                : "Enter value…"
          }
        />
      )}
    </form>
  );
}

export function CustomFields({ fields, values, entityId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [state, formAction, pending] = useFormAction<unknown, FormData>(
    async (_p, fd) => (await createCustomFieldAction(_p, fd)) as any,
    {} as any
  );

  useEffect(() => {
    if (state && (state as any).ok === true) {
      toast("Field created", "success");
      setShowAdd(false);
      router.refresh();
    }
    if (state && (state as any).ok === false && (state as any).error) {
      toast((state as any).error ?? "Failed to create field", "error");
    }
  }, [state, router, toast]);

  async function handleDeleteField() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await deleteCustomFieldAction(deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (res.ok) {
      toast("Field deleted", "success");
      router.refresh();
    } else {
      toast(res.error ?? "Failed to delete", "error");
    }
  }

  const valueMap = new Map(values.map((v) => [v.field_id, v.value ?? ""]));

  return (
    <>
      <div className="space-y-4">
        {fields.length === 0 && !showAdd ? (
          <EmptyState
            icon={<Settings className="h-6 w-6" />}
            title="No custom fields"
            description="Add custom fields to store extra information about this client."
            action={{ label: "Add field", onClick: () => setShowAdd(true) }}
          />
        ) : (
          <>
            <div className="space-y-3">
              {fields.map((f) => (
                <Card key={f.id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium text-ink whitespace-nowrap">
                        {f.field_name}
                      </span>
                      <span className="text-xs text-ink-muted capitalize">
                        {f.field_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FieldValueInput
                        field={f}
                        value={valueMap.get(f.id) ?? ""}
                        entityId={entityId}
                      />
                      <button
                        onClick={() => setDeleteId(f.id)}
                        className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-red-500"
                        aria-label="Delete field"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="mr-1 h-4 w-4" /> Add field
            </Button>
          </>
        )}
      </div>

      <Dialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add custom field"
        size="sm"
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="entity_type" value="client" />
          <Field label="Field name" required htmlFor="cf-name">
            <Input id="cf-name" name="field_name" required placeholder="e.g. Budget" />
          </Field>
          <Field label="Type" htmlFor="cf-type">
            <Select id="cf-type" name="field_type" defaultValue="text">
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Options (comma-separated)"
            htmlFor="cf-options"
            hint="Only used for Select type"
          >
            <Input
              id="cf-options"
              name="options"
              placeholder="Option 1, Option 2, Option 3"
            />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="h-10 rounded-lg border border-surface-border bg-surface-raised px-4 text-sm font-medium text-ink hover:bg-surface"
            >
              Cancel
            </button>
            <Button type="submit" loading={pending}>
              Create field
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete field"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setDeleteId(null)}
              className="h-10 rounded-lg border border-surface-border bg-surface-raised px-4 text-sm font-medium text-ink hover:bg-surface"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteField}
              disabled={deleting}
              className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-70"
            >
              {deleting ? "Working…" : "Delete"}
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          Are you sure you want to delete this custom field? All values will be
          lost.
        </p>
      </Dialog>
    </>
  );
}
