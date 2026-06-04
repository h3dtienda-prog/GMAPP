"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import type { GmailDashboardAccount } from "@/lib/gmail";

type AccountsListProps = {
  accounts: GmailDashboardAccount[];
  selectedAccount?: string;
};

function getInitials(value: string) {
  const parts = value
    .replace(/@.*/, "")
    .split(/[.\-_\s]+/)
    .filter(Boolean);

  return (parts[0]?.slice(0, 2) ?? "GM").toUpperCase();
}

function isConnected(account: GmailDashboardAccount) {
  return account.status.toLowerCase().includes("conect");
}

function accountProfileKey(account: string) {
  return `mails-account-profile:${account}`;
}

const accountOrderKey = "mails-account-order";

function applyLocalProfiles(accounts: GmailDashboardAccount[]) {
  const profiledAccounts = accounts.map((account) => {
    const storedProfile = window.localStorage.getItem(
      accountProfileKey(account.address),
    );

    if (!storedProfile) {
      return account;
    }

    try {
      const profile = JSON.parse(storedProfile) as {
        displayName?: string;
        logoUrl?: string;
      };

      return {
        ...account,
        displayName: profile.displayName?.trim() || account.displayName,
        logoUrl: profile.logoUrl ?? account.logoUrl,
      };
    } catch {
      return account;
    }
  });

  const storedOrder = window.localStorage.getItem(accountOrderKey);

  if (!storedOrder) {
    return profiledAccounts;
  }

  try {
    const orderedAddresses = JSON.parse(storedOrder) as string[];
    const orderMap = new Map(
      orderedAddresses.map((address, index) => [address, index]),
    );

    return [...profiledAccounts].sort(
      (first, second) =>
        (orderMap.get(first.address) ?? Number.MAX_SAFE_INTEGER) -
          (orderMap.get(second.address) ?? Number.MAX_SAFE_INTEGER) ||
        first.sortOrder - second.sortOrder ||
        first.address.localeCompare(second.address),
    );
  } catch {
    return profiledAccounts;
  }
}

export function AccountsList({ accounts, selectedAccount }: AccountsListProps) {
  const [orderedAccounts, setOrderedAccounts] = useState(accounts);
  const [draggedAddress, setDraggedAddress] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  useEffect(() => {
    function syncProfiles() {
      setOrderedAccounts(applyLocalProfiles(accounts));
    }

    window.requestAnimationFrame(syncProfiles);
    window.addEventListener("mails-account-profiles-updated", syncProfiles);

    return () => {
      window.removeEventListener("mails-account-profiles-updated", syncProfiles);
    };
  }, [accounts]);

  async function persistOrder(nextAccounts: GmailDashboardAccount[]) {
    setSaveError(null);
    setIsSavingOrder(true);
    window.localStorage.setItem(
      accountOrderKey,
      JSON.stringify(nextAccounts.map((account) => account.address)),
    );

    const response = await fetch("/api/accounts/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accounts: nextAccounts.map((account) => account.address),
      }),
    });
    setIsSavingOrder(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setSaveError(
        body?.error?.includes("sort_order")
          ? "Orden guardado en este navegador. Falta aplicar la migracion de Supabase para guardarlo en la base."
          : body?.error ?? "No se pudo guardar el orden.",
      );
      return;
    }
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
          className={`rounded-[18px] border bg-white px-2.5 py-2 transition ${
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
              className="mt-1 grid size-6 shrink-0 cursor-grab place-items-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4]"
              aria-label={`Arrastrar ${account.address}`}
            >
              <GripVertical size={16} />
            </button>
            <Link
              href={`/?account=${encodeURIComponent(account.address)}`}
              className="relative shrink-0"
            >
              {account.logoUrl ? (
                <img
                  src={account.logoUrl}
                  alt=""
                className="size-9 rounded-full border border-[#d8d2c6] object-cover"
                />
              ) : (
                <div className="grid size-9 place-items-center rounded-full bg-[#e8f0fe] text-sm font-semibold text-[#174ea6]">
                  {getInitials(account.displayName)}
                </div>
              )}
              <span
                className={`absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-white ${
                  isConnected(account) ? "bg-[#188038]" : "bg-[#d93025]"
                }`}
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/?account=${encodeURIComponent(account.address)}`}
                className="block truncate text-sm font-semibold hover:text-[#174ea6]"
              >
                {account.displayName}
              </Link>
              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[#5f6368]">
                <span>{account.provider}</span>
                <div className="flex items-center gap-1">
                  <span>{account.threadsTotal.toLocaleString("es")} hilos</span>
                  <button
                    type="button"
                    className="grid size-6 place-items-center rounded-full hover:bg-[#f1f3f4] disabled:opacity-35"
                    disabled={index === 0 || isSavingOrder}
                    onClick={() => move(account.address, -1)}
                    aria-label={`Subir ${account.address}`}
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    className="grid size-6 place-items-center rounded-full hover:bg-[#f1f3f4] disabled:opacity-35"
                    disabled={index === orderedAccounts.length - 1 || isSavingOrder}
                    onClick={() => move(account.address, 1)}
                    aria-label={`Bajar ${account.address}`}
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>
              </div>
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
