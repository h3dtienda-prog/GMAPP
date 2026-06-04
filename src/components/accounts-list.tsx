"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Pencil,
  Upload,
  X,
} from "lucide-react";
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

export function AccountsList({ accounts, selectedAccount }: AccountsListProps) {
  const router = useRouter();
  const [orderedAccounts, setOrderedAccounts] = useState(accounts);
  const [draggedAddress, setDraggedAddress] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftLogo, setDraftLogo] = useState("");
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

  async function saveProfile(account: GmailDashboardAccount) {
    setSaveError(null);

    const response = await fetch("/api/accounts/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account: account.address,
        displayName: draftName,
        logoUrl: draftLogo,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setSaveError(body?.error ?? "No se pudo guardar la cuenta.");
      return;
    }

    setOrderedAccounts((currentAccounts) =>
      currentAccounts.map((currentAccount) =>
        currentAccount.address === account.address
          ? {
              ...currentAccount,
              displayName: draftName.trim() || currentAccount.address,
              logoUrl: draftLogo.trim() || null,
            }
          : currentAccount,
      ),
    );
    setEditingAddress(null);
    startTransition(() => {
      router.refresh();
    });
  }

  function beginEdit(account: GmailDashboardAccount) {
    setSaveError(null);
    setEditingAddress(account.address);
    setDraftName(account.displayName);
    setDraftLogo(account.logoUrl ?? "");
  }

  function handleLogoUpload(file: File | undefined) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDraftLogo(String(reader.result ?? ""));
    };
    reader.readAsDataURL(file);
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
      {orderedAccounts.map((account, index) => {
        const isEditing = editingAddress === account.address;

        return (
          <div
            key={account.address}
            draggable={!isEditing}
            onDragStart={() => setDraggedAddress(account.address)}
            onDragEnd={() => setDraggedAddress(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();

              if (draggedAddress) {
                reorder(draggedAddress, account.address);
              }
            }}
            className={`rounded-[18px] border bg-white p-2.5 transition ${
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
                className="mt-1 grid size-7 shrink-0 cursor-grab place-items-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4]"
                aria-label={`Arrastrar ${account.address}`}
              >
                <GripVertical size={16} />
              </button>
              <div className="relative shrink-0">
                {(isEditing ? draftLogo : account.logoUrl) ? (
                  <img
                    src={isEditing ? draftLogo : (account.logoUrl ?? "")}
                    alt=""
                    className="size-10 rounded-full border border-[#d8d2c6] object-cover"
                  />
                ) : (
                  <div className="grid size-10 place-items-center rounded-full bg-[#e8f0fe] text-sm font-semibold text-[#174ea6]">
                    {getInitials(account.displayName)}
                  </div>
                )}
                <span
                  className={`absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-white ${
                    isConnected(account) ? "bg-[#188038]" : "bg-[#d93025]"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      className="h-9 w-full rounded-md border border-[#d8d2c6] bg-white px-2 text-sm font-semibold outline-none"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      placeholder="Nombre visible"
                    />
                    <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#d8d2c6] bg-white px-2 text-xs text-[#5f6368] hover:bg-[#f8fafd]">
                      <Upload size={14} />
                      Subir logo
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) =>
                          handleLogoUpload(event.target.files?.[0])
                        }
                      />
                    </label>
                    <input
                      className="h-9 w-full rounded-md border border-[#d8d2c6] bg-white px-2 text-xs outline-none"
                      value={draftLogo.startsWith("data:image/") ? "" : draftLogo}
                      onChange={(event) => setDraftLogo(event.target.value)}
                      placeholder="URL del logo"
                    />
                  </div>
                ) : (
                  <>
                    <Link
                      href={`/?account=${encodeURIComponent(account.address)}`}
                      className="block truncate text-sm font-semibold hover:text-[#174ea6]"
                    >
                      {account.displayName}
                    </Link>
                  </>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="rounded-full bg-[#e6f4ea] px-2 py-1 text-[11px] font-semibold text-[#137333]">
                  {account.status}
                </span>
                {isEditing ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="grid size-7 place-items-center rounded-full text-[#137333] hover:bg-[#e6f4ea]"
                      onClick={() => void saveProfile(account)}
                      aria-label={`Guardar ${account.address}`}
                    >
                      <Check size={15} />
                    </button>
                    <button
                      type="button"
                      className="grid size-7 place-items-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4]"
                      onClick={() => setEditingAddress(null)}
                      aria-label={`Cancelar ${account.address}`}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="grid size-7 place-items-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4]"
                    onClick={() => beginEdit(account)}
                    aria-label={`Editar ${account.address}`}
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#5f6368]">
              <span>{account.provider}</span>
              <div className="flex items-center gap-1">
                <span>{account.threadsTotal.toLocaleString("es")} hilos</span>
                <button
                  type="button"
                  className="grid size-7 place-items-center rounded-full hover:bg-[#f1f3f4] disabled:opacity-35"
                  disabled={index === 0 || isPending}
                  onClick={() => move(account.address, -1)}
                  aria-label={`Subir ${account.address}`}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  className="grid size-7 place-items-center rounded-full hover:bg-[#f1f3f4] disabled:opacity-35"
                  disabled={index === orderedAccounts.length - 1 || isPending}
                  onClick={() => move(account.address, 1)}
                  aria-label={`Bajar ${account.address}`}
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {saveError ? (
        <p className="rounded-md bg-[#fce8e6] px-3 py-2 text-xs font-medium text-[#a50e0e]">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}
