import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import type { AppSettings, ThemePreference } from "@/lib/types";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: settings } = await supabase
    .from("app_settings")
    .select("*")
    .eq("user_id", user.id)
    .single<AppSettings>();

  const ownerName = settings?.owner_name?.trim() || "Sanjib";
  const theme = (settings?.theme as ThemePreference) || "system";

  return (
    <ThemeProvider defaultTheme={theme}>
      <ToastProvider>
        <SidebarLayout ownerName={ownerName}>{children}</SidebarLayout>
      </ToastProvider>
    </ThemeProvider>
  );
}
