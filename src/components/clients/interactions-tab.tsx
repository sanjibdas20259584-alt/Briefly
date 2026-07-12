"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteractionList } from "./interaction-list";
import { InteractionFormDialog } from "./interaction-form-dialog";
import type { Interaction } from "@/lib/types";

export function InteractionsTab({
  interactions,
  clientId,
}: {
  interactions: Interaction[];
  clientId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Log interaction
        </Button>
      </div>
      <InteractionList interactions={interactions} clientId={clientId} />
      <InteractionFormDialog
        open={open}
        onClose={() => setOpen(false)}
        clientId={clientId}
      />
    </div>
  );
}
