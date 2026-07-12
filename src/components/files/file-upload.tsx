"use client";

import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createFileAttachment, type EntityType } from "@/lib/actions/file-attachments";
import type { FileAttachment } from "@/lib/types";

interface FileUploadProps {
  entityType: EntityType;
  entityId: string;
  onUploaded?: (file: FileAttachment) => void;
}

export function FileUpload({ entityType, entityId, onUploaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        // Upload to Google Drive
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/google/drive/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "Upload failed");
        }

        const driveFile = await uploadRes.json();

        // Create attachment record
        const res = await createFileAttachment(entityType, entityId, {
          file_name: file.name,
          file_url: driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`,
          file_size: file.size,
          mime_type: file.type,
          folder: "Google Drive",
        });

        if (res.ok) {
          onUploaded?.({
            id: res.id,
            user_id: "",
            entity_type: entityType,
            entity_id: entityId,
            file_name: file.name,
            file_url: driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`,
            file_size: file.size,
            mime_type: file.type,
            folder: "Google Drive",
            version: 1,
            created_at: new Date().toISOString(),
          });
        } else {
          throw new Error(res.error);
        }
      }

      toast("Files uploaded successfully", "success");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast(err.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
        dragOver
          ? "border-accent bg-accent/5"
          : "border-surface-border hover:border-ink-muted"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex flex-col items-center gap-2">
        {uploading ? (
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        ) : (
          <Upload className="h-6 w-6 text-ink-muted" />
        )}
        <p className="text-sm text-ink-soft">
          {uploading ? "Uploading..." : "Drop files here or click to upload"}
        </p>
        <p className="text-xs text-ink-muted">
          Files are uploaded to Google Drive
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          Choose Files
        </Button>
      </div>
    </div>
  );
}
