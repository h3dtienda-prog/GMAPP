import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const maxAgeMs = 10 * 60 * 1000;

type OAuthStatePayload = {
  nonce: string;
  createdAt: number;
};

export function createOAuthState() {
  const payload: OAuthStatePayload = {
    nonce: randomBytes(32).toString("base64url"),
    createdAt: Date.now(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = signState(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyOAuthState(state: string | null) {
  if (!state) {
    return false;
  }

  const [encodedPayload, signature] = state.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signState(encodedPayload);

  if (!safeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as OAuthStatePayload;

    return Date.now() - payload.createdAt <= maxAgeMs;
  } catch {
    return false;
  }
}

function signState(encodedPayload: string) {
  return createHmac("sha256", getStateSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function getStateSecret() {
  return (
    process.env.GMAIL_TOKEN_ENCRYPTION_KEY ??
    process.env.GOOGLE_CLIENT_SECRET ??
    "development-oauth-state-secret"
  );
}

function safeEqual(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(valueBuffer, expectedBuffer);
}
