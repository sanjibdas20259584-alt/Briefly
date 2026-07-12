import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { listProvidersPublic } from "@/lib/actions/settings";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: settings } = await supabase
    .from("app_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();
  const providers = await listProvidersPublic();

  return (
    <SettingsClient
      ownerName={settings?.owner_name?.trim() || "Sanjib"}
      telegramChatId={settings?.telegram_chat_id ?? ""}
      providers={providers}
      currency={settings?.currency ?? "USD"}
    />
  );
}
