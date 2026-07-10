import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getStoredTokens } from "@/lib/google-drive/tokens";
import { DriveClient } from "@/components/drive/drive-client";

export default async function DrivePage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tokens = await getStoredTokens(user.id);

  return <DriveClient connected={!!tokens} />;
}
