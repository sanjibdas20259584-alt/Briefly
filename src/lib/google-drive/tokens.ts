/**
 * Google Drive OAuth token management.
 * Stores/retrieves/refreshes access and refresh tokens (encrypted).
 */
import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service";
import { encrypt, decrypt } from "@/lib/crypto";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

export function getGoogleOAuthConfig() {
  return {
    clientId: GOOGLE_CLIENT_ID ?? "",
    clientSecret: GOOGLE_CLIENT_SECRET ?? "",
    redirectUri: GOOGLE_REDIRECT_URI ?? "",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/drive"],
  };
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiry: string | null;
  userEmail: string | null;
}

export async function getStoredTokens(userId: string): Promise<StoredTokens | null> {
  const service = getServiceSupabase();
  const { data } = await service
    .from("app_settings")
    .select("google_drive_access_enc, google_drive_refresh_enc, google_drive_token_type, google_drive_expiry, google_drive_user_email")
    .eq("user_id", userId)
    .single();

  if (!data?.google_drive_refresh_enc) return null;

  return {
    accessToken: decrypt(data.google_drive_access_enc) ?? "",
    refreshToken: decrypt(data.google_drive_refresh_enc) ?? "",
    tokenType: data.google_drive_token_type ?? "Bearer",
    expiry: data.google_drive_expiry,
    userEmail: data.google_drive_user_email,
  };
}

export async function saveTokens(
  userId: string,
  tokens: {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in?: number;
    email?: string;
  }
) {
  const service = getServiceSupabase();
  const expiry = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  // If no new refresh token, keep existing one
  const existing = await getStoredTokens(userId);
  const refreshToken = tokens.refresh_token || existing?.refreshToken || "";

  const update: Record<string, unknown> = {
    google_drive_access_enc: encrypt(tokens.access_token),
    google_drive_token_type: tokens.token_type || "Bearer",
    google_drive_expiry: expiry,
    google_drive_user_email: tokens.email ?? existing?.userEmail ?? null,
  };
  if (tokens.refresh_token) {
    update.google_drive_refresh_enc = encrypt(tokens.refresh_token);
  }

  const { error } = await service
    .from("app_settings")
    .update(update)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function clearTokens(userId: string) {
  const service = getServiceSupabase();
  await service
    .from("app_settings")
    .update({
      google_drive_access_enc: null,
      google_drive_refresh_enc: null,
      google_drive_token_type: "Bearer",
      google_drive_expiry: null,
      google_drive_user_email: null,
    })
    .eq("user_id", userId);
}

export async function refreshAccessToken(userId: string): Promise<string | null> {
  const tokens = await getStoredTokens(userId);
  if (!tokens?.refreshToken) return null;

  const config = getGoogleOAuthConfig();
  if (!config.clientId || !config.clientSecret) return null;

  // Check if current token is still valid
  if (tokens.expiry && new Date(tokens.expiry) > new Date(Date.now() + 60_000)) {
    return tokens.accessToken;
  }

  // Refresh
  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: tokens.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    console.error("[google-drive] Token refresh failed:", res.status);
    return null;
  }

  const data = await res.json();
  await saveTokens(userId, {
    access_token: data.access_token,
    token_type: data.token_type || "Bearer",
    expires_in: data.expires_in,
  });

  return data.access_token;
}

export async function exchangeCodeForTokens(userId: string, code: string): Promise<boolean> {
  const config = getGoogleOAuthConfig();
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    console.error("[google-drive] Missing config:", {
      hasClientId: !!config.clientId,
      hasClientSecret: !!config.clientSecret,
      hasRedirectUri: !!config.redirectUri,
    });
    return false;
  }

  console.info("[google-drive] Exchanging code for tokens, redirect_uri:", config.redirectUri);

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[google-drive] Token exchange failed:", res.status, err);
    return false;
  }

  const data = await res.json();

  // Get user email from Google
  let email: string | null = null;
  try {
    const meRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (meRes.ok) {
      const me = await meRes.json();
      email = me?.email ?? null;
    }
  } catch {
    // ignore
  }

  try {
    await saveTokens(userId, {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type || "Bearer",
      expires_in: data.expires_in,
      email: email ?? undefined,
    });
  } catch (e) {
    console.error("[google-drive] Failed to save tokens:", e);
    return false;
  }

  return true;
}

/**
 * Get a valid access token, refreshing if needed.
 */
export async function getAccessToken(userId: string): Promise<string | null> {
  const tokens = await getStoredTokens(userId);
  if (!tokens) return null;

  // Check expiry
  if (tokens.expiry && new Date(tokens.expiry) > new Date(Date.now() + 60_000)) {
    return tokens.accessToken;
  }

  // Refresh
  return refreshAccessToken(userId);
}
