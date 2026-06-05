import {
  Archive,
  Bell,
  ChevronLeft,
  Clock3,
  FileText,
  ExternalLink,
  HelpCircle,
  Inbox,
  MailPlus,
  LogOut,
  MoreVertical,
  Plus,
  Printer,
  Reply,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { AccountsList } from "@/components/accounts-list";
import { AppPreferences, ThemeToggle } from "@/components/app-preferences";
import { ComposeMail } from "@/components/compose-mail";
import { EmailBodyFrame } from "@/components/email-body-frame";
import { GmailInboxList, MoveToLabelMenu } from "@/components/gmail-inbox-list";
import { HeaderIdentity } from "@/components/header-identity";
import { SettingsPanel } from "@/components/settings-panel";
import { SidebarResizer } from "@/components/sidebar-resizer";
import {
  getGmailDashboardData,
  getGmailThreadDetail,
  type GmailDashboardAccount,
  type GmailDashboardLabel,
  type GmailDashboardMessage,
  type GmailThreadDetail,
} from "@/lib/gmail";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    account?: string;
    email?: string;
    folder?: string;
    gmail?: string;
    label?: string;
    message?: string;
    q?: string;
    reason?: string;
    settings?: string;
    tab?: string;
    vars?: string;
  }>;
};

function getGmailStatus(searchParams: Awaited<HomeProps["searchParams"]>) {
  if (searchParams.gmail === "connected") {
    return null;
  }

  if (searchParams.gmail === "missing-config") {
    return {
      title: "Faltan variables de entorno",
      text: `Completa ${searchParams.vars ?? "las variables de Gmail"} en Vercel Environment Variables y redeploya.`,
    };
  }

  if (searchParams.gmail === "invalid-state") {
    return {
      title: "No se pudo validar la conexion",
      text: "El estado OAuth no coincide. Vuelve a iniciar la conexion desde la app.",
    };
  }

  if (searchParams.gmail === "error") {
    if (searchParams.reason?.includes("sin permisos para modificar correos")) {
      return {
        title: "Faltan permisos de Gmail",
        text: searchParams.reason,
      };
    }

    return {
      title: "Google no completo la conexion",
      text: searchParams.reason ?? "Revisa la configuracion OAuth y prueba otra vez.",
    };
  }

  return null;
}

function getAccountLabel(
  accounts: GmailDashboardAccount[],
  address: string | undefined,
) {
  return accounts.find((account) => account.address === address)?.displayName ??
    address;
}

function buildMessageHref(message: GmailDashboardMessage, account?: string) {
  return `/?${new URLSearchParams({
    ...(account ? { account } : {}),
    message: message.id,
  }).toString()}`;
}

function parseMessageKey(messageKey: string | undefined) {
  const separator = messageKey?.lastIndexOf(":") ?? -1;

  if (!messageKey || separator < 1 || separator === messageKey.length - 1) {
    return null;
  }

  return {
    account: messageKey.slice(0, separator),
    threadId: messageKey.slice(separator + 1),
  };
}

function buildListHref({
  account,
  folder,
  q,
  tab,
  label,
}: {
  account?: string;
  folder?: string;
  label?: string;
  q?: string;
  tab?: string;
}) {
  const params = new URLSearchParams();

  if (account) {
    params.set("account", account);
  }

  if (folder && folder !== "inbox") {
    params.set("folder", folder);
  }

  if (q) {
    params.set("q", q);
  }

  if (label) {
    params.set("label", label);
  }

  if (tab && tab !== "primary") {
    params.set("tab", tab);
  }

  const query = params.toString();

  return query ? `/?${query}` : "/";
}

function messageMatchesQuery(message: GmailDashboardMessage, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  if (normalizedQuery === "is:unread") {
    return message.unread;
  }

  if (normalizedQuery === "important") {
    return message.tag === "Importante";
  }

  return [
    message.sender,
    message.fromEmail,
    message.account,
    message.subject,
    message.preview,
  ]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(normalizedQuery));
}

function getFolder(value: string | undefined) {
  if (
    value === "unread" ||
    value === "important" ||
    value === "starred" ||
    value === "sent" ||
    value === "drafts" ||
    value === "all" ||
    value === "spam" ||
    value === "trash" ||
    value === "archive" ||
    value === "followups"
  ) {
    return value;
  }

  return "inbox";
}

function GmailTopBar({
  accounts,
  folder,
  label,
  q,
  selectedAccount,
  tab,
}: {
  accounts: GmailDashboardAccount[];
  folder: string;
  label?: string;
  q: string;
  selectedAccount?: string;
  tab: string;
}) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 bg-[#f6f8fc] px-5 dark:bg-[#1f1f1f]">
      <form
        action="/"
        className="flex h-12 w-full max-w-[720px] items-center gap-3 rounded-full bg-[#eaf1fb] px-4 text-[#5f6368] dark:bg-[#303134] dark:text-[#bdc1c6]"
      >
        {selectedAccount ? (
          <input type="hidden" name="account" value={selectedAccount} />
        ) : null}
        {folder !== "inbox" ? (
          <input type="hidden" name="folder" value={folder} />
        ) : null}
        {label ? <input type="hidden" name="label" value={label} /> : null}
        {tab !== "primary" ? <input type="hidden" name="tab" value={tab} /> : null}
        <Search size={20} />
        <input
          name="q"
          defaultValue={q}
          className="min-w-0 flex-1 bg-transparent text-sm text-[#202124] outline-none placeholder:text-[#5f6368] dark:text-[#e8eaed] dark:placeholder:text-[#9aa0a6]"
          placeholder="Buscar correo"
        />
        <button
          type="submit"
          className="grid size-8 place-items-center rounded-full hover:bg-[#dbe7f8] dark:hover:bg-[#2b2c2f]"
          aria-label="Buscar"
          title="Buscar"
        >
          <SlidersHorizontal size={20} />
        </button>
      </form>
      <div className="hidden items-center gap-2 text-[#3c4043] dark:text-[#e8eaed] md:flex">
        <Link
          href="/?settings=help"
          className="grid size-10 place-items-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#2b2c2f]"
          aria-label="Ayuda"
          title="Ayuda"
        >
          <HelpCircle size={20} />
        </Link>
        <ThemeToggle />
        <Link
          href="/?settings=appearance"
          className="grid size-10 place-items-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#2b2c2f]"
          aria-label="Configuracion"
          title="Configuracion"
        >
          <Settings size={20} />
        </Link>
        <HeaderIdentity accounts={accounts} selectedAccount={selectedAccount} />
        <form action="/api/auth/logout" method="post">
          <button
            className="grid size-10 place-items-center rounded-full hover:bg-[#e8eaed] dark:hover:bg-[#2b2c2f]"
            aria-label="Cerrar sesion"
            title="Cerrar sesion"
          >
            <LogOut size={19} />
          </button>
        </form>
      </div>
    </header>
  );
}

function MessageActionForm({
  action,
  account,
  gmailId,
  labelId,
  redirectTo,
  children,
  label,
}: {
  action: "archive" | "star" | "label";
  account: string;
  gmailId: string;
  labelId?: string;
  redirectTo: string;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <form action="/api/messages/action" method="post">
      <input type="hidden" name="account" value={account} />
      <input type="hidden" name="gmailId" value={gmailId} />
      <input type="hidden" name="action" value={action} />
      {labelId ? <input type="hidden" name="labelId" value={labelId} /> : null}
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button
        className="grid size-10 place-items-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4] dark:text-[#bdc1c6] dark:hover:bg-[#2b2c2f]"
        aria-label={label}
        title={label}
      >
        {children}
      </button>
    </form>
  );
}

function GmailMessageReader({
  accounts,
  labels,
  thread,
  backHref,
}: {
  accounts: GmailDashboardAccount[];
  labels: GmailDashboardLabel[];
  thread: GmailThreadDetail;
  backHref: string;
}) {
  const accountLabel = getAccountLabel(accounts, thread.account);
  const latestMessage = thread.messages.at(-1);
  const actionMessage: GmailDashboardMessage = {
    id: thread.id,
    gmailId: thread.gmailId,
    account: thread.account,
    sender: latestMessage?.sender ?? "Remitente",
    fromEmail: latestMessage?.fromEmail,
    subject: thread.subject,
    preview: latestMessage?.text ?? "",
    time: latestMessage?.time ?? "",
    tag: thread.labelIds.includes("IMPORTANT") ? "Importante" : "Inbox",
    state: thread.labelIds.includes("UNREAD") ? "No leido" : "Leido",
    unread: thread.labelIds.includes("UNREAD"),
    attachment: thread.messages.some((message) => message.attachments.length > 0),
    to: latestMessage?.to,
    labelIds: thread.labelIds,
  };
  const redirectTo = buildMessageHref(actionMessage, thread.account);

  return (
    <article className="min-h-0 flex-1 rounded-t-3xl bg-white dark:bg-[#1f1f1f]">
      <div className="flex h-14 items-center justify-between border-b border-[#e0e0e0] px-5 text-[#5f6368] dark:border-[#3c4043] dark:text-[#bdc1c6]">
        <div className="flex items-center gap-2">
          <Link
            href={backHref}
            prefetch={false}
            className="grid size-10 place-items-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#2b2c2f]"
            aria-label="Volver"
            title="Volver"
          >
            <ChevronLeft size={20} />
          </Link>
          <MessageActionForm
            action="archive"
            account={thread.account}
            gmailId={thread.gmailId}
            redirectTo={backHref}
            label="Archivar"
          >
            <Archive size={18} />
          </MessageActionForm>
          <button
            className="grid size-10 place-items-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#2b2c2f]"
            aria-label="Eliminar"
            title="Eliminar"
          >
            <Trash2 size={18} />
          </button>
          <MessageActionForm
            action="star"
            account={thread.account}
            gmailId={thread.gmailId}
            redirectTo={redirectTo}
            label="Marcar importante"
          >
            <Star size={18} />
          </MessageActionForm>
          <button
            className="grid size-10 place-items-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#2b2c2f]"
            aria-label="Mas opciones"
            title="Mas opciones"
          >
            <MoreVertical size={18} />
          </button>
          <MoveToLabelMenu
            labels={labels.filter((label) => label.account === thread.account)}
            messages={[actionMessage]}
            redirectTo={backHref}
          />
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <span title="Imprimir">
            <Printer size={18} />
          </span>
          <span title="Abrir en ventana nueva">
            <ExternalLink size={18} />
          </span>
        </div>
      </div>

      <div className="px-5 py-7 md:px-10">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-normal text-[#202124] dark:text-[#e8eaed]">
            {thread.subject}
            <span className="ml-3 rounded bg-[#e8eaed] px-2 py-1 text-xs text-[#5f6368]">
              Recibidos
            </span>
          </h2>
          <span className="shrink-0 text-sm text-[#5f6368]">{latestMessage?.time}</span>
        </div>

        <div className="mt-6 space-y-8">
          {thread.messages.map((message) => (
            <section key={message.id}>
              <div className="flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e8eaed] text-[#5f6368]">
                  {message.sender.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{message.sender}</strong>
                    {message.fromEmail ? (
                      <span className="text-sm text-[#5f6368]">
                        &lt;{message.fromEmail}&gt;
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-[#5f6368] dark:text-[#bdc1c6]">
                    para {message.to ?? accountLabel}
                    {message.cc ? ` · cc ${message.cc}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[#5f6368] dark:text-[#bdc1c6]">
                  <span className="text-xs">{message.time}</span>
                  <span title="Destacar"><Star size={18} /></span>
                  <span title="Responder"><Reply size={18} /></span>
                  <span title="Mas opciones"><MoreVertical size={18} /></span>
                </div>
              </div>

              <div className="mt-6 pl-0 md:pl-14">
                {message.html ? (
                  <EmailBodyFrame html={message.html} title={thread.subject} />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-[#202124] dark:text-[#e8eaed]">
                    {message.text || "Este correo no contiene un cuerpo visible."}
                  </pre>
                )}
                {message.attachments.length > 0 ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {message.attachments.map((attachment) => (
                      <span
                        key={`${message.id}:${attachment.filename}`}
                        className="rounded-lg border border-[#dadce0] px-3 py-2 text-sm dark:border-[#3c4043]"
                        title={attachment.mimeType}
                      >
                        {attachment.filename}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 flex gap-2">
          <a
            href={`mailto:${latestMessage?.fromEmail ?? ""}?subject=${encodeURIComponent(`Re: ${thread.subject}`)}`}
            className="flex h-10 items-center gap-2 rounded-full border border-[#dadce0] px-5 text-sm font-medium hover:bg-[#f8fafd]"
          >
            <Reply size={17} />
            Responder
          </a>
          <button className="flex h-10 items-center gap-2 rounded-full border border-[#dadce0] px-5 text-sm font-medium hover:bg-[#f8fafd]">
            <Send size={17} />
            Reenviar
          </button>
        </div>
      </div>
    </article>
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const gmailStatus = getGmailStatus(params);
  const requestedMessage = parseMessageKey(params.message);
  const selectedAccount = params.account ?? requestedMessage?.account;
  const activeFolder = getFolder(params.folder);
  const activeLabel = selectedAccount ? params.label : undefined;
  const activeTab = params.tab ?? "primary";
  const query = params.q ?? "";
  const { accounts, messages, labels, counts, error } = await getGmailDashboardData(
    selectedAccount,
    activeFolder,
    activeLabel,
    !params.settings && !requestedMessage,
    activeTab,
  );
  const visibleGmailStatus =
    params.gmail === "missing-config" && accounts.length > 0
      ? null
      : gmailStatus;
  const queryMatchedMessages = messages.filter((message) =>
    messageMatchesQuery(message, query),
  );
  const showCategoryTabs = activeFolder === "inbox" && !activeLabel;
  const visibleMessages = queryMatchedMessages;
  const currentHref = buildListHref({
    account: selectedAccount,
    folder: activeFolder,
    label: activeLabel,
    q: query,
    tab: activeTab,
  });
  const tabHrefs = {
    primary: buildListHref({
      account: selectedAccount,
      folder: activeFolder,
      label: activeLabel,
      q: query,
      tab: "primary",
    }),
    promotions: buildListHref({
      account: selectedAccount,
      folder: activeFolder,
      label: activeLabel,
      q: query,
      tab: "promotions",
    }),
    social: buildListHref({
      account: selectedAccount,
      folder: activeFolder,
      label: activeLabel,
      q: query,
      tab: "social",
    }),
    updates: buildListHref({
      account: selectedAccount,
      folder: activeFolder,
      label: activeLabel,
      q: query,
      tab: "updates",
    }),
    all: buildListHref({
      account: selectedAccount,
      folder: activeFolder,
      label: activeLabel,
      q: query,
      tab: "all",
    }),
    unread: buildListHref({
      account: selectedAccount,
      folder: "unread",
      q: query,
      tab: activeTab,
    }),
    important: buildListHref({
      account: selectedAccount,
      folder: "important",
      q: query,
      tab: activeTab,
    }),
  };
  let selectedThread: GmailThreadDetail | null = null;
  let threadError: string | null = null;

  if (requestedMessage) {
    try {
      selectedThread = await getGmailThreadDetail(
        requestedMessage.account,
        requestedMessage.threadId,
      );
    } catch (error) {
      threadError = error instanceof Error ? error.message : "No se pudo abrir el correo.";
    }
  }
  const unreadCount = counts.unread;
  const importantCount = counts.important;
  const unifiedFolders = [
    {
      name: "Bandeja unificada",
      count: counts.inbox,
      icon: Inbox,
      href: buildListHref({ folder: "inbox" }),
      active:
        !selectedAccount &&
        !params.settings &&
        !selectedThread &&
        !activeLabel &&
        activeFolder === "inbox",
    },
    {
      name: "No leidos",
      count: unreadCount,
      icon: Reply,
      href: buildListHref({ folder: "unread" }),
      active: !selectedAccount && !activeLabel && activeFolder === "unread",
    },
    {
      name: "Seguimientos",
      count: 0,
      icon: Clock3,
      href: buildListHref({ folder: "followups" }),
      active: !selectedAccount && !activeLabel && activeFolder === "followups",
    },
    {
      name: "Importantes",
      count: importantCount,
      icon: Star,
      href: buildListHref({ folder: "important" }),
      active: !selectedAccount && !activeLabel && activeFolder === "important",
    },
    {
      name: "Enviados",
      count: 0,
      icon: Send,
      href: buildListHref({ folder: "sent" }),
      active: !selectedAccount && !activeLabel && activeFolder === "sent",
    },
    { name: "Configuracion", count: 0, icon: Settings, href: "/?settings=appearance", active: Boolean(params.settings) },
  ];
  const selectedAccountRecord = selectedAccount
    ? accounts.find((account) => account.address === selectedAccount)
    : undefined;
  const accountLabels = selectedAccount
    ? labels.filter((label) => label.account === selectedAccount && label.type === "user")
    : [];
  const accountFolders = [
    {
      name: "Recibidos",
      count: counts.inbox,
      icon: Inbox,
      href: buildListHref({ account: selectedAccount, folder: "inbox" }),
      active: !activeLabel && activeFolder === "inbox",
    },
    {
      name: "Destacados",
      count: counts.starred,
      icon: Star,
      href: buildListHref({ account: selectedAccount, folder: "starred" }),
      active: !activeLabel && activeFolder === "starred",
    },
    {
      name: "Pospuestos",
      count: counts.sent,
      icon: Clock3,
      href: buildListHref({ account: selectedAccount, folder: "followups" }),
      active: !activeLabel && activeFolder === "followups",
    },
    {
      name: "Enviados",
      count: counts.drafts,
      icon: Send,
      href: buildListHref({ account: selectedAccount, folder: "sent" }),
      active: !activeLabel && activeFolder === "sent",
    },
    {
      name: "Borradores",
      count: counts.spam,
      icon: FileText,
      href: buildListHref({ account: selectedAccount, folder: "drafts" }),
      active: !activeLabel && activeFolder === "drafts",
    },
    {
      name: "Importantes",
      count: importantCount,
      icon: Star,
      href: buildListHref({ account: selectedAccount, folder: "important" }),
      active: !activeLabel && activeFolder === "important",
    },
    {
      name: "Todos",
      count: counts.trash,
      icon: Inbox,
      href: buildListHref({ account: selectedAccount, folder: "all" }),
      active: !activeLabel && activeFolder === "all",
    },
    {
      name: "Spam",
      count: 0,
      icon: Archive,
      href: buildListHref({ account: selectedAccount, folder: "spam" }),
      active: !activeLabel && activeFolder === "spam",
    },
    {
      name: "Papelera",
      count: 0,
      icon: Trash2,
      href: buildListHref({ account: selectedAccount, folder: "trash" }),
      active: !activeLabel && activeFolder === "trash",
    },
  ];
  const remainingAccounts = selectedAccountRecord
    ? accounts.filter((account) => account.address !== selectedAccountRecord.address)
    : accounts;
  const sidebarUnifiedFolders = selectedAccountRecord
    ? unifiedFolders.slice(0, 1)
    : unifiedFolders;

  return (
    <main className="mails-app-shell min-h-screen bg-[#f6f8fc] text-[#202124] dark:bg-[#1f1f1f] dark:text-[#e8eaed]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[var(--sidebar-width,280px)_minmax(0,1fr)]">
        <aside className="relative max-h-screen overflow-y-auto bg-[#f6f8fc] px-3 py-4 dark:bg-[#1f1f1f] lg:sticky lg:top-0">
          <div className="flex items-start justify-between gap-3 px-2">
            <AppPreferences />
            <button
              className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#202124] shadow-sm dark:bg-[#303134] dark:text-[#e8eaed]"
              aria-label="Notificaciones"
            >
              <Bell size={18} />
            </button>
          </div>

          <nav className="mt-5 space-y-1">
            {sidebarUnifiedFolders.map((folder) => {
              const Icon = folder.icon;

              return (
                <Link
                  key={folder.name}
                  href={folder.href}
                  prefetch={false}
                  className={`flex h-9 items-center justify-between rounded-r-full px-4 text-sm ${
                    folder.active
                      ? "bg-[#d3e3fd] font-semibold text-[#041e49] dark:bg-[#394457] dark:text-[#e8f0fe]"
                      : "text-[#3c4043] hover:bg-[#eaf1fb] dark:text-[#e8eaed] dark:hover:bg-[#303134]"
                  }`}
                >
                  <span className="flex items-center gap-4">
                    <Icon size={18} />
                    {folder.name}
                  </span>
                  {folder.count > 0 ? (
                    <span className="text-xs">{folder.count}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {selectedAccountRecord ? (
            <>
              <section className="mt-5 px-2">
                <AccountsList
                  key={`selected:${selectedAccountRecord.address}:${selectedAccountRecord.sortOrder}:${selectedAccountRecord.displayName}:${selectedAccountRecord.logoUrl ?? ""}`}
                  accounts={[selectedAccountRecord]}
                  activeLabel={activeLabel}
                  labels={labels}
                  selectedAccount={selectedAccount}
                  showLabels={false}
                />
              </section>

              <ComposeMail account={selectedAccountRecord.address} />

              <nav className="mt-4 space-y-1">
                {accountFolders.map((folder) => {
                  const Icon = folder.icon;

                  return (
                    <Link
                      key={folder.name}
                      href={folder.href}
                      prefetch={false}
                      className={`flex h-9 items-center justify-between rounded-r-full px-4 text-sm ${
                        folder.active
                          ? "bg-[#d3e3fd] font-semibold text-[#041e49] dark:bg-[#394457] dark:text-[#e8f0fe]"
                          : "text-[#3c4043] hover:bg-[#eaf1fb] dark:text-[#e8eaed] dark:hover:bg-[#303134]"
                      }`}
                    >
                      <span className="flex items-center gap-4">
                        <Icon size={18} />
                        {folder.name}
                      </span>
                      {folder.count > 0 ? (
                        <span className="text-xs">{folder.count}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>

              <section className="mt-6 px-4">
                <div className="mb-2 flex items-center justify-between text-sm font-semibold text-[#202124] dark:text-[#e8eaed]">
                  <span>Etiquetas</span>
                  <span className="text-lg leading-none text-[#5f6368] dark:text-[#bdc1c6]">
                    +
                  </span>
                </div>
                <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                  {accountLabels.length > 0 ? (
                    accountLabels.map((label) => {
                      const count = label.unreadTotal ?? 0;

                      return (
                        <Link
                          key={label.id}
                          href={buildListHref({
                            account: selectedAccount,
                            label: label.id,
                          })}
                          prefetch={false}
                          className={`flex h-8 items-center justify-between gap-3 rounded-r-full text-sm ${
                            activeLabel === label.id
                              ? "font-semibold text-[#0b57d0] dark:text-[#8ab4f8]"
                              : "text-[#3c4043] hover:text-[#202124] dark:text-[#e8eaed]"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <FileText size={15} className="shrink-0" />
                            <span className="truncate">{label.name}</span>
                          </span>
                          {count > 0 ? (
                            <span className="shrink-0 text-xs font-semibold">
                              {count.toLocaleString("es")}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })
                  ) : (
                    <p className="text-sm text-[#5f6368] dark:text-[#bdc1c6]">
                      Sin etiquetas personalizadas.
                    </p>
                  )}
                </div>
              </section>
            </>
          ) : (
            <a
              href="/api/gmail/connect"
              className="mx-2 mt-6 flex h-14 items-center justify-center gap-3 rounded-2xl bg-[#c2e7ff] px-4 text-sm font-semibold text-[#001d35] shadow-sm"
            >
              <MailPlus size={20} />
              Conectar Gmail
            </a>
          )}

          <section className="mt-7 px-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#202124] dark:text-[#e8eaed]">Cuentas</h2>
              <a
                href="/api/gmail/connect"
                className="grid size-8 place-items-center rounded-full text-[#4d5156] hover:bg-[#eaf1fb] dark:text-[#e8eaed] dark:hover:bg-[#202124]"
                aria-label="Agregar cuenta"
              >
                <Plus size={17} />
              </a>
            </div>
            <AccountsList
              key={remainingAccounts
                .map(
                  (account) =>
                    `${account.address}:${account.sortOrder}:${account.displayName}:${account.logoUrl ?? ""}`,
                )
                .join("|")}
              accounts={remainingAccounts}
              activeLabel={activeLabel}
              labels={labels}
              selectedAccount={selectedAccountRecord ? undefined : selectedAccount}
              showLabels={false}
            />
          </section>
          <SidebarResizer />
        </aside>

        <section className="flex min-w-0 flex-col bg-[#f6f8fc] dark:bg-[#1f1f1f]">
          <GmailTopBar
            accounts={accounts}
            folder={activeFolder}
            label={activeLabel}
            q={query}
            selectedAccount={selectedAccount}
            tab={activeTab}
          />

          {visibleGmailStatus ? (
            <div className="mx-5 mb-3 rounded-lg border border-[#f5c2c7] bg-[#fce8e6] px-4 py-3 text-sm text-[#a50e0e]">
              <p className="font-semibold">{visibleGmailStatus.title}</p>
              <p className="mt-1 break-words">{visibleGmailStatus.text}</p>
            </div>
          ) : null}
          {error ? (
            <div className="mx-5 mb-3 rounded-lg border border-[#f5c2c7] bg-[#fce8e6] px-4 py-3 text-sm text-[#a50e0e]">
              <p className="font-semibold">No se pudo cargar Gmail</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
          ) : null}
          {threadError ? (
            <div className="mx-5 mb-3 rounded-lg border border-[#f5c2c7] bg-[#fce8e6] px-4 py-3 text-sm text-[#a50e0e]">
              <p className="font-semibold">No se pudo abrir el correo</p>
              <p className="mt-1 break-words">{threadError}</p>
            </div>
          ) : null}

          {params.settings ? (
            <SettingsPanel
              accounts={accounts}
              section={params.settings}
            />
          ) : selectedThread ? (
            <GmailMessageReader
              accounts={accounts}
              backHref={currentHref}
              labels={labels}
              thread={selectedThread}
            />
          ) : (
            <GmailInboxList
              accounts={accounts}
              allCount={messages.length}
              currentHref={currentHref}
              labels={labels}
              messages={visibleMessages}
              showTabs={showCategoryTabs}
              tab={activeTab}
              tabHrefs={tabHrefs}
            />
          )}
        </section>
      </div>
    </main>
  );
}
