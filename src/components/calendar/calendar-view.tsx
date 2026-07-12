"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { EventFormDialog } from "./event-form-dialog";
import { deleteCalendarEventAction } from "@/lib/actions/calendar";
import type { CalendarEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Ctx {
  clients: { id: string; name: string }[];
  projects: { id: string; title: string }[];
}

interface Props {
  events: CalendarEvent[];
  reminderEvents: CalendarEvent[];
  ctx: Ctx;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function formatDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function CalendarView({ events, reminderEvents, ctx }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState<Date | null>(null);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const allEvents = useMemo(
    () => [...events, ...reminderEvents],
    [events, reminderEvents]
  );

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of allEvents) {
      const day = ev.start_time.slice(0, 10);
      if (!map[day]) map[day] = [];
      map[day].push(ev);
    }
    return map;
  }, [allEvents]);

  const calendarDays = useMemo(() => {
    const first = startOfMonth(currentDate);
    const last = endOfMonth(currentDate);
    const startPad = first.getDay();
    const totalDays = last.getDate();
    const cells: { date: Date; dayNum: number; inMonth: boolean }[] = [];

    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push({ date: d, dayNum: d.getDate(), inMonth: false });
    }
    for (let i = 1; i <= totalDays; i++) {
      cells.push({ date: new Date(year, month, i), dayNum: i, inMonth: true });
    }
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({ date: d, dayNum: d.getDate(), inMonth: false });
    }
    return cells;
  }, [year, month, currentDate]);

  const selectedEvents = selectedDay ? eventsByDay[selectedDay] ?? [] : [];

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  }

  function today() {
    setCurrentDate(new Date());
    setSelectedDay(formatDay(new Date()));
  }

  function openNew(date: Date) {
    setEditEvent(null);
    setFormDate(date);
    setFormOpen(true);
  }

  function openEdit(ev: CalendarEvent) {
    setFormDate(null);
    setEditEvent(ev);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteCalendarEventAction(deleteTarget.id);
    setDeleting(false);
    if (res.ok) {
      toast("Event deleted", "success");
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast(res.error ?? "Delete failed", "error");
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Calendar</h1>
          <p className="text-sm text-ink-soft">
            {new Intl.DateTimeFormat("en-US", {
              month: "long",
              year: "numeric",
            }).format(currentDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={today}
            className="h-9 rounded-lg border border-surface-border bg-surface-raised px-3 text-sm font-medium text-ink hover:bg-surface"
          >
            Today
          </button>
          <button
            onClick={prevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink hover:bg-surface"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink hover:bg-surface"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Button size="sm" onClick={() => openNew(new Date())}>
            <Plus className="mr-1 h-4 w-4" />
            Add event
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-surface-border bg-surface-raised">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-surface-border">
          {DAY_NAMES.map((d) => (
            <div
              key={d}
              className="px-2 py-2.5 text-center text-xs font-medium text-ink-muted"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell, i) => {
            const dayKey = formatDay(cell.date);
            const dayEvents = eventsByDay[dayKey] ?? [];
            const isToday = dayKey === formatDay(new Date());
            const isSelected = dayKey === selectedDay;

            return (
              <button
                key={i}
                onClick={() => setSelectedDay(dayKey)}
                className={cn(
                  "relative flex min-h-[5rem] flex-col border-b border-r border-surface-border p-1.5 text-left transition-colors hover:bg-surface",
                  !cell.inMonth && "bg-surface-subtle/50",
                  isSelected && "bg-accent-subtle",
                  i % 7 === 0 && "border-l-0"
                )}
              >
                <span
                  className={cn(
                    "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday && "bg-accent text-white",
                    !isToday && cell.inMonth && "text-ink",
                    !cell.inMonth && "text-ink-muted"
                  )}
                >
                  {cell.dayNum}
                </span>
                <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight text-white"
                      style={{ backgroundColor: ev.color ?? "#10b981" }}
                      title={ev.title}
                    >
                      {ev.reminder && <span>🔔</span>}
                      <span className="truncate">{ev.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-ink-muted">
                      +{dayEvents.length - 3} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day sidebar */}
      {selectedDay && (
        <div className="mt-4 rounded-xl border border-surface-border bg-surface-raised p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">
              {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openNew(new Date(selectedDay + "T12:00:00"))}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add
            </Button>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-ink-muted">No events on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 rounded-lg border border-surface-border bg-surface p-3"
                >
                  <div
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: ev.color ?? "#10b981" }}
                  />
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => openEdit(ev)}
                      className="text-left text-sm font-medium text-ink hover:text-accent"
                    >
                      {ev.title}
                    </button>
                    <p className="text-xs text-ink-soft">
                      {ev.all_day
                        ? "All day"
                        : formatTime(ev.start_time)}
                      {ev.end_time && ` – ${formatTime(ev.end_time)}`}
                    </p>
                    {ev.description && (
                      <p className="mt-1 text-xs text-ink-muted line-clamp-2">
                        {ev.description}
                      </p>
                    )}
                    {ev.reminder && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-0.5 text-[10px] font-medium text-accent">
                        Reminder
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setDeleteTarget(ev)}
                    className="text-ink-muted hover:text-red-500"
                    aria-label="Delete event"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming events list */}
      <div className="mt-4 rounded-xl border border-surface-border bg-surface-raised p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink">Upcoming events</h2>
        {allEvents.length === 0 ? (
          <p className="text-sm text-ink-muted">No upcoming events.</p>
        ) : (
          <div className="space-y-1.5">
            {allEvents.slice(0, 10).map((ev) => (
              <button
                key={ev.id}
                onClick={() => openEdit(ev)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface"
              >
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: ev.color ?? "#10b981" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {ev.title}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {formatDateShort(ev.start_time)}
                    {!ev.all_day && ` at ${formatTime(ev.start_time)}`}
                  </p>
                </div>
                {ev.reminder && (
                  <span className="text-xs text-ink-muted">🔔</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <EventFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditEvent(null);
          setFormDate(null);
        }}
        ctx={ctx}
        event={editEvent}
        defaultDate={formDate}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete event"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        loading={deleting}
      />
    </>
  );
}
