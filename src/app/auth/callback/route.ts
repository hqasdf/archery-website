import { NextResponse, type NextRequest } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { callbackDestination, getAuthConfig } from "@/lib/auth/config";

export async function GET(request: NextRequest) {
  const config = getAuthConfig();
  const code = request.nextUrl.searchParams.get("code");
  const destination = callbackDestination(
    request.nextUrl.searchParams.get("next"),
  );
  // Fixed/allowlisted destinations prevent user-controlled external redirects.
  let path = "/sign-in?status=invalid-link";
  if (config && code && code.length <= 2048) {
    try {
      const supabase = await createAuthClient({ writable: true });
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) path = destination;
    } catch {
      path = "/sign-in?status=unavailable";
    }
  }
  const response = config
    ? NextResponse.redirect(new URL(path, config.appUrl), 303)
    : new NextResponse(null, { status: 303, headers: { Location: path } });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
