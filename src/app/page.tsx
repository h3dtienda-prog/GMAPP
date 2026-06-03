import {
  AlertCircle,
  Archive,
  Bell,
  CheckCircle2,
  Clock3,
  Filter,
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

const accounts = [
  {
    name: "Personal Gmail",
    address: "hache.personal@gmail.com",
    provider: "Gmail",
    unread: 18,
    status: "Lista",
    color: "bg-red-500",
  },
  {
    name: "Trabajo",
    address: "hola@empresa.com",
    provider: "Google Workspace",
    unread: 9,
    status: "Lista",
    color: "bg-blue-500",
  },
  {
    name: "Clientes",
    address: "clientes@dominio.com",
    provider: "IMAP",
    unread: 4,
    status: "Pendiente",
    color: "bg-emerald-500",
  },
];

const folders = [
  { name: "Bandeja unificada", count: 31, icon: Inbox, active: true },
  { name: "Requiere respuesta", count: 8, icon: Reply },
  { name: "Seguimientos", count: 5, icon: Clock3 },
  { name: "Importantes", count: 12, icon: Star },
  { name: "Enviados", count: 0, icon: Send },
  { name: "Archivados", count: 0, icon: Archive },
];

const messages = [
  {
    sender: "Laura Medina",
    account: "Trabajo",
    subject: "Contrato actualizado para revisar hoy",
    preview:
      "Te dejo la version final con los cambios legales y el presupuesto adjunto.",
    time: "09:42",
    tag: "Urgente",
    state: "Responder",
    unread: true,
    attachment: true,
  },
  {
    sender: "Google Security",
    account: "Personal Gmail",
    subject: "Nuevo inicio de sesion detectado",
    preview:
      "Confirma si fuiste tu. La actividad viene de un dispositivo Windows.",
    time: "08:15",
    tag: "Seguridad",
    state: "Revisar",
    unread: true,
    attachment: false,
  },
  {
    sender: "Nicolas Ramos",
    account: "Clientes",
    subject: "Consulta por propuesta de junio",
    preview:
      "Quedamos atentos a tu confirmacion para avanzar con la primera etapa.",
    time: "Ayer",
    tag: "Cliente",
    state: "Seguimiento",
    unread: false,
    attachment: false,
  },
  {
    sender: "Stripe",
    account: "Trabajo",
    subject: "Resumen de pagos semanal",
    preview:
      "El reporte incluye 14 operaciones nuevas y dos pagos que requieren control.",
    time: "Ayer",
    tag: "Finanzas",
    state: "Leer",
    unread: false,
    attachment: true,
  },
];

const metrics = [
  { label: "Sin leer", value: "31", detail: "+6 desde ayer" },
  { label: "Por responder", value: "8", detail: "3 vencen hoy" },
  { label: "Seguimientos", value: "5", detail: "2 esperando respuesta" },
  { label: "Cuentas", value: "3", detail: "2 sincronizadas" },
];

type HomeProps = {
  searchParams: Promise<{
    email?: string;
    gmail?: string;
    reason?: string;
    vars?: string;
  }>;
};

function getGmailStatus(searchParams: Awaited<HomeProps["searchParams"]>) {
  if (searchParams.gmail === "connected") {
    return {
      tone: "success",
      title: "Gmail conectado",
      text: `${searchParams.email ?? "La cuenta"} ya autorizo la app. Los tokens quedaron guardados cifrados para desarrollo local.`,
    };
  }

  if (searchParams.gmail === "missing-config") {
    return {
      tone: "warning",
      title: "Faltan variables de entorno",
      text: `Completa ${searchParams.vars ?? "las variables de Gmail"} en .env.local y reinicia el servidor.`,
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
  const selectedMessage = messages[0];

  return (
    <main className="min-h-screen bg-[#f4f1eb] text-[#202124]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-[#d8d2c6] bg-[#fffaf1] px-5 py-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-[#8b5e34]">
                MAILS
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-[#202124]">
                Centro de correo
              </h1>
            </div>
            <button
              className="grid size-10 place-items-center rounded-md border border-[#d8d2c6] bg-white text-[#202124] shadow-sm"
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
            Conectar cuenta
          </a>

          <nav className="mt-7 space-y-1">
            {folders.map((folder) => {
              const Icon = folder.icon;

              return (
                <a
                  key={folder.name}
                  href="#"
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
              <button
                className="grid size-8 place-items-center rounded-md text-[#4d5156] hover:bg-white"
                aria-label="Agregar cuenta"
              >
                <Plus size={17} />
              </button>
            </div>
            <div className="space-y-2">
              {accounts.map((account) => (
                <div
                  key={account.address}
                  className="rounded-lg border border-[#d8d2c6] bg-white p-3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 size-2.5 rounded-full ${account.color}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {account.name}
                      </p>
                      <p className="truncate text-xs text-[#5f6368]">
                        {account.address}
                      </p>
                    </div>
                    <span className="rounded-md bg-[#f1f3f4] px-2 py-1 text-xs font-semibold">
                      {account.unread}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-[#5f6368]">
                    <span>{account.provider}</span>
                    <span>{account.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
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
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-medium text-[#5f6368]">
                  Bandeja unificada
                </p>
                <h2 className="text-2xl font-semibold">
                  Todo lo importante, en una sola vista
                </h2>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="flex h-11 min-w-0 items-center gap-2 rounded-md border border-[#d8d2c6] bg-[#f8fafd] px-3 text-sm text-[#5f6368] sm:w-80">
                  <Search size={18} />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-[#202124] outline-none placeholder:text-[#7d858c]"
                    placeholder="Buscar en todas las cuentas"
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
                  Prioridad inteligente
                </div>
                <button
                  className="grid size-8 place-items-center rounded-md text-[#5f6368] hover:bg-white"
                  aria-label="Mas acciones"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>

              <div className="divide-y divide-[#d8d2c6]">
                {messages.map((message) => (
                  <article
                    key={`${message.sender}-${message.subject}`}
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
                  </article>
                ))}
              </div>
            </section>

            <section className="min-w-0 bg-white">
              <div className="flex flex-col gap-3 border-b border-[#d8d2c6] px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#174ea6]">
                    {selectedMessage.account}
                  </p>
                  <h2 className="text-xl font-semibold">
                    {selectedMessage.subject}
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button
                    className="grid size-10 place-items-center rounded-md border border-[#d8d2c6]"
                    aria-label="Marcar importante"
                  >
                    <Star size={18} />
                  </button>
                  <button
                    className="grid size-10 place-items-center rounded-md border border-[#d8d2c6]"
                    aria-label="Archivar"
                  >
                    <Archive size={18} />
                  </button>
                  <button className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#1a73e8] px-4 text-sm font-semibold text-white">
                    <Reply size={17} />
                    Responder
                  </button>
                </div>
              </div>

              <article className="px-5 py-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-md bg-[#e8f0fe] font-semibold text-[#174ea6]">
                      LM
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedMessage.sender}</h3>
                      <p className="text-sm text-[#5f6368]">
                        Para hola@empresa.com
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-[#5f6368]">Hoy, 09:42</p>
                </div>

                <div className="mt-6 max-w-3xl space-y-4 text-sm leading-7 text-[#3c4043]">
                  <p>Hola Hache,</p>
                  <p>
                    Te comparto la version actualizada del contrato. Los puntos
                    pendientes ya quedaron marcados y el presupuesto se ajusto
                    segun lo conversado.
                  </p>
                  <p>
                    Necesitamos tu confirmacion antes del cierre del dia para
                    poder avanzar con firma y calendario de entrega.
                  </p>
                </div>

                <div className="mt-7 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-[#d8d2c6] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <AlertCircle size={17} className="text-[#d93025]" />
                      Urgencia alta
                    </div>
                    <p className="mt-2 text-sm text-[#5f6368]">
                      Vence hoy y pide confirmacion directa.
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#d8d2c6] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <CheckCircle2 size={17} className="text-[#137333]" />
                      Accion sugerida
                    </div>
                    <p className="mt-2 text-sm text-[#5f6368]">
                      Responder desde la cuenta de trabajo.
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#d8d2c6] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <ShieldCheck size={17} className="text-[#174ea6]" />
                      Cuenta verificada
                    </div>
                    <p className="mt-2 text-sm text-[#5f6368]">
                      Sincronizacion OAuth lista para esta cuenta.
                    </p>
                  </div>
                </div>
              </article>

              <section className="border-t border-[#d8d2c6] bg-[#fffaf1] px-5 py-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div>
                    <h2 className="text-lg font-semibold">Conexiones</h2>
                    <p className="mt-1 text-sm text-[#5f6368]">
                      Gmail sera la primera integracion real; Outlook e IMAP
                      quedan preparados como proveedores siguientes.
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
