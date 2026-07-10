"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  HardDrive,
  Folder,
  FileText,
  Search,
  ChevronRight,
  ArrowLeft,
  Trash2,
  FolderPlus,
  Upload,
  MoreVertical,
  RefreshCw,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

function isFolder(f: DriveFile) {
  return f.mimeType === "application/vnd.google-apps.folder";
}

function formatSize(bytes?: string) {
  if (!bytes) return "";
  const n = Number(bytes);
  if (isNaN(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function fileIcon(mimeType: string) {
  if (mimeType === "application/vnd.google-apps.folder") return Folder;
  if (mimeType.startsWith("image/")) return FileText;
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv")) return FileText;
  if (mimeType.includes("document") || mimeType.includes("text")) return FileText;
  return FileText;
}

export function DriveClient({ connected }: { connected: boolean }) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async (folderId?: string, query?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url = "/api/google/drive";
      const params = new URLSearchParams();
      if (folderId) params.set("folderId", folderId);
      if (query) params.set("query", query);
      if (params.toString()) url += "?" + params.toString();

      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load files");
      }
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (connected) loadFiles();
  }, [connected, loadFiles]);

  function openFolder(id: string, name: string) {
    setCurrentFolder(id);
    setBreadcrumbs((prev) => [...prev, { id, name }]);
    loadFiles(id);
  }

  function navigateTo(index: number) {
    const target = breadcrumbs[index];
    const newCrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newCrumbs);
    setCurrentFolder(target?.id ?? null);
    loadFiles(target?.id);
  }

  function handleSearch() {
    if (searchQuery.trim()) {
      loadFiles(undefined, searchQuery.trim());
    }
  }

  if (!connected) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">Google Drive</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Browse and manage your Google Drive files.
          </p>
        </div>
        <Card>
          <CardBody className="flex flex-col items-center py-12 text-center">
            <HardDrive className="h-12 w-12 text-ink-muted" />
            <p className="mt-4 text-sm font-medium text-ink">
              Google Drive not connected
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              Connect your Google Drive in Settings to browse files here and let
              your AI assistant manage them.
            </p>
            <Link href="/settings">
              <Button size="sm" className="mt-4">
                Go to Settings
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Google Drive</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Browse, create, and manage your files.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => loadFiles(currentFolder ?? undefined)}
        >
          <RefreshCw className="mr-1 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm text-ink-soft">
        <button
          onClick={() => navigateTo(-1)}
          className="hover:text-ink"
        >
          My Drive
        </button>
        {breadcrumbs.map((b, i) => (
          <span key={b.id} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            <button
              onClick={() => navigateTo(i)}
              className="hover:text-ink"
            >
              {b.name}
            </button>
          </span>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search files..."
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} size="sm">
          Search
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* File list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-ink-soft">Loading...</div>
      ) : files.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <HardDrive className="mx-auto h-10 w-10 text-ink-muted" />
            <p className="mt-3 text-sm text-ink-soft">
              {searchQuery ? "No files match your search." : "This folder is empty."}
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-surface-border">
            {files.map((file) => {
              const Icon = fileIcon(file.mimeType);
              const folder = isFolder(file);
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface"
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      folder ? "text-accent" : "text-ink-muted"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    {folder ? (
                      <button
                        onClick={() => openFolder(file.id, file.name)}
                        className="text-sm font-medium text-ink hover:text-accent"
                      >
                        {file.name}
                      </button>
                    ) : file.webViewLink ? (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-ink hover:text-accent"
                      >
                        {file.name}
                      </a>
                    ) : (
                      <span className="text-sm font-medium text-ink">
                        {file.name}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-ink-muted">
                    {formatSize(file.size)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
