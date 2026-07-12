import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { uploadFile } from "@/lib/google-drive/drive";
import { getStoredTokens } from "@/lib/google-drive/tokens";

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tokens = await getStoredTokens(user.id);
  if (!tokens) {
    return NextResponse.json({ error: "Google Drive not connected" }, { status: 400 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const content = Buffer.from(arrayBuffer).toString("base64");

    // Upload to Google Drive
    const result = await uploadFile(
      user.id,
      file.name,
      content,
      file.type || "application/octet-stream"
    );

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}
