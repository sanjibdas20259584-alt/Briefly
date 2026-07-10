/**
 * Google Drive tool definitions and executor for the AI chatbot.
 */
import "server-only";
import {
  listFiles,
  searchFiles,
  getFile,
  getAbout,
  createFolder,
  uploadTextFile,
  downloadFile,
  updateFile,
  deleteFile,
  trashFile,
  moveFile,
  shareFile,
  listSharedFiles,
} from "@/lib/google-drive/drive";
import { getStoredTokens } from "@/lib/google-drive/tokens";
import type { FunctionDefinition } from "@/lib/chat/tools";

export const GOOGLE_DRIVE_TOOLS: FunctionDefinition[] = [
  {
    name: "gdrive_list_files",
    description: "List files and folders in Google Drive. Returns file names, types, sizes, and IDs.",
    parameters: {
      type: "object",
      properties: {
        folder_id: { type: "string", description: "Folder ID to list. Empty for root." },
        query: { type: "string", description: "Search within folder by name" },
        page_size: { type: "number", default: 20 },
      },
    },
  },
  {
    name: "gdrive_search",
    description: "Search across the entire Google Drive by file name",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term" },
        page_size: { type: "number", default: 20 },
      },
      required: ["query"],
    },
  },
  {
    name: "gdrive_get_file",
    description: "Get detailed info about a specific file",
    parameters: {
      type: "object",
      properties: { file_id: { type: "string" } },
      required: ["file_id"],
    },
  },
  {
    name: "gdrive_read_file",
    description: "Read/download the content of a text file (txt, md, json, csv, code files)",
    parameters: {
      type: "object",
      properties: { file_id: { type: "string" } },
      required: ["file_id"],
    },
  },
  {
    name: "gdrive_create_folder",
    description: "Create a new folder in Google Drive",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Folder name" },
        parent_id: { type: "string", description: "Parent folder ID (empty for root)" },
      },
      required: ["name"],
    },
  },
  {
    name: "gdrive_create_file",
    description: "Create a new text file in Google Drive",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "File name with extension (e.g. notes.md)" },
        content: { type: "string", description: "File content" },
        parent_id: { type: "string", description: "Parent folder ID (empty for root)" },
      },
      required: ["name", "content"],
    },
  },
  {
    name: "gdrive_update_file",
    description: "Rename a file or folder in Google Drive",
    parameters: {
      type: "object",
      properties: {
        file_id: { type: "string" },
        name: { type: "string", description: "New name" },
      },
      required: ["file_id", "name"],
    },
  },
  {
    name: "gdrive_move_file",
    description: "Move a file to a different folder",
    parameters: {
      type: "object",
      properties: {
        file_id: { type: "string" },
        folder_id: { type: "string", description: "Destination folder ID" },
      },
      required: ["file_id", "folder_id"],
    },
  },
  {
    name: "gdrive_delete_file",
    description: "Permanently delete a file from Google Drive",
    parameters: {
      type: "object",
      properties: { file_id: { type: "string" } },
      required: ["file_id"],
    },
  },
  {
    name: "gdrive_trash_file",
    description: "Move a file to trash (can be restored later)",
    parameters: {
      type: "object",
      properties: { file_id: { type: "string" } },
      required: ["file_id"],
    },
  },
  {
    name: "gdrive_share",
    description: "Share a file with someone via email",
    parameters: {
      type: "object",
      properties: {
        file_id: { type: "string" },
        email: { type: "string", description: "Email to share with" },
        role: { type: "string", enum: ["reader", "writer", "commenter"], default: "reader" },
      },
      required: ["file_id", "email"],
    },
  },
  {
    name: "gdrive_shared_with_me",
    description: "List files that others have shared with me",
    parameters: {
      type: "object",
      properties: {
        page_size: { type: "number", default: 20 },
      },
    },
  },
  {
    name: "gdrive_about",
    description: "Get Google Drive account info (storage usage, email)",
    parameters: { type: "object", properties: {} },
  },
];

function friendly(result: unknown): string {
  if (!result || typeof result !== "object") return JSON.stringify(result);
  const r = result as any;
  if (r.ok === false) return `Error: ${r.error ?? "Unknown error"}`;
  return JSON.stringify(result, null, 2);
}

function formatBytes(bytes: string | number): string {
  const n = Number(bytes);
  if (isNaN(n)) return String(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function summarizeFiles(files: any[]): string {
  if (!files.length) return "No files found.";
  return files
    .map((f) => {
      const isFolder = f.mimeType === "application/vnd.google-apps.folder";
      const icon = isFolder ? "📁" : "📄";
      const size = f.size ? ` (${formatBytes(f.size)})` : "";
      return `${icon} ${f.name}${size}  [${f.id}]`;
    })
    .join("\n");
}

export async function executeGDriveTool(
  name: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ ok: boolean; summary: string }> {
  // Check if Google Drive is connected
  const tokens = await getStoredTokens(userId);
  if (!tokens) {
    return {
      ok: false,
      summary: "Google Drive is not connected. Ask the user to connect it in Settings.",
    };
  }

  try {
    switch (name) {
      case "gdrive_list_files": {
        const result = await listFiles(userId, {
          folderId: (args.folder_id as string) || undefined,
          query: args.query as string,
          pageSize: Number(args.page_size) || 20,
        });
        return {
          ok: true,
          summary: summarizeFiles(result.files ?? []),
        };
      }
      case "gdrive_search": {
        const result = await searchFiles(userId, args.query as string, Number(args.page_size) || 20);
        return {
          ok: true,
          summary: summarizeFiles(result.files ?? []),
        };
      }
      case "gdrive_get_file": {
        const file = await getFile(userId, args.file_id as string);
        return {
          ok: true,
          summary: [
            `Name: ${file.name}`,
            `Type: ${file.mimeType}`,
            `Size: ${file.size ? formatBytes(file.size) : "N/A"}`,
            `Created: ${file.createdTime ?? "N/A"}`,
            `Modified: ${file.modifiedTime ?? "N/A"}`,
            `ID: ${file.id}`,
            `Link: ${file.webViewLink ?? "N/A"}`,
          ].join("\n"),
        };
      }
      case "gdrive_read_file": {
        const content = await downloadFile(userId, args.file_id as string);
        const truncated = content.length > 8000
          ? content.slice(0, 8000) + "\n\n... (truncated, total " + content.length + " chars)"
          : content;
        return { ok: true, summary: truncated };
      }
      case "gdrive_create_folder": {
        const folder = await createFolder(userId, args.name as string, args.parent_id as string | undefined);
        return {
          ok: true,
          summary: `Created folder "${folder.name}" [${folder.id}]`,
        };
      }
      case "gdrive_create_file": {
        const file = await uploadTextFile(
          userId,
          args.name as string,
          args.content as string,
          args.parent_id as string | undefined
        );
        return {
          ok: true,
          summary: `Created file "${file.name}" [${file.id}]`,
        };
      }
      case "gdrive_update_file": {
        const updated = await updateFile(userId, args.file_id as string, { name: args.name as string });
        return {
          ok: true,
          summary: `Renamed to "${updated.name}"`,
        };
      }
      case "gdrive_move_file": {
        const file = await getFile(userId, args.file_id as string);
        const moved = await moveFile(userId, args.file_id as string, args.folder_id as string, file.parents?.[0]);
        return {
          ok: true,
          summary: `Moved "${moved.name}" to folder ${args.folder_id}`,
        };
      }
      case "gdrive_delete_file": {
        await deleteFile(userId, args.file_id as string);
        return { ok: true, summary: "File permanently deleted." };
      }
      case "gdrive_trash_file": {
        const trashed = await trashFile(userId, args.file_id as string);
        return { ok: true, summary: `"${trashed.name}" moved to trash.` };
      }
      case "gdrive_share": {
        await shareFile(userId, args.file_id as string, args.email as string, (args.role as any) || "reader");
        return {
          ok: true,
          summary: `Shared with ${args.email} as ${args.role ?? "reader"}.`,
        };
      }
      case "gdrive_shared_with_me": {
        const result = await listSharedFiles(userId);
        return {
          ok: true,
          summary: summarizeFiles(result.files ?? []),
        };
      }
      case "gdrive_about": {
        const about = await getAbout(userId);
        return {
          ok: true,
          summary: [
            `Email: ${about.user.emailAddress}`,
            `Name: ${about.user.displayName}`,
            `Storage: ${formatBytes(about.storageQuota.usage)} / ${formatBytes(about.storageQuota.limit)}`,
          ].join("\n"),
        };
      }
      default:
        return { ok: false, summary: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return {
      ok: false,
      summary: e instanceof Error ? e.message : "Google Drive operation failed",
    };
  }
}
