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
  labelIds: string[];
};

export type GmailDashboardLabel = {
  id: string;
  name: string;
  account: string;
  type: "system" | "user";
  messagesTotal?: number;
  unreadTotal?: number;
  threadsTotal?: number;
  threadsUnread?: number;
};

export type GmailDashboardCounts = {
  inbox: number;
  unread: number;
  starred: number;
  important: number;
  sent: number;
  drafts: number;
  spam: number;
  trash: number;
  primary: number;
  promotions: number;
  social: number;
  updates: number;
};

type GmailMailbox =
  | "inbox"
  | "unread"
  | "important"
  | "starred"
  | "sent"
  | "drafts"
  | "all"
  | "spam"
  | "trash"
  | "archive"
  | "followups";
type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const gmailCache = new Map<string, CacheEntry<unknown>>();
const gmailCacheTtlMs = 20_000;

function readGmailCache<T>(key: string) {
  const cached = gmailCache.get(key) as CacheEntry<T> | undefined;

  if (!cached || cached.expiresAt < Date.now()) {
    gmailCache.delete(key);
    return null;
  }

  return cached.value;
}

function writeGmailCache<T>(key: string, value: T) {
  gmailCache.set(key, {
    expiresAt: Date.now() + gmailCacheTtlMs,
    value,
  });

  return value;
}

function clearGmailCacheForAccount(account: string) {
  for (const key of gmailCache.keys()) {
    if (key.includes(`:${account}`)) {
      gmailCache.delete(key);
    }
  }
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  worker: (value: T) => Promise<R>,
) {
  const results: R[] = [];
  let index = 0;

  async function run() {
    while (index < values.length) {
      const currentIndex = index++;
      results[currentIndex] = await worker(values[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => run()),
  );
  return results;
}

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

export async function getGmailDashboardData(
  selectedAccount?: string,
  mailbox: GmailMailbox = "inbox",
  selectedLabelId?: string,
  loadMessages = true,
  category = "primary",
) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      accounts: [] as GmailDashboardAccount[],
      messages: [] as GmailDashboardMessage[],
      labels: [] as GmailDashboardLabel[],
      counts: emptyDashboardCounts(),
      error: null as string | null,
    };
  }

  const { data, error } = await selectGmailConnectionRows();

  if (error) {
    return {
      accounts: [] as GmailDashboardAccount[],
      messages: [] as GmailDashboardMessage[],
      labels: [] as GmailDashboardLabel[],
      counts: emptyDashboardCounts(),
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
  const labels: GmailDashboardLabel[] = [];
  const connectionErrors: string[] = [];
  const counts = emptyDashboardCounts();
  const maxMessagesPerAccount = selectedAccount ? 25 : 8;

  if (!loadMessages) {
    return {
      accounts,
      messages,
      labels,
      counts,
      error: null,
    };
  }

  await mapWithConcurrency(visibleRows, selectedAccount ? 1 : 2, async (row) => {
    try {
      const payload = decryptGmailPayload(row.encrypted_payload);
      let tokens = await ensureFreshGmailTokens(payload);
      let recentMessages: GmailDashboardMessage[];

      try {
        recentMessages = await getRecentGmailMessages(
          row.email_address,
          tokens.access_token,
          mailbox,
          selectedLabelId,
          maxMessagesPerAccount,
          category,
        );
      } catch (error) {
        if (!isInvalidGoogleCredentialsError(error) || !payload.tokens.refresh_token) {
          throw error;
        }

        tokens = await refreshGmailAccessToken(payload.tokens.refresh_token);
        recentMessages = await getRecentGmailMessages(
          row.email_address,
          tokens.access_token,
          mailbox,
          selectedLabelId,
          maxMessagesPerAccount,
          category,
        );
      }

      const accountLabels = await getCachedGmailLabels(
        row.email_address,
        tokens.access_token,
        Boolean(selectedAccount),
      );

      messages.push(...recentMessages);
      labels.push(...accountLabels);
      addLabelCounts(counts, accountLabels);
      if (selectedAccount) {
        const categoryCounts = await getGmailCategoryCounts(
          row.email_address,
          tokens.access_token,
        );
        counts.primary = categoryCounts.primary;
        counts.promotions = categoryCounts.promotions;
        counts.social = categoryCounts.social;
        counts.updates = categoryCounts.updates;
      }

      if (tokens.access_token !== payload.tokens.access_token) {
        await storeEncryptedGmailConnection(payload.profile, tokens);
      }
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "No se pudo leer Gmail.";
      connectionErrors.push(
        `${row.email_address}: ${
          isGoogleRateLimitErrorMessage(message)
            ? "Gmail limito temporalmente las lecturas de esta cuenta. Espera unos minutos o abre la cuenta individualmente."
            : message
        }`,
      );
    }
  });

  return {
    accounts,
    messages,
    labels,
    counts,
    error: connectionErrors.length > 0 ? connectionErrors.join("\n") : null,
  };
}

function emptyDashboardCounts(): GmailDashboardCounts {
  return {
    inbox: 0,
    unread: 0,
    starred: 0,
    important: 0,
    sent: 0,
    drafts: 0,
    spam: 0,
    trash: 0,
    primary: 0,
    promotions: 0,
    social: 0,
    updates: 0,
  };
}

function addLabelCounts(
  counts: GmailDashboardCounts,
  labels: GmailDashboardLabel[],
) {
  const mapping: Record<string, keyof GmailDashboardCounts> = {
    INBOX: "inbox",
    UNREAD: "unread",
    STARRED: "starred",
    IMPORTANT: "important",
    SENT: "sent",
    DRAFT: "drafts",
    SPAM: "spam",
    TRASH: "trash",
    CATEGORY_PRIMARY: "primary",
    CATEGORY_PROMOTIONS: "promotions",
    CATEGORY_SOCIAL: "social",
    CATEGORY_UPDATES: "updates",
  };

  for (const label of labels) {
    const key = mapping[label.id];

    if (key) {
      counts[key] += label.threadsUnread ?? 0;
    }
  }
}

export async function performGmailMessageAction({
  account,
  action,
  gmailId,
  labelId,
}: {
  account: string;
  action: "archive" | "star" | "unstar" | "read" | "unread" | "label";
  gmailId: string;
  labelId?: string;
}) {
  const row = await getGmailConnectionRow(account);

  if (!row) {
    throw new Error("Gmail account is not connected.");
  }

  const payload = decryptGmailPayload(row.encrypted_payload);
  const tokens = await ensureFreshGmailTokens(payload);
  const labels = getLabelMutation(action, labelId);
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${gmailId}/modify`,
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

    if (isInsufficientGoogleScopeResponse(body)) {
      throw new Error(
        `La cuenta ${account} fue conectada sin permisos para modificar correos. Reconectala con el boton Conectar Gmail y acepta los permisos de Gmail.`,
      );
    }

    throw new Error(`Gmail action failed: ${body}`);
  }

  if (tokens.access_token !== payload.tokens.access_token) {
    await storeEncryptedGmailConnection(payload.profile, tokens);
  }

  clearGmailCacheForAccount(account);
}

export async function performGmailMessagesAction({
  account,
  action,
  gmailIds,
  labelId,
}: {
  account: string;
  action: "archive" | "star" | "unstar" | "read" | "unread" | "label";
  gmailIds: string[];
  labelId?: string;
}) {
  const row = await getGmailConnectionRow(account);

  if (!row) {
    throw new Error(`La cuenta ${account} no está conectada.`);
  }

  const payload = decryptGmailPayload(row.encrypted_payload);
  const tokens = await ensureFreshGmailTokens(payload);
  const mutation = getLabelMutation(action, labelId);
  const results = await mapWithConcurrency(gmailIds, 4, async (gmailId) => {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${gmailId}/modify`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mutation),
      },
    );

    return response.ok ? null : await response.text();
  });
  const failed = results.find(Boolean);

  if (failed) {
    throw new Error(`${account}: Gmail action failed: ${failed}`);
  }

  if (tokens.access_token !== payload.tokens.access_token) {
    await storeEncryptedGmailConnection(payload.profile, tokens);
  }

  clearGmailCacheForAccount(account);
}

export async function sendGmailMessage({
  account,
  attachments = [],
  body,
  cc,
  bcc,
  subject,
  to,
}: {
  account: string;
  attachments?: Array<{ content: string; name: string; type: string }>;
  body: string;
  cc?: string;
  bcc?: string;
  subject: string;
  to: string;
}) {
  const row = await getGmailConnectionRow(account);

  if (!row) {
    throw new Error("La cuenta Gmail no está conectada.");
  }

  const payload = decryptGmailPayload(row.encrypted_payload);
  const tokens = await ensureFreshGmailTokens(payload);
  const boundary = `mails-app-${randomBytes(12).toString("hex")}`;
  const headers = [
    `From: ${account}`,
    `To: ${to}`,
    ...(cc ? [`Cc: ${cc}`] : []),
    ...(bcc ? [`Bcc: ${bcc}`] : []),
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
  ];
  const parts = [
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(body).toString("base64"),
  ];

  for (const attachment of attachments) {
    parts.push(
      `--${boundary}`,
      `Content-Type: ${attachment.type || "application/octet-stream"}; name="${attachment.name.replaceAll('"', "")}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${attachment.name.replaceAll('"', "")}"`,
      "",
      attachment.content,
    );
  }

  parts.push(`--${boundary}--`);
  const rawMessage = [...headers, ...parts].join("\r\n");
  const raw = Buffer.from(rawMessage)
    .toString("base64url");
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gmail send failed: ${await response.text()}`);
  }

  clearGmailCacheForAccount(account);
}

async function getGmailConnectionRow(account: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const queryWithCustomFields = await supabase
    .from("gmail_connections")
    .select(
      "email_address, provider, messages_total, threads_total, history_id, sort_order, display_name, logo_url, encrypted_payload, connected_at, updated_at",
    )
    .eq("email_address", account)
    .single();

  if (!queryWithCustomFields.error) {
    return queryWithCustomFields.data as GmailConnectionRow;
  }

  if (
    !queryWithCustomFields.error.message.includes("sort_order") &&
    !queryWithCustomFields.error.message.includes("display_name") &&
    !queryWithCustomFields.error.message.includes("logo_url")
  ) {
    throw new Error(queryWithCustomFields.error.message);
  }

  const { data, error } = await supabase
    .from("gmail_connections")
    .select(
      "email_address, provider, messages_total, threads_total, history_id, encrypted_payload, connected_at, updated_at",
    )
    .eq("email_address", account)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as GmailConnectionRow;
}

function getLabelMutation(
  action: "archive" | "star" | "unstar" | "read" | "unread" | "label",
  labelId?: string,
) {
  if (action === "archive") {
    return { removeLabelIds: ["INBOX"] };
  }

  if (action === "label") {
    if (!labelId) {
      throw new Error("No label was provided.");
    }

    return { addLabelIds: [labelId], removeLabelIds: ["INBOX"] };
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
  if (payload.expiresAt && new Date(payload.expiresAt).getTime() > Date.now()) {
    return payload.tokens;
  }

  if (!payload.tokens.refresh_token) {
    return payload.tokens;
  }

  return refreshGmailAccessToken(payload.tokens.refresh_token);
}

function isInvalidGoogleCredentialsError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("Invalid Credentials") ||
    error.message.includes("UNAUTHENTICATED") ||
    error.message.includes("\"code\": 401")
  );
}

function isInsufficientGoogleScopeResponse(body: string) {
  return (
    body.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT") ||
    body.includes("insufficientPermissions") ||
    body.includes("Request had insufficient authentication scopes")
  );
}

function isGoogleRateLimitErrorMessage(message: string) {
  return (
    message.includes("\"code\": 429") ||
    message.includes("rateLimitExceeded") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("Too many concurrent requests")
  );
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

async function getRecentGmailMessages(
  account: string,
  accessToken: string,
  mailbox: GmailMailbox,
  selectedLabelId?: string,
  maxResults = 25,
  category = "primary",
) {
  const cacheKey = [
    "messages",
    account,
    mailbox,
    selectedLabelId ?? "none",
    maxResults,
    category,
  ].join(":");
  const cachedMessages = readGmailCache<GmailDashboardMessage[]>(cacheKey);

  if (cachedMessages) {
    return cachedMessages;
  }

  const categoryQuery =
    mailbox === "inbox" && !selectedLabelId && category !== "all"
      ? `in:inbox category:${category}`
      : undefined;
  const threadIds: Array<{ id: string; messageId?: string }> = categoryQuery
    ? await listCategoryThreadRefs(accessToken, categoryQuery, maxResults)
    : (await listRecentGmailThreadIds(
        accessToken,
        selectedLabelId
          ? { labelId: selectedLabelId }
          : getMailboxListOptions(mailbox, category),
        maxResults,
      )).map((thread) => ({ id: thread.id }));

  const messages = await mapWithConcurrency(threadIds, 5, async (thread) => {
    const resource = thread.messageId
      ? `messages/${thread.messageId}`
      : `threads/${thread.id}`;
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/${resource}?` +
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
      threadId?: string;
      labelIds?: string[];
      snippet?: string;
      payload?: {
        headers?: Array<{ name: string; value: string }>;
        parts?: Array<unknown>;
      };
      messages?: Array<{
        id: string;
        labelIds?: string[];
        snippet?: string;
        payload?: {
          headers?: Array<{ name: string; value: string }>;
          parts?: Array<unknown>;
        };
      }>;
    };
    const threadMessages = data.messages ?? (data.threadId ? [data] : []);
    const latestMessage = threadMessages.at(-1);
    const labelIds = Array.from(
      new Set(threadMessages.flatMap((item) => item.labelIds ?? [])),
    );
    const headers = new Map(
      (latestMessage?.payload?.headers ?? []).map((header) => [
        header.name.toLowerCase(),
        header.value,
      ]),
    );
    const date = headers.get("date");
    const from = headers.get("from") ?? "Remitente";

    return {
      id: `${account}:${data.threadId ?? data.id}`,
      gmailId: data.threadId ?? data.id,
      sender: cleanEmailName(from),
      fromEmail: extractEmailAddress(from),
      account,
      subject: headers.get("subject") || "(sin asunto)",
      preview: latestMessage?.snippet ?? "",
      time: date ? formatMessageDate(date) : "",
      tag: labelIds.includes("IMPORTANT") ? "Importante" : "Inbox",
      state: labelIds.includes("UNREAD") ? "No leido" : "Leido",
      unread: labelIds.includes("UNREAD"),
      attachment: false,
      to: headers.get("to"),
      labelIds,
    };
  });

  return writeGmailCache(cacheKey, messages);
}

function getMailboxListOptions(mailbox: GmailMailbox, category = "all") {
  const categoryLabel =
    category !== "all" && ["primary", "promotions", "social", "updates", "forums"].includes(category)
      ? `CATEGORY_${category.toUpperCase()}`
      : undefined;

  if (mailbox === "unread") {
    return { labelIds: ["UNREAD", ...(categoryLabel ? [categoryLabel] : [])] };
  }

  if (mailbox === "important") {
    return { labelId: "IMPORTANT" };
  }

  if (mailbox === "starred") {
    return { labelId: "STARRED" };
  }

  if (mailbox === "sent") {
    return { labelId: "SENT" };
  }

  if (mailbox === "drafts") {
    return { labelId: "DRAFT" };
  }

  if (mailbox === "all") {
    return { query: "-in:spam -in:trash" };
  }

  if (mailbox === "spam") {
    return { labelId: "SPAM" };
  }

  if (mailbox === "trash") {
    return { labelId: "TRASH" };
  }

  if (mailbox === "archive") {
    return { query: "-in:inbox -in:sent -in:drafts" };
  }

  if (mailbox === "followups") {
    return { query: "newer_than:30d" };
  }

  if (categoryLabel) {
    return { labelIds: ["INBOX", categoryLabel] };
  }

  return { labelIds: ["INBOX"] };
}

async function listRecentGmailThreadIds(
  accessToken: string,
  options?: { labelId?: string; labelIds?: string[]; query?: string },
  maxResults = 25,
) {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
  });

  if (options?.labelId) {
    params.append("labelIds", options.labelId);
  }

  for (const labelId of options?.labelIds ?? []) {
    params.append("labelIds", labelId);
  }

  if (options?.query) {
    params.set("q", options.query);
  }

  const listResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!listResponse.ok) {
    const body = await listResponse.text();
    throw new Error(`Gmail threads request failed: ${body}`);
  }

  const list = (await listResponse.json()) as {
    threads?: Array<{ id: string }>;
  };

  return list.threads ?? [];
}

async function listCategoryThreadRefs(
  accessToken: string,
  query: string,
  maxResults: number,
) {
  const params = new URLSearchParams({
    maxResults: String(Math.min(maxResults * 4, 100)),
    q: query,
  });
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Gmail category request failed: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    messages?: Array<{ id: string; threadId: string }>;
  };
  const seen = new Set<string>();

  return (data.messages ?? [])
    .filter((message) => {
      if (seen.has(message.threadId)) return false;
      seen.add(message.threadId);
      return true;
    })
    .slice(0, maxResults)
    .map((message) => ({ id: message.threadId, messageId: message.id }));
}

async function getGmailCategoryCounts(account: string, accessToken: string) {
  const cacheKey = `category-counts:${account}`;
  const cachedCounts = readGmailCache<Record<
    "primary" | "promotions" | "social" | "updates",
    number
  >>(cacheKey);

  if (cachedCounts) {
    return cachedCounts;
  }

  const categories: Array<"primary" | "promotions" | "social" | "updates"> = [
    "primary",
    "promotions",
    "social",
    "updates",
  ];
  const estimates = await mapWithConcurrency(categories, 2, async (category) => {
    return [
      category,
      await countUniqueGmailThreads(accessToken, `in:inbox category:${category}`),
    ] as const;
  });

  return writeGmailCache(cacheKey, Object.fromEntries(estimates) as Record<
    "primary" | "promotions" | "social" | "updates",
    number
  >);
}

async function countUniqueGmailThreads(accessToken: string, query: string) {
  const threadIds = new Set<string>();
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      maxResults: "500",
      q: query,
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return threadIds.size;
    }

    const data = (await response.json()) as {
      messages?: Array<{ id: string; threadId: string }>;
      nextPageToken?: string;
    };
    for (const message of data.messages ?? []) {
      threadIds.add(message.threadId);
    }
    pageToken = data.nextPageToken;
  } while (pageToken && threadIds.size < 5000);

  return threadIds.size;
}

async function getGmailLabels(
  account: string,
  accessToken: string,
  includeSystemCounts = false,
) {
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/labels",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gmail labels request failed: ${body}`);
  }

  const data = (await response.json()) as {
    labels?: Array<{
      id: string;
      name: string;
      type: "system" | "user";
      messagesTotal?: number;
      messagesUnread?: number;
      threadsTotal?: number;
      threadsUnread?: number;
    }>;
  };

  const labels = data.labels ?? [];
  const countLabelIds = new Set([
    "INBOX",
    "UNREAD",
    "STARRED",
    "IMPORTANT",
    "SENT",
    "DRAFT",
    "SPAM",
    "TRASH",
    "CATEGORY_PRIMARY",
    "CATEGORY_PROMOTIONS",
    "CATEGORY_SOCIAL",
    "CATEGORY_UPDATES",
  ]);
  const detailedSystemLabels = includeSystemCounts
    ? await mapWithConcurrency(
        labels.filter((label) => countLabelIds.has(label.id)),
        4,
        async (label) => {
          const detailResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/labels/${label.id}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              cache: "no-store",
            },
          );

          return detailResponse.ok
            ? ((await detailResponse.json()) as typeof label)
            : label;
        },
      )
    : [];
  const detailsById = new Map(
    detailedSystemLabels.map((label) => [label.id, label]),
  );

  return labels.map((label) => {
    const detail = detailsById.get(label.id) ?? label;

    return {
      id: label.id,
      name: label.name,
      type: label.type,
      messagesTotal: detail.messagesTotal,
      unreadTotal: detail.messagesUnread,
      threadsTotal: detail.threadsTotal,
      threadsUnread: detail.threadsUnread,
      account,
    };
  });
}

async function getCachedGmailLabels(
  account: string,
  accessToken: string,
  includeSystemCounts = false,
) {
  const cacheKey = `labels:${account}:${includeSystemCounts ? "detailed" : "basic"}`;
  const cachedLabels = readGmailCache<GmailDashboardLabel[]>(cacheKey);

  if (cachedLabels) {
    return cachedLabels;
  }

  return writeGmailCache(
    cacheKey,
    await getGmailLabels(account, accessToken, includeSystemCounts),
  );
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
