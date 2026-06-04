import {
  Archive,
  Bell,
  ChevronLeft,
  Clock3,
  ExternalLink,
  Grid3X3,
  HelpCircle,
  Home as HomeIcon,
  Inbox,
  MailPlus,
  MoreVertical,
  Plus,
  Printer,
  Reply,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  SmilePlus,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { AccountsList } from "@/components/accounts-list";
import { AppPreferences } from "@/components/app-preferences";
import { GmailInboxList, MoveToLabelMenu } from "@/components/gmail-inbox-list";
import { HeaderIdentity } from "@/components/header-identity";
import { SettingsPanel } from "@/components/settings-panel";
import { SidebarResizer } from "@/components/sidebar-resizer";
import {
  getGmailDashboardData,
  type GmailDashboardAccount,
  type GmailDashboardLabel,
  type GmailDashboardMessage,
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

function getMessageCategory(message: GmailDashboardMessage) {
  const searchableText = `${message.sender} ${message.fromEmail ?? ""} ${message.subject} ${message.preview}`.toLowerCase();

  if (
    /\b(instagram|facebook|discord|linkedin|x\.com|twitter|social)\b/.test(
      searchableText,
    )
  ) {
    return "social";
  }

  if (
    /\b(promo|sale|oferta|descuento|marketing|newsletter|patreon|stripe|mercado|shop|tienda)\b/.test(
      searchableText,
    )
  ) {
    return "promotions";
  }

  return "primary";
}

function filterMessages(
  messages: GmailDashboardMessage[],
  tab: string,
  query: string,
) {
  return messages.filter(
    (message) =>
      (tab === "all" || getMessageCategory(message) === tab) &&
      messageMatchesQuery(message, query),
  );
}

function getFolder(value: string | undefined) {
  if (
    value === "unread" ||
    value === "important" ||
    value === "sent" ||
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
    <header className="flex h-16 items-center justify-between gap-4 bg-[#f6f8fc] px-5">
      <form
        action="/"
        className="flex h-12 w-full max-w-[720px] items-center gap-3 rounded-full bg-[#eaf1fb] px-4 text-[#5f6368]"
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
          className="min-w-0 flex-1 bg-transparent text-sm text-[#202124] outline-none placeholder:text-[#5f6368]"
          placeholder="Buscar correo"
        />
        <button
          type="submit"
          className="grid size-8 place-items-center rounded-full hover:bg-[#dbe7f8]"
          aria-label="Buscar"
          title="Buscar"
        >
          <SlidersHorizontal size={20} />
        </button>
      </form>
      <div className="hidden items-center gap-2 text-[#3c4043] md:flex">
        <button
          className="grid size-10 place-items-center rounded-full hover:bg-[#e8eaed]"
          aria-label="Ayuda"
          title="Ayuda"
        >
          <HelpCircle size={20} />
        </button>
        <Link
          href="/?settings=appearance"
          className="grid size-10 place-items-center rounded-full hover:bg-[#e8eaed]"
          aria-label="Configuracion"
          title="Configuracion"
        >
          <Settings size={20} />
        </Link>
        <button
          className="grid size-10 place-items-center rounded-full hover:bg-[#e8eaed]"
          aria-label="Aplicaciones"
          title="Aplicaciones"
        >
          <Grid3X3 size={20} />
        </button>
        <HeaderIdentity accounts={accounts} selectedAccount={selectedAccount} />
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
        className="grid size-10 place-items-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4]"
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
  message,
  selectedAccount,
}: {
  accounts: GmailDashboardAccount[];
  labels: GmailDashboardLabel[];
  message: GmailDashboardMessage;
  selectedAccount?: string;
}) {
  const accountLabel = getAccountLabel(accounts, message.account);
  const backHref = selectedAccount
    ? `/?account=${encodeURIComponent(selectedAccount)}`
    : "/";
  const redirectTo = buildMessageHref(message, selectedAccount);

  return (
    <article className="min-h-0 flex-1 rounded-t-3xl bg-white">
      <div className="flex h-14 items-center justify-between border-b border-[#e0e0e0] px-5 text-[#5f6368]">
        <div className="flex items-center gap-2">
          <a
            href={backHref}
            className="grid size-10 place-items-center rounded-full hover:bg-[#f1f3f4]"
            aria-label="Volver"
            title="Volver"
          >
            <ChevronLeft size={20} />
          </a>
          <MessageActionForm
            action="archive"
            account={message.account}
            gmailId={message.gmailId}
            redirectTo={backHref}
            label="Archivar"
          >
            <Archive size={18} />
          </MessageActionForm>
          <button
            className="grid size-10 place-items-center rounded-full hover:bg-[#f1f3f4]"
            aria-label="Eliminar"
            title="Eliminar"
          >
            <Trash2 size={18} />
          </button>
          <MessageActionForm
            action="star"
            account={message.account}
            gmailId={message.gmailId}
            redirectTo={redirectTo}
            label="Marcar importante"
          >
            <Star size={18} />
          </MessageActionForm>
          <button
            className="grid size-10 place-items-center rounded-full hover:bg-[#f1f3f4]"
            aria-label="Mas opciones"
            title="Mas opciones"
          >
            <MoreVertical size={18} />
          </button>
          <MoveToLabelMenu
            labels={labels.filter((label) => label.account === message.account)}
            messages={[message]}
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

      <div className="px-8 py-8">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-normal text-[#202124]">
            {message.subject}
            <span className="ml-3 rounded bg-[#e8eaed] px-2 py-1 text-xs text-[#5f6368]">
              Recibidos
            </span>
          </h2>
          <span className="shrink-0 text-sm text-[#5f6368]">{message.time}</span>
        </div>

        <div className="mt-6 flex items-start gap-4">
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
            <p className="text-sm text-[#5f6368]">
              para {message.to ?? accountLabel}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[#5f6368]">
            <span title="Destacar">
              <Star size={18} />
            </span>
            <span title="Agregar reaccion">
              <SmilePlus size={18} />
            </span>
            <span title="Responder">
              <Reply size={18} />
            </span>
            <span title="Mas opciones">
              <MoreVertical size={18} />
            </span>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-lg border border-[#dadce0] px-8 py-10 text-center shadow-sm">
          <p className="text-sm font-semibold text-[#4285f4]">{accountLabel}</p>
          <h3 className="mt-5 text-2xl font-normal">{message.subject}</h3>
          <div className="mx-auto mt-8 h-px max-w-md bg-[#dadce0]" />
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#3c4043]">
            {message.preview || "Sin vista previa disponible."}
          </p>
        </div>

        <div className="mt-28 flex gap-2">
          <a
            href={`mailto:${message.fromEmail ?? ""}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
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
  const selectedAccount = params.account;
  const activeFolder = getFolder(params.folder);
  const activeLabel = selectedAccount ? params.label : undefined;
  const activeTab = params.tab ?? "primary";
  const query = params.q ?? "";
  const { accounts, messages, labels, error } = await getGmailDashboardData(
    selectedAccount,
    activeFolder,
    activeLabel,
  );
  const queryMatchedMessages = messages.filter((message) =>
    messageMatchesQuery(message, query),
  );
  const visibleMessages = filterMessages(queryMatchedMessages, activeTab, "");
  const tabCounts = {
    primary: queryMatchedMessages.filter(
      (message) => getMessageCategory(message) === "primary",
    ).length,
    promotions: queryMatchedMessages.filter(
      (message) => getMessageCategory(message) === "promotions",
    ).length,
    social: queryMatchedMessages.filter(
      (message) => getMessageCategory(message) === "social",
    ).length,
  };
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
  const selectedMessage = params.message
    ? messages.find((message) => message.id === params.message) ?? null
    : null;
  const unreadCount = queryMatchedMessages.filter((message) => message.unread).length;
  const importantCount = queryMatchedMessages.filter(
    (message) => message.tag === "Importante",
  ).length;
  const folders = [
    { name: "Home", count: 0, icon: HomeIcon, href: "/", active: !selectedAccount && !params.settings },
    {
      name: "Bandeja unificada",
      count: messages.length,
      icon: Inbox,
      href: buildListHref({ account: selectedAccount, folder: "inbox" }),
      active:
        !params.settings &&
        !selectedMessage &&
        !activeLabel &&
        activeFolder === "inbox",
    },
    {
      name: "No leidos",
      count: unreadCount,
      icon: Reply,
      href: buildListHref({ account: selectedAccount, folder: "unread" }),
      active: !activeLabel && activeFolder === "unread",
    },
    {
      name: "Seguimientos",
      count: 0,
      icon: Clock3,
      href: buildListHref({ account: selectedAccount, folder: "followups" }),
      active: !activeLabel && activeFolder === "followups",
    },
    {
      name: "Importantes",
      count: importantCount,
      icon: Star,
      href: buildListHref({ account: selectedAccount, folder: "important" }),
      active: !activeLabel && activeFolder === "important",
    },
    {
      name: "Enviados",
      count: 0,
      icon: Send,
      href: buildListHref({ account: selectedAccount, folder: "sent" }),
      active: !activeLabel && activeFolder === "sent",
    },
    { name: "Configuracion", count: 0, icon: Settings, href: "/?settings=appearance", active: Boolean(params.settings) },
  ];

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-[#202124] dark:bg-[#111315] dark:text-[#e8eaed]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[var(--sidebar-width,280px)_minmax(0,1fr)]">
        <aside className="relative max-h-screen overflow-y-auto bg-[#f6f8fc] px-3 py-4 lg:sticky lg:top-0">
          <div className="flex items-start justify-between gap-3 px-2">
            <AppPreferences />
            <button
              className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#202124] shadow-sm"
              aria-label="Notificaciones"
            >
              <Bell size={18} />
            </button>
          </div>

          <a
            href="/api/gmail/connect"
            className="mx-2 mt-6 flex h-14 items-center justify-center gap-3 rounded-2xl bg-[#c2e7ff] px-4 text-sm font-semibold text-[#001d35] shadow-sm"
          >
            <MailPlus size={20} />
            Conectar Gmail
          </a>

          <nav className="mt-5 space-y-1">
            {folders.map((folder) => {
              const Icon = folder.icon;

              return (
                <a
                  key={folder.name}
                  href={folder.href}
                  className={`flex h-9 items-center justify-between rounded-r-full px-4 text-sm ${
                    folder.active
                      ? "bg-[#d3e3fd] font-semibold text-[#041e49]"
                      : "text-[#3c4043] hover:bg-[#eaf1fb]"
                  }`}
                >
                  <span className="flex items-center gap-4">
                    <Icon size={18} />
                    {folder.name}
                  </span>
                  {folder.count > 0 ? (
                    <span className="text-xs">{folder.count}</span>
                  ) : null}
                </a>
              );
            })}
          </nav>

          <section className="mt-7 px-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#202124]">Cuentas</h2>
              <a
                href="/api/gmail/connect"
                className="grid size-8 place-items-center rounded-full text-[#4d5156] hover:bg-[#eaf1fb]"
                aria-label="Agregar cuenta"
              >
                <Plus size={17} />
              </a>
            </div>
            <AccountsList
              key={accounts
                .map(
                  (account) =>
                    `${account.address}:${account.sortOrder}:${account.displayName}:${account.logoUrl ?? ""}`,
                )
                .join("|")}
              accounts={accounts}
              activeLabel={activeLabel}
              labels={labels}
              selectedAccount={selectedAccount}
            />
          </section>
          <SidebarResizer />
        </aside>

        <section className="flex min-w-0 flex-col bg-[#f6f8fc]">
          <GmailTopBar
            accounts={accounts}
            folder={activeFolder}
            label={activeLabel}
            q={query}
            selectedAccount={selectedAccount}
            tab={activeTab}
          />

          {gmailStatus ? (
            <div className="mx-5 mb-3 rounded-lg border border-[#f5c2c7] bg-[#fce8e6] px-4 py-3 text-sm text-[#a50e0e]">
              <p className="font-semibold">{gmailStatus.title}</p>
              <p className="mt-1 break-words">{gmailStatus.text}</p>
            </div>
          ) : null}
          {error ? (
            <div className="mx-5 mb-3 rounded-lg border border-[#f5c2c7] bg-[#fce8e6] px-4 py-3 text-sm text-[#a50e0e]">
              <p className="font-semibold">No se pudo cargar Gmail</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
          ) : null}

          {params.settings ? (
            <SettingsPanel
              accounts={accounts}
              section={params.settings}
            />
          ) : selectedMessage ? (
            <GmailMessageReader
              accounts={accounts}
              labels={labels}
              message={selectedMessage}
              selectedAccount={selectedAccount}
            />
          ) : (
            <GmailInboxList
              accounts={accounts}
              allCount={messages.length}
              counts={tabCounts}
              currentHref={currentHref}
              labels={labels}
              messages={visibleMessages}
              selectedAccount={selectedAccount}
              tab={activeTab}
              tabHrefs={tabHrefs}
            />
          )}
        </section>
      </div>
    </main>
  );
}
