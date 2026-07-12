"use client";

import { useState, useRef, useTransition } from "react";
import { ArrowLeft, Download, Upload, FileJson, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  exportDataAction,
  importClientsAction,
  getTemplateData,
} from "@/lib/actions/import-export";

export default function ImportExportPage() {
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [importPending, startImportTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  function handleExport() {
    startTransition(async () => {
      const result = await exportDataAction(null, new FormData());
      if (result.ok && result.data) {
        setExportResult(result.data);
        toast("Data exported successfully.", "success");
      } else {
        toast(result.error ?? "Export failed.", "error");
      }
    });
  }

  function handleDownloadExport() {
    if (!exportResult) return;
    const blob = new Blob([exportResult], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `briefly-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;

      startImportTransition(async () => {
        const result = await importClientsAction(null, text);
        if (result.ok && result.imported) {
          setImportCount(result.imported);
          toast(`Imported ${result.imported} client(s).`, "success");
        } else {
          toast(result.error ?? "Import failed.", "error");
        }
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleDownloadTemplate() {
    const data = getTemplateData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "briefly-clients-template.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="rounded-lg p-1.5 text-ink-soft hover:bg-surface-subtle transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-ink">
            Import / Export
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Back up your data or bring it in from another source.
          </p>
        </div>
      </div>

      {/* Export */}
      <Card>
        <CardHeader
          title="Export Data"
          description="Download your clients, projects, and invoices as a JSON file."
        />
        <CardBody className="px-4 sm:px-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleExport} disabled={pending}>
              <Download className="mr-2 h-4 w-4" />
              {pending ? "Exporting..." : "Generate Export"}
            </Button>
            {exportResult && (
              <Button variant="secondary" onClick={handleDownloadExport}>
                <FileJson className="mr-2 h-4 w-4" />
                Download JSON
              </Button>
            )}
          </div>
          {exportResult && (
            <div className="rounded-lg border border-surface-border bg-surface-subtle p-3">
              <p className="text-xs text-ink-soft">
                Export ready — {(exportResult.length / 1024).toFixed(1)} KB.
                Click &quot;Download JSON&quot; to save the file.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader
          title="Import Clients"
          description="Add clients from a JSON file. Existing clients are not affected."
        />
        <CardBody className="px-4 sm:px-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={importPending}
            >
              <Upload className="mr-2 h-4 w-4" />
              {importPending ? "Importing..." : "Choose File"}
            </Button>
            <Button variant="ghost" onClick={handleDownloadTemplate}>
              Download Template
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileImport}
            />
          </div>
          {importCount !== null && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Successfully imported {importCount} client(s).
            </div>
          )}
          <p className="text-xs text-ink-muted">
            The JSON file should contain an array of client objects, or an object
            with a <code className="font-mono">clients</code> array. Each client
            must have a <code className="font-mono">name</code> field.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
