/**
 * Google Drive API wrapper.
 * Provides full CRUD access to the user's Google Drive.
 */
import "server-only";
import { getAccessToken } from "@/lib/google-drive/tokens";
import type { GoogleDriveFile, GoogleDriveFileList, GoogleDriveAbout } from "@/lib/types";

const API_BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

async function request(
  userId: string,
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await getAccessToken(userId);
  if (!token) throw new Error("Google Drive not connected. Connect in Settings.");

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    throw new Error("Google Drive access expired. Reconnect in Settings.");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Drive error (${res.status}): ${text.slice(0, 200)}`);
  }

  // Some endpoints return empty on success
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

// ─── Files ──────────────────────────────────────────────────────────────────

export async function listFiles(
  userId: string,
  opts: {
    query?: string;
    folderId?: string;
    pageSize?: number;
    pageToken?: string;
    orderBy?: string;
  } = {}
): Promise<GoogleDriveFileList> {
  const params = new URLSearchParams({
    fields: "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,thumbnailLink,iconLink,trashed)",
    pageSize: String(opts.pageSize ?? 50),
  });

  const conditions: string[] = ["trashed = false"];
  if (opts.query) {
    conditions.push(`name contains '${opts.query.replace(/'/g, "\\'")}'`);
  }
  if (opts.folderId) {
    conditions.push(`'${opts.folderId}' in parents`);
  } else {
    conditions.push("'root' in parents");
  }
  params.set("q", conditions.join(" and "));
  params.set("orderBy", opts.orderBy ?? "name");

  if (opts.pageToken) {
    params.set("pageToken", opts.pageToken);
  }

  return request(userId, `${API_BASE}/files?${params}`);
}

export async function getFile(userId: string, fileId: string): Promise<GoogleDriveFile> {
  const params = new URLSearchParams({
    fields: "id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,thumbnailLink,iconLink,trashed",
  });
  return request(userId, `${API_BASE}/files/${fileId}?${params}`);
}

export async function searchFiles(
  userId: string,
  query: string,
  pageSize = 20
): Promise<GoogleDriveFileList> {
  const params = new URLSearchParams({
    q: `name contains '${query.replace(/'/g, "\\'")}' and trashed = false`,
    fields: "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink)",
    pageSize: String(pageSize),
    orderBy: "relevance",
  });
  return request(userId, `${API_BASE}/files?${params}`);
}

export async function getAbout(userId: string): Promise<GoogleDriveAbout> {
  return request(userId, `${API_BASE}/about?fields=user,storageQuota`);
}

export async function listSharedFiles(userId: string): Promise<GoogleDriveFileList> {
  const params = new URLSearchParams({
    q: "sharedWithMe = true and trashed = false",
    fields: "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)",
    pageSize: "50",
    orderBy: "sharedWithMeTime desc",
  });
  return request(userId, `${API_BASE}/files?${params}`);
}

// ─── Create / Upload ────────────────────────────────────────────────────────

export async function createFolder(
  userId: string,
  name: string,
  parentId?: string
): Promise<GoogleDriveFile> {
  const metadata = {
    name,
    mimeType: "application/vnd.google-apps.folder",
    parents: parentId ? [parentId] : ["root"],
  };
  return request(userId, `${API_BASE}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
}

export async function uploadFile(
  userId: string,
  name: string,
  content: string,
  mimeType: string,
  parentId?: string
): Promise<GoogleDriveFile> {
  const metadata = {
    name,
    parents: parentId ? [parentId] : undefined,
  };

  const body = new FormData();
  body.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  const fileData = typeof content === "string" ? content : new Uint8Array(content);
  body.append("file", new Blob([fileData], { type: mimeType }), name);

  return request(userId, `${UPLOAD_BASE}/files?uploadType=multipart`, {
    method: "POST",
    body,
  });
}

export async function uploadTextFile(
  userId: string,
  name: string,
  text: string,
  parentId?: string
): Promise<GoogleDriveFile> {
  const mimeTypes: Record<string, string> = {
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".json": "application/json",
    ".csv": "text/csv",
    ".html": "text/html",
    ".xml": "application/xml",
    ".yaml": "text/yaml",
    ".yml": "text/yaml",
    ".js": "text/javascript",
    ".ts": "text/typescript",
    ".py": "text/x-python",
    ".sql": "application/sql",
  };
  const ext = "." + (name.split(".").pop() ?? "txt");
  const mimeType = mimeTypes[ext] ?? "text/plain";

  return uploadFile(userId, name, text, mimeType, parentId);
}

// ─── Update / Move / Rename ─────────────────────────────────────────────────

export async function updateFile(
  userId: string,
  fileId: string,
  metadata: { name?: string; description?: string }
): Promise<GoogleDriveFile> {
  const params = new URLSearchParams({ fields: "id,name,mimeType" });
  return request(userId, `${API_BASE}/files/${fileId}?${params}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
}

export async function moveFile(
  userId: string,
  fileId: string,
  newParentId: string,
  removeParentId?: string
): Promise<GoogleDriveFile> {
  const params = new URLSearchParams({
    addParents: newParentId,
    removeParents: removeParentId ?? "root",
    fields: "id,name,parents",
  });
  return request(userId, `${API_BASE}/files/${fileId}?${params}`, {
    method: "PATCH",
  });
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteFile(userId: string, fileId: string): Promise<void> {
  await request(userId, `${API_BASE}/files/${fileId}`, {
    method: "DELETE",
  });
}

export async function trashFile(userId: string, fileId: string): Promise<GoogleDriveFile> {
  return request(userId, `${API_BASE}/files/${fileId}?trashed=true`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
}

export async function untrashFile(userId: string, fileId: string): Promise<GoogleDriveFile> {
  return request(userId, `${API_BASE}/files/${fileId}?trashed=false`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: false }),
  });
}

// ─── Download / Read ────────────────────────────────────────────────────────

export async function downloadFile(userId: string, fileId: string): Promise<string> {
  return request(userId, `${API_BASE}/files/${fileId}?alt=media`);
}

export async function exportFile(
  userId: string,
  fileId: string,
  mimeType: string
): Promise<string> {
  return request(userId, `${API_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent(mimeType)}`);
}

// ─── Permissions (share) ────────────────────────────────────────────────────

export async function shareFile(
  userId: string,
  fileId: string,
  email: string,
  role: "reader" | "writer" | "commenter" = "reader"
): Promise<void> {
  await request(userId, `${API_BASE}/files/${fileId}/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "user",
      role,
      emailAddress: email,
    }),
  });
}
