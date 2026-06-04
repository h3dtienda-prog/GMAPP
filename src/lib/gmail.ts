import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const gmailScopes = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
];

export type GmailTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: "Bearer";
  id_token?: string;
};

export type GmailProfile = {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
};

export type GmailConnectionRow = {
  email_address: string;
  provider: string;
  messages_total: number;
  threads_total: number;
  history_id: string | null;
  sort_order?: number | null;
  display_name?: string | null;
  logo_url?: string | null;
  encrypted_payload: EncryptedGmailPayload;
  connected_at: string;
  updated_at: string;
};

export type EncryptedGmailPayload = {
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  data: string;
};

export type DecryptedGmailPayload = {
  connectedAt: string;
  expiresAt?: string;
  profile: GmailProfile;
  tokens: GmailTokenResponse;
};

export type GmailDashboardAccount = {
  address: string;
  displayName: string;
  logoUrl?: string | null;
  provider: string;
  unread: number;
  status: string;
  messagesTotal: number;
  threadsTotal: number;
  sortOrder: number;
};

export type GmailDashboardMessage = {
  id: string;
  gmailId: string;
  sender: string;
  fromEmail?: string;
  account: string;
  subject: string;
  preview: string;
  time: string;
  tag: string;
  state: string;
  unread: boolean;
  attachment: boolean;
  to?: string;
};

export function getGoogleOAuthConfig(origin?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    (origin ? `${origin}/api/gmail/callback` : undefined);
  const tokenEncryptionKey = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;

  if (!clientId || !clientSecret || !redirectUri || !tokenEncryptionKey) {
    return {
      configured: false as const,
      missing: [
        !clientId ? "GOOGLE_CLIENT_ID" : null,
        !clientSecret ? "GOOGLE_CLIENT_SECRET" : null,
        !redirectUri ? "GOOGLE_REDIRECT_URI" : null,
        !tokenEncryptionKey ? "GMAIL_TOKEN_ENCRYPTION_KEY" : null,
      ].filter(Boolean) as string[],
    };
  }

  return {
    configured: true as const,
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function buildGoogleAuthUrl(state: string, origin: string) {
  const config = getGoogleOAuthConfig(origin);

  if (!config.configured) {
    return config;
  }

  const params = new URLSearchParams({
    access_type: "offline",
    client_id: config.clientId,
    include_granted_scopes: "true",
    prompt: "consent",
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: gmailScopes.join(" "),
    state,
  });

  return {
    configured: true as const,
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  };
}

export async function exchangeGmailCode(code: string, origin: string) {
  const config = getGoogleOAuthConfig(origin);

  if (!config.configured) {
    throw new Error(`Missing env vars: ${config.missing.join(", ")}`);
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google token exchange failed: ${body}`);
  }

  return (await response.json()) as GmailTokenResponse;
}

export async function getGmailProfile(accessToken: string) {
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gmail profile request failed: ${body}`);
  }

  return (await response.json()) as GmailProfile;
}

export async function getGmailDashboardData(selectedAccount?: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      accounts: [] as GmailDashboardAccount[],
      messages: [] as GmailDashboardMessage[],
      error: null as string | null,
    };
  }

  const { data, error } = await selectGmailConnectionRows();

  if (error) {
    return {
      accounts: [] as GmailDashboardAccount[],
      messages: [] as GmailDashboardMessage[],
      error: error.message,
    };
  }

  const rows = ((data ?? []) as GmailConnectionRow[]).sort(
    (first, second) =>
      (first.sort_order ?? Number.MAX_SAFE_INTEGER) -
        (second.sort_order ?? Number.MAX_SAFE_INTEGER) ||
      first.email_address.localeCompare(second.email_address),
  );
  const visibleRows = selectedAccount
    ? rows.filter((row) => row.email_address === selectedAccount)
    : rows;
  const accounts: GmailDashboardAccount[] = rows.map((row, index) => ({
    address: row.email_address,
    displayName: row.display_name?.trim() || row.email_address,
    logoUrl: row.logo_url,
    provider: row.provider === "gmail" ? "Gmail" : row.provider,
    unread: 0,
    status: "Conectada",
    messagesTotal: row.messages_total,
    threadsTotal: row.threads_total,
    sortOrder: row.sort_order ?? index,
  }));
  const messages: GmailDashboardMessage[] = [];
  const connectionErrors: string[] = [];

  for (const row of visibleRows) {
    try {
      const payload = decryptGmailPayload(row.encrypted_payload);
      const tokens = await ensureFreshGmailTokens(payload);
      const recentMessages = await getRecentGmailMessages(
        row.email_address,
        tokens.access_token,
      );

      messages.push(...recentMessages);

      if (tokens.access_token !== payload.tokens.access_token) {
        await storeEncryptedGmailConnection(payload.profile, tokens);
      }
    } catch (error) {
      console.error(error);
      connectionErrors.push(
        `${row.email_address}: ${
          error instanceof Error ? error.message : "No se pudo leer Gmail."
        }`,
      );
    }
  }

  return {
    accounts,
    messages,
    error: connectionErrors.length > 0 ? connectionErrors.join("\n") : null,
  };
}

export async function performGmailMessageAction({
  account,
  action,
  gmailId,
}: {
  account: string;
  action: "archive" | "star" | "unstar" | "read" | "unread";
  gmailId: string;
}) {
  const row = await getGmailConnectionRow(account);

  if (!row) {
    throw new Error("Gmail account is not connected.");
  }

  const payload = decryptGmailPayload(row.encrypted_payload);
  const tokens = await ensureFreshGmailTokens(payload);
  const labels = getLabelMutation(action);
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}/modify`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(labels),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gmail action failed: ${body}`);
  }

  if (tokens.access_token !== payload.tokens.access_token) {
    await storeEncryptedGmailConnection(payload.profile, tokens);
  }
}

async function getGmailConnectionRow(account: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("gmail_connections")
    .select(
      "email_address, provider, messages_total, threads_total, history_id, sort_order, display_name, logo_url, encrypted_payload, connected_at, updated_at",
    )
    .eq("email_address", account)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as GmailConnectionRow;
}

function getLabelMutation(action: "archive" | "star" | "unstar" | "read" | "unread") {
  if (action === "archive") {
    return { removeLabelIds: ["INBOX"] };
  }

  if (action === "star") {
    return { addLabelIds: ["STARRED"] };
  }

  if (action === "unstar") {
    return { removeLabelIds: ["STARRED"] };
  }

  if (action === "read") {
    return { removeLabelIds: ["UNREAD"] };
  }

  return { addLabelIds: ["UNREAD"] };
}

async function selectGmailConnectionRows() {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return { data: null, error: null };
  }

  const queryWithOrder = await supabase
    .from("gmail_connections")
    .select(
      "email_address, provider, messages_total, threads_total, history_id, sort_order, display_name, logo_url, encrypted_payload, connected_at, updated_at",
    )
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("connected_at", { ascending: true });

  if (!queryWithOrder.error) {
    return queryWithOrder;
  }

  if (
    !queryWithOrder.error.message.includes("sort_order") &&
    !queryWithOrder.error.message.includes("display_name") &&
    !queryWithOrder.error.message.includes("logo_url")
  ) {
    return queryWithOrder;
  }

  return supabase
    .from("gmail_connections")
    .select(
      "email_address, provider, messages_total, threads_total, history_id, encrypted_payload, connected_at, updated_at",
    )
    .order("connected_at", { ascending: true });
}

async function ensureFreshGmailTokens(payload: DecryptedGmailPayload) {
  if (!payload.expiresAt || new Date(payload.expiresAt).getTime() > Date.now()) {
    return payload.tokens;
  }

  if (!payload.tokens.refresh_token) {
    return payload.tokens;
  }

  return refreshGmailAccessToken(payload.tokens.refresh_token);
}

async function refreshGmailAccessToken(refreshToken: string) {
  const config = getGoogleOAuthConfig();

  if (!config.configured) {
    throw new Error(`Missing env vars: ${config.missing.join(", ")}`);
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google token refresh failed: ${body}`);
  }

  const refreshed = (await response.json()) as GmailTokenResponse;

  return {
    ...refreshed,
    refresh_token: refreshToken,
  };
}

async function getRecentGmailMessages(account: string, accessToken: string) {
  let messageIds = await listRecentGmailMessageIds(accessToken, "INBOX");

  if (messageIds.length === 0) {
    messageIds = await listRecentGmailMessageIds(accessToken);
  }

  const messages = await Promise.all(
    messageIds.map(async (message) => {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?` +
          new URLSearchParams({
            format: "metadata",
            metadataHeaders: "From",
          }).toString() +
          "&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=To",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Gmail message request failed: ${body}`);
      }

      const data = (await response.json()) as {
        id: string;
        labelIds?: string[];
        snippet?: string;
        payload?: {
          headers?: Array<{ name: string; value: string }>;
          parts?: Array<unknown>;
        };
      };
      const headers = new Map(
        (data.payload?.headers ?? []).map((header) => [
          header.name.toLowerCase(),
          header.value,
        ]),
      );
      const date = headers.get("date");
      const from = headers.get("from") ?? "Remitente";

      return {
        id: `${account}:${data.id}`,
        gmailId: data.id,
        sender: cleanEmailName(from),
        fromEmail: extractEmailAddress(from),
        account,
        subject: headers.get("subject") || "(sin asunto)",
        preview: data.snippet ?? "",
        time: date ? formatMessageDate(date) : "",
        tag: data.labelIds?.includes("IMPORTANT") ? "Importante" : "Inbox",
        state: data.labelIds?.includes("UNREAD") ? "No leido" : "Leido",
        unread: data.labelIds?.includes("UNREAD") ?? false,
        attachment: data.labelIds?.includes("SENT") ? false : false,
        to: headers.get("to"),
      };
    }),
  );

  return messages;
}

async function listRecentGmailMessageIds(accessToken: string, labelId?: string) {
  const params = new URLSearchParams({
    maxResults: "15",
  });

  if (labelId) {
    params.set("labelIds", labelId);
  }

  const listResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!listResponse.ok) {
    const body = await listResponse.text();
    throw new Error(`Gmail messages request failed: ${body}`);
  }

  const list = (await listResponse.json()) as {
    messages?: Array<{ id: string }>;
  };

  return list.messages ?? [];
}

export async function storeEncryptedGmailConnection(
  profile: GmailProfile,
  tokens: GmailTokenResponse,
) {
  const encryptedPayload = encryptGmailPayload(profile, tokens);
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const { error } = await supabase.from("gmail_connections").upsert(
      {
        email_address: profile.emailAddress,
        provider: "gmail",
        messages_total: profile.messagesTotal,
        threads_total: profile.threadsTotal,
        history_id: profile.historyId,
        encrypted_payload: encryptedPayload,
        connected_at: new Date().toISOString(),
      },
      {
        onConflict: "email_address",
      },
    );

    if (error) {
      throw new Error(`Supabase Gmail connection save failed: ${error.message}`);
    }

    return;
  }

  const dataDir = path.join(process.cwd(), ".data");
  await mkdir(dataDir, { recursive: true });
  await writeFile(
    path.join(dataDir, "gmail-connection.json"),
    JSON.stringify(encryptedPayload, null, 2),
  );
}

function encryptGmailPayload(
  profile: GmailProfile,
  tokens: GmailTokenResponse,
) {
  const secret = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("Missing env var: GMAIL_TOKEN_ENCRYPTION_KEY");
  }

  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify({
    connectedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    profile,
    tokens,
  });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
}

function decryptGmailPayload(payload: EncryptedGmailPayload) {
  const secret = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("Missing env var: GMAIL_TOKEN_ENCRYPTION_KEY");
  }

  const key = createHash("sha256").update(secret).digest();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8")) as DecryptedGmailPayload;
}

function cleanEmailName(value: string) {
  return value.replace(/\s*<[^>]+>\s*$/, "").replace(/^"|"$/g, "");
}

function extractEmailAddress(value: string) {
  return value.match(/<([^>]+)>/)?.[1] ?? value.match(/[^\s<]+@[^\s>]+/)?.[0];
}

function formatMessageDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
