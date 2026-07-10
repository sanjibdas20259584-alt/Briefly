import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { decrypt } from "@/lib/crypto";
import { testProviderConnection, validateProviderConfig } from "@/lib/providers/validate";

/**
 * POST /api/providers/test
 * Body: { id?: string, base_url?, api_key?, model_name?, headers? }
 * Validates config and pings the provider (does not require DB id).
 */
export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  let base_url = String(body.base_url ?? "").trim();
  let model_name = String(body.model_name ?? "").trim();
  let api_key = String(body.api_key ?? "").trim() || null;
  let headers: Record<string, string> = body.headers ?? {};

  if (body.id) {
    const service = getServiceSupabase();
    const { data } = await service
      .from("model_providers")
      .select("*")
      .eq("id", body.id)
      .eq("user_id", user.id)
      .single();
    if (!data) {
      return NextResponse.json({ ok: false, error: "Provider not found" }, { status: 404 });
    }
    base_url = base_url || data.base_url;
    model_name = model_name || data.model_name;
    headers = Object.keys(headers).length ? headers : (data.headers ?? {});
    if (!api_key) api_key = decrypt(data.api_key_enc);
  }

  const validation = validateProviderConfig({
    base_url,
    model_name,
    api_key,
    requireKey: true,
  });
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error, code: validation.code });
  }

  const result = await testProviderConnection(
    { base_url, model_name, api_key, headers },
    { timeoutMs: 15000 }
  );

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }
  return NextResponse.json({
    ok: true,
    latencyMs: result.latencyMs,
    message: `Connected in ${result.latencyMs}ms`,
  });
}
