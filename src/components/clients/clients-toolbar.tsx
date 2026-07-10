"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/input";
import { ClientFormDialog } from "./client-form-dialog";

export function ClientsToolbar({
  initialQuery,
  initialStatus,
}: {
  initialQuery?: string;
  initialStatus?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initialQuery ?? "");
  const [status, setStatus] = useState(initialStatus ?? "all");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (params.get("new") === "1") setOpen(true);
  }, [params]);

  function applyFilters(next?: { q?: string; status?: string }) {
    const sp = new URLSearchParams();
    const query = next?.q ?? q;
    const stat = next?.status ?? status;
    if (query) sp.set("q", query);
    if (stat && stat !== "all") sp.set("status", stat);
    router.push(`/clients${sp.toString() ? "?" + sp.toString() : ""}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters();
          }}
          className="flex items-center"
        >
          <Input
            placeholder="Search clients…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-56"
          />
        </form>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            applyFilters({ status: e.target.value });
          }}
          className="w-36"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="lead">Lead</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
      <Button onClick={() => setOpen(true)}>New client</Button>
      <ClientFormDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
