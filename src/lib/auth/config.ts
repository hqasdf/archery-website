export type AuthConfig = {
  url: string;
  publishableKey: string;
  appUrl: string;
};

function safeOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(local && url.protocol === "http:"))
      return null;
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function parseAuthConfig(values: {
  url?: string;
  key?: string;
  appUrl?: string;
}): AuthConfig | null {
  const url = safeOrigin(values.url);
  const appUrl = safeOrigin(values.appUrl);
  const publishableKey = values.key?.trim();
  // This project uses the new publishable key, never a secret/service-role key.
  if (
    !url ||
    !appUrl ||
    !publishableKey?.startsWith("sb_publishable_") ||
    publishableKey.length <= 15
  )
    return null;
  return { url, appUrl, publishableKey };
}

export function getAuthConfig(): AuthConfig | null {
  return parseAuthConfig({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    appUrl: process.env.APP_URL,
  });
}

export function callbackDestination(
  value: string | null,
): "/sessions" | "/update-password" {
  return value === "/update-password" ? value : "/sessions";
}
