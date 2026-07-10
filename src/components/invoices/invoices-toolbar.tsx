"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { InvoiceFormDialog } from "./invoice-form-dialog";
import { getNextInvoiceNumber } from "@/lib/queries/invoices-number";

export function InvoicesToolbar({
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
  const [nextNum, setNextNum] = useState<string | undefined>();

  useEffect(() => {
    if (params.get("new") === "1") {
      setOpen(true);
      getNextInvoiceNumber().then(setNextNum);
    }
  }, [params]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search invoices…"
        className="w-56"
        disabled
        title="Search coming soon"
      />
      <Select
        value={status}
        onChange={(e) => {
          const sp = new URLSearchParams();
          if (e.target.value !== "all") sp.set("status", e.target.value);
          router.push(`/invoices${sp.toString() ? "?" + sp.toString() : ""}`);
          setStatus(e.target.value);
        }}
        className="w-40"
      >
        <option value="all">All statuses</option>
        <option value="draft">Draft</option>
        <option value="sent">Sent</option>
        <option value="paid">Paid</option>
        <option value="overdue">Overdue</option>
        <option value="cancelled">Cancelled</option>
      </Select>
      <div className="ml-auto">
        <Button onClick={() => { setOpen(true); getNextInvoiceNumber().then(setNextNum); }}>
          New invoice
        </Button>
      </div>
      <InvoiceFormDialog
        open={open}
        onClose={() => setOpen(false)}
        clients={clients}
        initialClientId={initialClientId}
        defaultNumber={nextNum}
      />
    </div>
  );
}
