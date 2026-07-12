"use client";

import { Dialog } from "@/components/ui/dialog";

const SHORTCUT_GROUPS = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["Ctrl", "K"], description: "Search" },
    ],
  },
  {
    title: "Create",
    shortcuts: [
      { keys: ["Ctrl", "N"], description: "New client" },
      { keys: ["Ctrl", "M"], description: "New project" },
      { keys: ["Ctrl", "I"], description: "New invoice" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { keys: ["Ctrl", "/"], description: "Show shortcuts" },
      { keys: ["Esc"], description: "Close dialogs" },
    ],
  },
];

function KeyBadge({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md border border-surface-border bg-surface px-1.5 text-xs font-medium text-ink-soft">
      {children}
    </kbd>
  );
}

export function ShortcutsHelp({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="Navigate Briefly faster with these shortcuts"
      size="sm"
    >
      <div className="space-y-5">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.shortcuts.map((s) => (
                <div
                  key={s.description}
                  className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm"
                >
                  <span className="text-ink">{s.description}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k) => (
                      <KeyBadge key={k}>{k}</KeyBadge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
