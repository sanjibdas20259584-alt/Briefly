"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  createCalendarEventAction,
  updateCalendarEventAction,
} from "@/lib/actions/calendar";
import type { CalendarEvent } from "@/lib/types";

interface Ctx {
  clients: { id: string; name: string }[];
  projects: { id: string; title: string }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  ctx: Ctx;
  event?: CalendarEvent | null;
  defaultDate?: Date | null;
}

interface Result {
  ok: boolean;
  error?: string;
  id?: string;
}

function fmtLocal(d: Date) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function fmtLocalDate(d: Date) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export function EventFormDialog({
  open,
  onClose,
  ctx,
  event,
  defaultDate,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!event;

  const actionFn = isEdit
    ? (_p: unknown, fd: FormData) => updateCalendarEventAction(event.id, _p, fd)
    : (_p: unknown, fd: FormData) => createCalendarEventAction(_p, fd);

  const [state, formAction, pending] = useFormAction<unknown, FormData>(
    actionFn as (state: unknown, payload: FormData) => unknown | Promise<unknown>,
    {} as Result
  );

  const [allDay, setAllDay] = useState(event?.all_day ?? false);
  const [color, setColor] = useState(event?.color ?? "#10b981");

  useEffect(() => {
    if (state && (state as Result).ok === true) {
      toast(isEdit ? "Event updated" : "Event created", "success");
      onClose();
      router.refresh();
    }
    if (state && (state as Result).ok === false && (state as Result).error) {
      toast((state as Result).error ?? "Something went wrong", "error");
    }
  }, [state, onClose, router, toast, isEdit]);

  const defaultStart = event
    ? event.all_day
      ? event.start_time.slice(0, 10)
      : fmtLocal(new Date(event.start_time))
    : defaultDate
      ? fmtLocal(defaultDate)
      : fmtLocal(new Date());

  const defaultEnd = event?.end_time
    ? event.all_day
      ? event.end_time.slice(0, 10)
      : fmtLocal(new Date(event.end_time))
    : "";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit event" : "New event"}
      size="lg"
    >
      <form action={formAction} className="space-y-4">
        <Field label="Title" required htmlFor="title">
          <Input
            id="title"
            name="title"
            required
            placeholder="Meeting with client"
            defaultValue={event?.title}
          />
        </Field>
        <Field label="Description" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            placeholder="Optional description"
            defaultValue={event?.description ?? ""}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label={allDay ? "Date" : "Start time"}
            required
            htmlFor="start_time"
          >
            <Input
              id="start_time"
              name="start_time"
              type={allDay ? "date" : "datetime-local"}
              defaultValue={allDay ? fmtLocalDate(new Date(defaultStart)) : defaultStart}
              required
            />
          </Field>
          <Field label={allDay ? "End date" : "End time"} htmlFor="end_time">
            <Input
              id="end_time"
              name="end_time"
              type={allDay ? "date" : "datetime-local"}
              defaultValue={defaultEnd}
            />
          </Field>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="all_day"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="h-4 w-4 rounded border-surface-border accent-accent"
            />
            All day
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="reminder"
              defaultChecked={event?.reminder ?? true}
              className="h-4 w-4 rounded border-surface-border accent-accent"
            />
            Show as reminder
          </label>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Color</p>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? "var(--fg)" : "transparent",
                }}
                aria-label={`Color ${c}`}
              />
            ))}
            <input type="hidden" name="color" value={color} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Related client" htmlFor="client_id">
            <Select
              id="client_id"
              name="client_id"
              defaultValue={event?.client_id ?? ""}
            >
              <option value="">None</option>
              {ctx.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Related project" htmlFor="project_id">
            <Select
              id="project_id"
              name="project_id"
              defaultValue={event?.project_id ?? ""}
            >
              <option value="">None</option>
              {ctx.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>
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
            {isEdit ? "Save changes" : "Create event"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
