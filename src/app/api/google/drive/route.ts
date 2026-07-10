/**
 * Google Drive file listing API for the browser UI.
 * GET /api/google/drive?folderId=...&query=...
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { listFiles, searchFiles } from "@/lib/google-drive/drive";
import { getStoredTokens } from "@/lib/google-drive/tokens";

export async function GET(req: NextRequest) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tokens = await getStoredTokens(user.id);
  if (!tokens) {
    return NextResponse.json({ error: "Google Drive not connected" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId") || undefined;
  const query = searchParams.get("query") || undefined;

  try {
    let result;
    if (query) {
      result = await searchFiles(user.id, query, 50);
    } else {
      result = await listFiles(user.id, { folderId, pageSize: 50 });
    }
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "Failed to list files" },
      { status: 500 }
    );
  }
}
