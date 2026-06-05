const sessionCookieName = "mails_app_session";
const sessionDurationSeconds = 60 * 60 * 24 * 14;

function getSecret() {
  return process.env.APP_SESSION_SECRET || process.env.APP_LOGIN_PASSWORD || "";
}

function encode(value: string) {
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
}

async function sign(value: string) {
  const secret = getSecret();

  if (!secret) {
    return "";
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );

  return encode(String.fromCharCode(...new Uint8Array(signature)));
}

export async function createAppSessionToken() {
  const payload = encode(
    JSON.stringify({
      expiresAt: Date.now() + sessionDurationSeconds * 1000,
      scope: "mails-app",
    }),
  );

  return `${payload}.${await sign(payload)}`;
}

export async function isValidAppSession(token?: string | null) {
  if (!token || !getSecret()) {
    return false;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature || signature !== (await sign(payload))) {
    return false;
  }

  try {
    const data = JSON.parse(decode(payload)) as {
      expiresAt?: number;
      scope?: string;
    };

    return data.scope === "mails-app" && Number(data.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

export const appSession = {
  cookieName: sessionCookieName,
  durationSeconds: sessionDurationSeconds,
};
