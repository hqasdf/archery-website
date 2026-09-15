import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAuthConfig } from "@/lib/auth/config";

export async function createAuthClient({ writable = false } = {}) {
  const config = getAuthConfig();
  if (!config) throw new Error("Authentication configuration is incomplete.");
  const cookieStore = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.appUrl.startsWith("https:"),
      path: "/",
    },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        // Server Components cannot write cookies. Proxy handles their refreshes.
        // Actions and callback routes pass writable:true; write failures must surface.
        if (writable)
          values.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
      },
    },
  });
}
