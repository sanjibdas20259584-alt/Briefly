"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { ProposalFormDialog } from "./proposal-form-dialog";

export function ProposalsToolbar({
  clients,
  initialStatus,
  initialClientId,
}: {
  clients: any[];
  initialStatus?: string;
  initialClientId?: string;
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
          router.push(`/proposals${sp.toString() ? "?" + sp.toString() : ""}`);
          setStatus(e.target.value);
        }}
        className="w-40"
      >
        <option value="all">All statuses</option>
        <option value="draft">Draft</option>
        <option value="sent">Sent</option>
        <option value="viewed">Viewed</option>
        <option value="accepted">Accepted</option>
        <option value="rejected">Rejected</option>
        <option value="archived">Archived</option>
      </Select>
      <div className="ml-auto">
        <Button onClick={() => setOpen(true)}>New proposal</Button>
      </div>
      <ProposalFormDialog
        open={open}
        onClose={() => setOpen(false)}
        clients={clients}
        initialClientId={initialClientId}
      />
    </div>
  );
}
