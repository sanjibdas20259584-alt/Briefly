/**
 * Google OAuth2 callback.
 * Exchanges the authorization code for tokens and saves them.
 * Redirects back to Settings.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/google-drive/tokens";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("[google-callback] OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/settings?google=error&msg=${encodeURIComponent(error)}`, req.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?google=error&msg=No+authorization+code", req.url)
      );
    }

    // Get user from session cookie
    let userId: string | null = null;
    try {
      const supabase = await getServerSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch (e) {
      console.error("[google-callback] Failed to get user from session:", e);
    }

    if (!userId) {
      // Try to get user from cookie manually
      const cookieHeader = req.headers.get("cookie") ?? "";
      const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (sbUrl && sbKey && cookieHeader) {
        try {
          const authRes = await fetch(`${sbUrl}/auth/v1/user`, {
            headers: {
              Authorization: `Bearer ${cookieHeader.split("sb-")[1]?.split("=")[0] ?? ""}`,
              apikey: sbKey,
              cookie: cookieHeader,
            },
          });
          if (authRes.ok) {
            const authData = await authRes.json();
            userId = authData.id ?? null;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!userId) {
      console.error("[google-callback] No authenticated user found");
      return NextResponse.redirect(new URL("/login", req.url));
    }

    console.info("[google-callback] Exchanging code for user:", userId);
    const ok = await exchangeCodeForTokens(userId, code);
    if (!ok) {
      console.error("[google-callback] Token exchange failed for user:", userId);
      return NextResponse.redirect(
        new URL("/settings?google=error&msg=Token+exchange+failed.+Check+server+logs+for+details.", req.url)
      );
    }

    console.info("[google-callback] Token exchange successful for user:", userId);
    return NextResponse.redirect(
      new URL("/settings?google=connected", req.url)
    );
  } catch (e) {
    console.error("[google-callback] Unhandled error:", e);
    return NextResponse.redirect(
      new URL(`/settings?google=error&msg=${encodeURIComponent(e instanceof Error ? e.message : "Unknown error")}`, req.url)
    );
  }
}
