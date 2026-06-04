import {
  Archive,
  Bell,
  Clock3,
  Filter,
  Home as HomeIcon,
  Inbox,
  MailPlus,
  MailWarning,
  MoreHorizontal,
  Paperclip,
  Plus,
  Reply,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
} from "lucide-react";
import { AccountsList } from "@/components/accounts-list";
import { AppPreferences } from "@/components/app-preferences";
import { SidebarResizer } from "@/components/sidebar-resizer";
import { getGmailDashboardData } from "@/lib/gmail";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    account?: string;
    email?: string;
    gmail?: string;
    message?: string;
    reason?: string;
    vars?: string;
  }>;
};

function getGmailStatus(searchParams: Awaited<HomeProps["searchParams"]>) {
  if (searchParams.gmail === "connected") {
    return null;
  }

  if (searchParams.gmail === "missing-config") {
    return {
      tone: "warning",
      title: "Faltan variables de entorno",
      text: `Completa ${searchParams.vars ?? "las variables de Gmail"} en Vercel Environment Variables y redeploya.`,
    };
  }

  if (searchParams.gmail === "invalid-state") {
    return {
      tone: "error",
      title: "No se pudo validar la conexion",
      text: "El estado OAuth no coincide. Vuelve a iniciar la conexion desde la app.",
    };
  }

  if (searchParams.gmail === "error") {
    return {
      tone: "error",
      title: "Google no completo la conexion",
      text: searchParams.reason ?? "Revisa la configuracion OAuth y prueba otra vez.",
    };
  }

  return null;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const gmailStatus = getGmailStatus(params);
  const selectedAccount = params.account;
  const { accounts, messages, error } = await getGmailDashboardData(
    selectedAccount,
  );
  const selectedMessage =
    messages.find((message) => message.id === params.message) ??
    messages[0] ??
    null;
  const selectedAccountData = accounts.find(
    (account) => account.address === selectedAccount,
  );
  const unreadCount = messages.filter((message) => message.unread).length;
  const importantCount = messages.filter(
    (message) => message.tag === "Importante",
  ).length;
  const folders = [
    { name: "Home", count: 0, icon: HomeIcon, href: "/", active: !selectedAccount },
    {
      name: "Bandeja unificada",
      count: messages.length,
      icon: Inbox,
      href: selectedAccount
        ? `/?account=${encodeURIComponent(selectedAccount)}`
        : "/",
      active: true,
    },
    { name: "No leidos", count: unreadCount, icon: Reply },
    { name: "Seguimientos", count: 0, icon: Clock3 },
    { name: "Importantes", count: importantCount, icon: Star },
    { name: "Enviados", count: 0, icon: Send },
    { name: "Archivados", count: 0, icon: Archive },
  ];
  const metrics = [
    {
      label: "Correos recientes",
      value: String(messages.length),
      detail: selectedAccount ? "cuenta seleccionada" : "Inbox Gmail",
    },
    { label: "Sin leer", value: String(unreadCount), detail: "segun Gmail" },
    { label: "Importantes", value: String(importantCount), detail: "marcados en Gmail" },
    { label: "Cuentas", value: String(accounts.length), detail: "conectadas" },
  ];

  return (
    <main className="min-h-screen bg-[#f4f1eb] text-[#202124] dark:bg-[#111315] dark:text-[#e8eaed]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[var(--sidebar-width,280px)_minmax(0,1fr)]">
        <aside className="relative max-h-screen overflow-y-auto border-b border-[#d8d2c6] bg-[#fffaf1] px-5 py-5 lg:sticky lg:top-0 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-3">
            <AppPreferences />
            <button
              className="grid size-10 shrink-0 place-items-center rounded-full border border-[#d8d2c6] bg-white text-[#202124] shadow-sm"
              aria-label="Notificaciones"
            >
              <Bell size={18} />
            </button>
          </div>

          <a
            href="/api/gmail/connect"
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#202124] px-4 text-sm font-semibold text-white shadow-sm"
          >
            <MailPlus size={18} />
            Conectar Gmail
          </a>

          <nav className="mt-7 space-y-1">
            {folders.map((folder) => {
              const Icon = folder.icon;

              return (
                <a
                  key={folder.name}
                  href={folder.href ?? "#"}
                  className={`flex h-10 items-center justify-between rounded-md px-3 text-sm ${
                    folder.active
                      ? "bg-[#e8f0fe] font-semibold text-[#174ea6]"
                      : "text-[#4d5156] hover:bg-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={17} />
                    {folder.name}
                  </span>
                  {folder.count > 0 ? (
                    <span className="text-xs">{folder.count}</span>
                  ) : null}
                </a>
              );
            })}
          </nav>

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#202124]">Cuentas</h2>
              <a
                href="/api/gmail/connect"
                className="grid size-8 place-items-center rounded-md text-[#4d5156] hover:bg-white"
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
              selectedAccount={selectedAccount}
            />
          </section>
          <SidebarResizer />
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="border-b border-[#d8d2c6] bg-white px-5 py-4">
            {gmailStatus ? (
              <div
                className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                  gmailStatus.tone === "success"
                    ? "border-[#b7e1cd] bg-[#e6f4ea] text-[#137333]"
                    : gmailStatus.tone === "warning"
                      ? "border-[#fdd663] bg-[#fef7e0] text-[#8b5e00]"
                      : "border-[#f5c2c7] bg-[#fce8e6] text-[#a50e0e]"
                }`}
              >
                <p className="font-semibold">{gmailStatus.title}</p>
                <p className="mt-1 break-words">{gmailStatus.text}</p>
              </div>
            ) : null}
            {error ? (
              <div className="mb-4 rounded-lg border border-[#f5c2c7] bg-[#fce8e6] px-4 py-3 text-sm text-[#a50e0e]">
                <p className="font-semibold">No se pudo cargar Gmail</p>
                <p className="mt-1 break-words">{error}</p>
              </div>
            ) : null}
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-medium text-[#5f6368]">
                  Bandeja unificada
                </p>
                <h2 className="text-2xl font-semibold">
                  {selectedAccountData?.displayName ??
                    selectedAccount ??
                    "Gmail conectado en tiempo real"}
                </h2>
                {selectedAccountData ? (
                  <p className="mt-1 text-sm text-[#5f6368]">
                    {selectedAccountData.address}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="flex h-11 min-w-0 items-center gap-2 rounded-md border border-[#d8d2c6] bg-[#f8fafd] px-3 text-sm text-[#5f6368] sm:w-80">
                  <Search size={18} />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-[#202124] outline-none placeholder:text-[#7d858c]"
                    placeholder="Buscar en correos cargados"
                  />
                </label>
                <button className="flex h-11 items-center justify-center gap-2 rounded-md border border-[#d8d2c6] bg-white px-4 text-sm font-semibold">
                  <Filter size={17} />
                  Filtros
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-[#d8d2c6] bg-[#fffaf1] p-4"
                >
                  <p className="text-sm text-[#5f6368]">{metric.label}</p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <strong className="text-3xl font-semibold">
                      {metric.value}
                    </strong>
                    <span className="text-right text-xs font-medium text-[#8b5e34]">
                      {metric.detail}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </header>

          <div className="grid flex-1 grid-cols-1 xl:grid-cols-[minmax(360px,480px)_minmax(0,1fr)]">
            <section className="border-b border-[#d8d2c6] bg-[#f8fafd] xl:border-b-0 xl:border-r">
              <div className="flex items-center justify-between border-b border-[#d8d2c6] px-5 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles size={17} className="text-[#b06000]" />
                  Correos recientes
                </div>
                <button
                  className="grid size-8 place-items-center rounded-md text-[#5f6368] hover:bg-white"
                  aria-label="Mas acciones"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>

              <div className="divide-y divide-[#d8d2c6]">
                {messages.length > 0 ? (
                  messages.map((message) => (
                    <a
                      key={message.id}
                      href={`/?${new URLSearchParams({
                        ...(selectedAccount ? { account: selectedAccount } : {}),
                        message: message.id,
                      }).toString()}`}
                      className={`cursor-pointer bg-white px-5 py-4 transition hover:bg-[#fffaf1] ${
                        message.unread ? "border-l-4 border-l-[#1a73e8]" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold">
                              {message.sender}
                            </h3>
                            <span className="rounded-md bg-[#e6f4ea] px-2 py-1 text-xs font-semibold text-[#137333]">
                              {message.account}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-semibold">
                            {message.subject}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-[#5f6368]">
                          {message.time}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-[#5f6368]">
                        {message.preview}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 rounded-md bg-[#fce8e6] px-2 py-1 text-xs font-semibold text-[#a50e0e]">
                          <Tag size={12} />
                          {message.tag}
                        </span>
                        <span className="rounded-md bg-[#f1f3f4] px-2 py-1 text-xs font-semibold text-[#3c4043]">
                          {message.state}
                        </span>
                        {message.attachment ? (
                          <span className="flex items-center gap-1 text-xs text-[#5f6368]">
                            <Paperclip size={13} />
                            Adjunto
                          </span>
                        ) : null}
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="bg-white px-5 py-10 text-sm text-[#5f6368]">
                    No hay mensajes recientes para mostrar.
                  </div>
                )}
              </div>
            </section>

            <section className="min-w-0 bg-white">
              {selectedMessage ? (
                <>
                  <div className="flex flex-col gap-3 border-b border-[#d8d2c6] px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#174ea6]">
                        {accounts.find(
                          (account) => account.address === selectedMessage.account,
                        )?.displayName ?? selectedMessage.account}
                      </p>
                      <h2 className="text-xl font-semibold">
                        {selectedMessage.subject}
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      <form action="/api/messages/action" method="post">
                        <input
                          type="hidden"
                          name="account"
                          value={selectedMessage.account}
                        />
                        <input
                          type="hidden"
                          name="gmailId"
                          value={selectedMessage.gmailId}
                        />
                        <input type="hidden" name="action" value="star" />
                        <input
                          type="hidden"
                          name="redirectTo"
                          value={
                            selectedAccount
                              ? `/?account=${encodeURIComponent(selectedAccount)}`
                              : "/"
                          }
                        />
                        <button
                          className="grid size-10 place-items-center rounded-md border border-[#d8d2c6]"
                          aria-label="Marcar importante"
                        >
                          <Star size={18} />
                        </button>
                      </form>
                      <form action="/api/messages/action" method="post">
                        <input
                          type="hidden"
                          name="account"
                          value={selectedMessage.account}
                        />
                        <input
                          type="hidden"
                          name="gmailId"
                          value={selectedMessage.gmailId}
                        />
                        <input type="hidden" name="action" value="archive" />
                        <input
                          type="hidden"
                          name="redirectTo"
                          value={
                            selectedAccount
                              ? `/?account=${encodeURIComponent(selectedAccount)}`
                              : "/"
                          }
                        />
                        <button
                          className="grid size-10 place-items-center rounded-md border border-[#d8d2c6]"
                          aria-label="Archivar"
                        >
                          <Archive size={18} />
                        </button>
                      </form>
                      <a
                        href={`mailto:${selectedMessage.fromEmail ?? ""}?subject=${encodeURIComponent(`Re: ${selectedMessage.subject}`)}`}
                        className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#1a73e8] px-4 text-sm font-semibold text-white"
                      >
                        <Reply size={17} />
                        Responder
                      </a>
                    </div>
                  </div>

                  <article className="px-5 py-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="grid size-11 shrink-0 place-items-center rounded-md bg-[#e8f0fe] font-semibold text-[#174ea6]">
                          {selectedMessage.sender.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {selectedMessage.sender}
                          </h3>
                          <p className="text-sm text-[#5f6368]">
                            Para {selectedMessage.to ?? selectedMessage.account}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-[#5f6368]">
                        {selectedMessage.time}
                      </p>
                    </div>

                    <p className="mt-6 max-w-3xl text-sm leading-7 text-[#3c4043]">
                      {selectedMessage.preview || "Sin vista previa disponible."}
                    </p>

                    <div className="mt-7 grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg border border-[#d8d2c6] p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <ShieldCheck size={17} className="text-[#174ea6]" />
                          Cuenta conectada
                        </div>
                        <p className="mt-2 text-sm text-[#5f6368]">
                          Mensaje obtenido desde Gmail API.
                        </p>
                      </div>
                    </div>
                  </article>
                </>
              ) : (
                <div className="px-5 py-12">
                  <h2 className="text-xl font-semibold">
                    Conecta Gmail para ver tus correos reales
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-[#5f6368]">
                    Ya no se muestran datos de ejemplo. Cuando Gmail devuelva
                    mensajes recientes, apareceran aca.
                  </p>
                </div>
              )}

              <section className="border-t border-[#d8d2c6] bg-[#fffaf1] px-5 py-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div>
                    <h2 className="text-lg font-semibold">Conexiones</h2>
                    <p className="mt-1 text-sm text-[#5f6368]">
                      Las cuentas Gmail autorizadas se guardan cifradas en
                      Supabase y se leen desde el servidor.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <a
                      href="/api/gmail/connect"
                      className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#202124] px-4 text-sm font-semibold text-white"
                    >
                      <MailPlus size={17} />
                      Activar Gmail OAuth
                    </a>
                    <button className="flex h-10 items-center justify-center gap-2 rounded-md border border-[#d8d2c6] bg-white px-4 text-sm font-semibold">
                      <MailWarning size={17} />
                      Configurar IMAP
                    </button>
                  </div>
                </div>
              </section>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
