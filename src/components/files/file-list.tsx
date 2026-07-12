"use client";

import { useState, useTransition } from "react";
import { File, ExternalLink, Trash2, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { deleteFileAttachment } from "@/lib/actions/file-attachments";
import { formatDate } from "@/lib/utils";
import type { FileAttachment } from "@/lib/types";
import { FileUpload } from "./file-upload";

function formatSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File;
  if (mimeType.includes("pdf")) return File;
  if (mimeType.includes("image")) return File;
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv")) return File;
  if (mimeType.includes("document") || mimeType.includes("text")) return File;
  return File;
}

interface FileListProps {
  entityType: "client" | "project" | "invoice" | "proposal";
  entityId: string;
  initialFiles?: FileAttachment[];
}

export function FileList({ entityType, entityId, initialFiles = [] }: FileListProps) {
  const [files, setFiles] = useState<FileAttachment[]>(initialFiles);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { toast } = useToast();

  function handleDeleted(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const res = await deleteFileAttachment(id);
      if (res.ok) {
        handleDeleted(id);
        toast("File removed", "success");
      } else {
        toast(res.error ?? "Could not delete", "error");
      }
    });
    setConfirmDelete(null);
  }

  return (
    <div className="space-y-4">
      <FileUpload
        entityType={entityType}
        entityId={entityId}
        onUploaded={(file) => setFiles((prev) => [file, ...prev])}
      />

      {files.length === 0 ? (
        <p className="text-sm text-ink-soft">No files attached yet.</p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => {
            const Icon = getFileIcon(file.mime_type);
            return (
              <Card key={file.id} className="flex items-center gap-3 p-3">
                <Icon className="h-5 w-5 shrink-0 text-ink-muted" />
                <div className="min-w-0 flex-1">
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-ink hover:text-accent"
                  >
                    {file.file_name}
                  </a>
                  <div className="flex items-center gap-2 text-xs text-ink-muted">
                    {file.folder && (
                      <span className="flex items-center gap-1">
                        <Folder className="h-3 w-3" />
                        {file.folder}
                      </span>
                    )}
                    {formatSize(file.file_size) && (
                      <span>{formatSize(file.file_size)}</span>
                    )}
                    <span>{formatDate(file.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setConfirmDelete(file.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && onDelete(confirmDelete)}
        title="Delete file?"
        message="This will remove the file attachment from this entity."
        confirmLabel="Delete"
        loading={pending}
      />
    </div>
  );
}
