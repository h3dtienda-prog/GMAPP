"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import type { GmailDashboardAccount } from "@/lib/gmail";

type AccountsListProps = {
  accounts: GmailDashboardAccount[];
  selectedAccount?: string;
};

export function AccountsList({ accounts, selectedAccount }: AccountsListProps) {
  const router = useRouter();
  const [orderedAccounts, setOrderedAccounts] = useState(accounts);
  const [draggedAddress, setDraggedAddress] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function persistOrder(nextAccounts: GmailDashboardAccount[]) {
    setSaveError(null);

    const response = await fetch("/api/accounts/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accounts: nextAccounts.map((account) => account.address),
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setSaveError(body?.error ?? "No se pudo guardar el orden.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  function reorder(fromAddress: string, toAddress: string) {
    if (fromAddress === toAddress) {
      return;
    }

    const fromIndex = orderedAccounts.findIndex(
      (account) => account.address === fromAddress,
    );
    const toIndex = orderedAccounts.findIndex(
      (account) => account.address === toAddress,
    );

    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    const nextAccounts = [...orderedAccounts];
    const [movedAccount] = nextAccounts.splice(fromIndex, 1);
    nextAccounts.splice(toIndex, 0, movedAccount);
    setOrderedAccounts(nextAccounts);
    void persistOrder(nextAccounts);
  }

  function move(address: string, direction: -1 | 1) {
    const currentIndex = orderedAccounts.findIndex(
      (account) => account.address === address,
    );
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedAccounts.length) {
      return;
    }

    const nextAccounts = [...orderedAccounts];
    const [movedAccount] = nextAccounts.splice(currentIndex, 1);
    nextAccounts.splice(nextIndex, 0, movedAccount);
    setOrderedAccounts(nextAccounts);
    void persistOrder(nextAccounts);
  }

  if (orderedAccounts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#d8d2c6] bg-white p-4 text-sm text-[#5f6368]">
        No hay cuentas conectadas todavia.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orderedAccounts.map((account, index) => (
        <div
          key={account.address}
          draggable
          onDragStart={() => setDraggedAddress(account.address)}
          onDragEnd={() => setDraggedAddress(null)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();

            if (draggedAddress) {
              reorder(draggedAddress, account.address);
            }
          }}
          className={`rounded-lg border bg-white p-3 transition ${
            draggedAddress === account.address
              ? "border-[#1a73e8] opacity-60"
              : selectedAccount === account.address
                ? "border-[#1a73e8] shadow-sm"
              : "border-[#d8d2c6]"
          }`}
        >
          <div className="flex items-start gap-2">
            <button
              type="button"
              className="mt-0.5 grid size-7 shrink-0 cursor-grab place-items-center rounded-md text-[#5f6368] hover:bg-[#f1f3f4]"
              aria-label={`Arrastrar ${account.address}`}
            >
              <GripVertical size={16} />
            </button>
            <span className="mt-2 size-2.5 shrink-0 rounded-full bg-red-500" />
            <div className="min-w-0 flex-1">
              <Link
                href={`/?account=${encodeURIComponent(account.address)}`}
                className="block truncate text-sm font-semibold hover:text-[#174ea6]"
              >
                {account.address}
              </Link>
              <p className="mt-1 truncate text-xs text-[#5f6368]">
                {account.messagesTotal.toLocaleString("es")} mensajes
              </p>
            </div>
            <span className="rounded-md bg-[#e6f4ea] px-2 py-1 text-xs font-semibold text-[#137333]">
              {account.status}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#5f6368]">
            <span>{account.provider}</span>
            <div className="flex items-center gap-1">
              <span>{account.threadsTotal.toLocaleString("es")} hilos</span>
              <button
                type="button"
                className="grid size-7 place-items-center rounded-md hover:bg-[#f1f3f4] disabled:opacity-35"
                disabled={index === 0 || isPending}
                onClick={() => move(account.address, -1)}
                aria-label={`Subir ${account.address}`}
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                className="grid size-7 place-items-center rounded-md hover:bg-[#f1f3f4] disabled:opacity-35"
                disabled={index === orderedAccounts.length - 1 || isPending}
                onClick={() => move(account.address, 1)}
                aria-label={`Bajar ${account.address}`}
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
      {saveError ? (
        <p className="rounded-md bg-[#fce8e6] px-3 py-2 text-xs font-medium text-[#a50e0e]">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}
