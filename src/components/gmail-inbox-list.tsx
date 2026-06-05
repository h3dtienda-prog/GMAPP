"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Eye,
  MailOpen,
  MoreVertical,
  RefreshCw,
  Star,
  Tag,
} from "lucide-react";
import type {
  GmailDashboardAccount,
  GmailDashboardLabel,
  GmailDashboardMessage,
} from "@/lib/gmail";

type GmailInboxListProps = {
  accounts: GmailDashboardAccount[];
  allCount: number;
  counts: Record<string, number>;
  currentHref: string;
  labels: GmailDashboardLabel[];
  messages: GmailDashboardMessage[];
  selectedAccount?: string;
  tab: string;
  tabHrefs: Record<string, string>;
};

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

function getSelectedGmailMessages(
  messages: GmailDashboardMessage[],
  selectedMessageIds: Set<string>,
) {
  return messages.filter((message) => selectedMessageIds.has(message.id));
}

function ActionForm({
  action,
  children,
  label,
  labelId,
  messages,
  redirectTo,
}: {
  action: "archive" | "star" | "read" | "unread" | "label";
  children: React.ReactNode;
  label: string;
  labelId?: string;
  messages: GmailDashboardMessage[];
  redirectTo: string;
}) {
  if (messages.length === 0) {
    return (
      <button
        type="button"
        disabled
        className="grid size-8 place-items-center rounded-full opacity-40"
        aria-label={label}
        title={label}
      >
        {children}
      </button>
    );
  }

  return (
    <form action="/api/messages/action" method="post">
      <input type="hidden" name="action" value={action} />
      {labelId ? <input type="hidden" name="labelId" value={labelId} /> : null}
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {messages.map((message) => (
        <span key={message.id}>
          <input type="hidden" name="account" value={message.account} />
          <input type="hidden" name="gmailId" value={message.gmailId} />
        </span>
      ))}
      <button
        className="grid size-8 place-items-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4] dark:text-[#bdc1c6] dark:hover:bg-[#2b2c2f]"
        aria-label={label}
        title={label}
      >
        {children}
      </button>
    </form>
  );
}

export function MoveToLabelMenu({
  labels,
  messages,
  redirectTo,
}: {
  labels: GmailDashboardLabel[];
  messages: GmailDashboardMessage[];
  redirectTo: string;
}) {
  const selectedAccounts = new Set(messages.map((message) => message.account));
  const account = messages[0]?.account;
  const accountLabels =
    selectedAccounts.size === 1
      ? labels.filter((label) => label.account === account)
      : [];

  return (
    <details className="relative">
      <summary
        className="grid size-8 cursor-pointer list-none place-items-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4] dark:text-[#bdc1c6] dark:hover:bg-[#2b2c2f]"
        aria-label="Mover a etiqueta"
        title="Mover a etiqueta"
      >
        <Tag size={16} />
      </summary>
      <div className="absolute left-0 z-20 mt-2 max-h-72 w-64 overflow-auto rounded-xl border border-[#dadce0] bg-white p-2 text-sm shadow-lg dark:border-[#3c4043] dark:bg-[#202124]">
        {messages.length === 0 ? (
          <p className="px-3 py-2 text-[#5f6368] dark:text-[#bdc1c6]">Selecciona al menos un mail.</p>
        ) : selectedAccounts.size > 1 ? (
          <p className="px-3 py-2 text-[#5f6368] dark:text-[#bdc1c6]">
            Para mover a etiqueta, selecciona mails de una sola cuenta.
          </p>
        ) : accountLabels.length === 0 ? (
          <p className="px-3 py-2 text-[#5f6368] dark:text-[#bdc1c6]">
            Esta cuenta no tiene etiquetas personalizadas.
          </p>
        ) : (
          accountLabels.map((label) => (
            <form
              key={label.id}
              action="/api/messages/action"
              method="post"
            >
              <input type="hidden" name="action" value="label" />
              <input type="hidden" name="labelId" value={label.id} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              {messages.map((message) => (
                <span key={message.id}>
                  <input type="hidden" name="account" value={message.account} />
                  <input type="hidden" name="gmailId" value={message.gmailId} />
                </span>
              ))}
              <button className="block w-full truncate rounded-lg px-3 py-2 text-left hover:bg-[#f1f3f4] dark:text-[#e8eaed] dark:hover:bg-[#2b2c2f]">
                {label.name}
              </button>
            </form>
          ))
        )}
      </div>
    </details>
  );
}

export function GmailInboxList({
  accounts,
  allCount,
  counts,
  currentHref,
  labels,
  messages,
  selectedAccount,
  tab,
  tabHrefs,
}: GmailInboxListProps) {
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const selectedMessages = useMemo(
    () => getSelectedGmailMessages(messages, selectedMessageIds),
    [messages, selectedMessageIds],
  );
  const allVisibleSelected =
    messages.length > 0 &&
    messages.every((message) => selectedMessageIds.has(message.id));

  function toggleAll() {
    setSelectedMessageIds((current) => {
      if (messages.every((message) => current.has(message.id))) {
        return new Set();
      }

      return new Set(messages.map((message) => message.id));
    });
  }

  function toggleMessage(messageId: string) {
    setSelectedMessageIds((current) => {
      const next = new Set(current);

      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }

      return next;
    });
  }

  const tabs = [
    { id: "primary", label: "Principal", detail: `${counts.primary ?? 0} correos` },
    { id: "promotions", label: "Promociones", detail: `${counts.promotions ?? 0} correos` },
    { id: "social", label: "Social", detail: `${counts.social ?? 0} correos` },
    { id: "updates", label: "Notificaciones", detail: `${counts.updates ?? 0} correos` },
  ];

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-t-3xl bg-white dark:bg-[#1f1f1f]">
      <div className="flex h-14 items-center justify-between border-b border-[#e0e0e0] px-5 text-[#5f6368] dark:border-[#3c4043] dark:bg-[#1f1f1f] dark:text-[#bdc1c6]">
        <div className="flex items-center gap-3">
          <label className="grid size-8 place-items-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#2b2c2f]">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAll}
              className="size-4 accent-[#0b57d0]"
              aria-label="Seleccionar correos visibles"
              title="Seleccionar correos visibles"
            />
          </label>
          {selectedMessages.length > 0 ? (
            <>
              <ActionForm
                action="archive"
                label="Archivar seleccionados"
                messages={selectedMessages}
                redirectTo={currentHref}
              >
                <Archive size={18} />
              </ActionForm>
              <ActionForm
                action="read"
                label="Marcar como leido"
                messages={selectedMessages}
                redirectTo={currentHref}
              >
                <MailOpen size={18} />
              </ActionForm>
              <ActionForm
                action="unread"
                label="Marcar como no leido"
                messages={selectedMessages}
                redirectTo={currentHref}
              >
                <Eye size={18} />
              </ActionForm>
              <ActionForm
                action="star"
                label="Destacar seleccionados"
                messages={selectedMessages}
                redirectTo={currentHref}
              >
                <Star size={18} />
              </ActionForm>
              <MoveToLabelMenu
                labels={labels}
                messages={selectedMessages}
                redirectTo={currentHref}
              />
              <span className="text-xs font-semibold text-[#3c4043] dark:text-[#e8eaed]">
                {selectedMessages.length} seleccionados
              </span>
            </>
          ) : (
            <>
              <Link
                href={currentHref}
                prefetch={false}
                className="grid size-8 place-items-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#2b2c2f]"
                aria-label="Refrescar"
                title="Refrescar"
              >
                <RefreshCw size={18} />
              </Link>
              <details className="relative">
                <summary
                  className="grid size-8 cursor-pointer list-none place-items-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#2b2c2f]"
                  aria-label="Mas opciones"
                  title="Mas opciones"
                >
                  <MoreVertical size={18} />
                </summary>
                <div className="absolute left-0 z-10 mt-2 w-56 rounded-xl border border-[#dadce0] bg-white p-2 text-sm shadow-lg dark:border-[#3c4043] dark:bg-[#202124]">
                  <Link
                    href={tabHrefs.all}
                    prefetch={false}
                    className="block rounded-lg px-3 py-2 hover:bg-[#f1f3f4] dark:text-[#e8eaed] dark:hover:bg-[#2b2c2f]"
                  >
                    Ver todos
                  </Link>
                  <Link
                    href={tabHrefs.unread}
                    prefetch={false}
                    className="block rounded-lg px-3 py-2 hover:bg-[#f1f3f4] dark:text-[#e8eaed] dark:hover:bg-[#2b2c2f]"
                  >
                    No leidos
                  </Link>
                  <Link
                    href={tabHrefs.important}
                    prefetch={false}
                    className="block rounded-lg px-3 py-2 hover:bg-[#f1f3f4] dark:text-[#e8eaed] dark:hover:bg-[#2b2c2f]"
                  >
                    Importantes
                  </Link>
                </div>
              </details>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span>
            {messages.length > 0 ? `1-${messages.length}` : "0-0"} de {allCount}
          </span>
          <ChevronLeft size={18} />
          <ChevronRight size={18} />
        </div>
      </div>

      <div className="grid border-b border-[#e0e0e0] bg-white dark:border-[#3c4043] dark:bg-[#1f1f1f] md:grid-cols-4">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={tabHrefs[item.id]}
            prefetch={false}
            className={`relative flex h-16 items-center gap-3 px-6 text-sm ${
              tab === item.id
                ? "font-semibold text-[#0b57d0] dark:text-[#8ab4f8]"
                : "text-[#5f6368] dark:text-[#bdc1c6]"
            }`}
          >
            <Tag size={18} />
            <div className="min-w-0">
              <p>{item.label}</p>
              <p className="truncate text-xs font-normal text-[#8a9099] dark:text-[#9aa0a6]">
                {item.detail}
              </p>
            </div>
            {tab === item.id ? (
              <span className="absolute bottom-0 left-4 right-4 h-1 rounded-t-full bg-[#0b57d0] dark:bg-[#8ab4f8]" />
            ) : null}
          </Link>
        ))}
      </div>

      <div className="divide-y divide-[#e8eaed] dark:divide-[#3c4043]">
        {messages.length > 0 ? (
          messages.map((message) => {
            const accountLabel = getAccountLabel(accounts, message.account);
            const isSelected = selectedMessageIds.has(message.id);

            return (
              <div
                key={message.id}
                className={`grid min-h-10 grid-cols-[28px_28px_minmax(120px,180px)_minmax(0,1fr)_92px] items-center gap-2 px-5 py-2 text-sm hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_rgba(60,64,67,.18),0_1px_3px_1px_rgba(60,64,67,.10)] ${
                  isSelected
                    ? "bg-[#c2e7ff] dark:bg-[#394457]"
                    : message.unread
                      ? "bg-white font-semibold dark:bg-[#26272a]"
                      : "bg-[#f2f6fc] dark:bg-[#232427]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleMessage(message.id)}
                  className="size-4 accent-[#0b57d0]"
                  aria-label={`Seleccionar ${message.subject}`}
                  title={`Seleccionar ${message.subject}`}
                />
                <ActionForm
                  action="star"
                  label="Destacar"
                  messages={[message]}
                  redirectTo={currentHref}
                >
                  <Star size={16} />
                </ActionForm>
                <Link
                  href={buildMessageHref(message, selectedAccount)}
                  prefetch={false}
                  className="truncate"
                >
                  {message.sender}
                </Link>
                <Link
                  href={buildMessageHref(message, selectedAccount)}
                  prefetch={false}
                  className="min-w-0 truncate text-[#5f6368] dark:text-[#bdc1c6]"
                >
                  <strong className="text-[#202124] dark:text-[#e8eaed]">{message.subject}</strong>
                  {" - "}
                  {message.preview}
                  <span className="ml-2 rounded-full bg-[#e6f4ea] px-2 py-0.5 text-xs font-semibold text-[#137333]">
                    {accountLabel}
                  </span>
                </Link>
                <div className="flex items-center justify-end gap-2">
                  <MoveToLabelMenu
                    labels={labels}
                    messages={[message]}
                    redirectTo={currentHref}
                  />
                  <span className="text-xs text-[#202124] dark:text-[#e8eaed]">{message.time}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-8 py-16 text-sm text-[#5f6368] dark:text-[#bdc1c6]">
            No hay mensajes recientes para mostrar.
          </div>
        )}
      </div>
    </section>
  );
}
