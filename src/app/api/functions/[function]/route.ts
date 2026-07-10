import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { executeChatTool } from "@/lib/chat/execute-tool";

/**
 * POST /api/functions/:function
 * Body: either raw args object, or { args: {...} }
 * Path param is the function name (preferred).
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ function: string }> }
) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { function: pathFn } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  // Accept: path name, or body.function, or body.name
  const fnName =
    pathFn ||
    (typeof body?.function === "string" ? body.function : null) ||
    (typeof body?.name === "string" ? body.name : null);

  if (!fnName) {
    return NextResponse.json({ error: "Function name required" }, { status: 400 });
  }

  // Accept args as body.args or the body itself (minus function key)
  let args: Record<string, unknown> = {};
  if (body && typeof body === "object") {
    if (body.args && typeof body.args === "object") {
      args = body.args as Record<string, unknown>;
    } else {
      const { function: _f, name: _n, args: _a, ...rest } = body as Record<
        string,
        unknown
      >;
      args = rest;
    }
  }

  const result = await executeChatTool(fnName, args);
  return NextResponse.json({
    ok: result.ok,
    summary: result.summary,
    data: result.raw ?? null,
    error: result.ok ? undefined : result.summary,
  });
}
