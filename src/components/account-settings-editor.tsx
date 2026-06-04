"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Save } from "lucide-react";
import type { GmailDashboardAccount } from "@/lib/gmail";

type AccountSettingsEditorProps = {
  accounts: GmailDashboardAccount[];
};

function getInitials(value: string) {
  return (value.replace(/@.*/, "").slice(0, 2) || "GM").toUpperCase();
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function accountProfileKey(account: string) {
  return `mails-account-profile:${account}`;
}

const accountOrderKey = "mails-account-order";

function applyLocalProfilesAndOrder(accounts: GmailDashboardAccount[]) {
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

export function AccountSettingsEditor({
  accounts,
}: AccountSettingsEditorProps) {
  const router = useRouter();
  const [visibleAccounts, setVisibleAccounts] = useState(accounts);
  const [drafts, setDrafts] = useState(
    () =>
      Object.fromEntries(
        accounts.map((account) => [
          account.address,
          {
            displayName: account.displayName,
            logoUrl: account.logoUrl ?? "",
          },
        ]),
      ),
  );
  const [savingAccount, setSavingAccount] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "warning" | "error">(
    "success",
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function syncProfiles() {
      const nextAccounts = applyLocalProfilesAndOrder(accounts);

      setVisibleAccounts(nextAccounts);
      setDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };

        for (const account of nextAccounts) {
          nextDrafts[account.address] = {
            displayName: account.displayName,
            logoUrl: account.logoUrl ?? "",
          };
        }

        return nextDrafts;
      });
    }

    window.requestAnimationFrame(syncProfiles);
    window.addEventListener("mails-account-profiles-updated", syncProfiles);

    return () => {
      window.removeEventListener("mails-account-profiles-updated", syncProfiles);
    };
  }, [accounts]);

  function updateDraft(
    account: string,
    field: "displayName" | "logoUrl",
    value: string,
  ) {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [account]: {
        ...currentDrafts[account],
        [field]: value,
      },
    }));
  }

  async function uploadLogo(account: string, file: File | undefined) {
    if (!file) {
      return;
    }

    updateDraft(account, "logoUrl", await readFileAsDataUrl(file));
  }

  async function saveAccount(account: GmailDashboardAccount) {
    const draft = drafts[account.address];

    if (!draft) {
      return;
    }

    setMessage(null);
    setMessageTone("success");
    setSavingAccount(account.address);
    window.localStorage.setItem(
      accountProfileKey(account.address),
      JSON.stringify(draft),
    );
    window.dispatchEvent(new Event("mails-account-profiles-updated"));

    const response = await fetch("/api/accounts/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account: account.address,
        displayName: draft.displayName,
        logoUrl: draft.logoUrl,
      }),
    });

    setSavingAccount(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      const isMissingMigration =
        body?.error?.includes("display_name") ||
        body?.error?.includes("logo_url") ||
        body?.error?.includes("migracion");

      setMessageTone(isMissingMigration ? "warning" : "error");
      setMessage(
        isMissingMigration
          ? "Guardado en este navegador. Para que quede en la base, aplica la migracion de Supabase."
          : body?.error ?? "No se pudo guardar la cuenta.",
      );
      return;
    }

    setMessageTone("success");
    setMessage("Cuenta guardada.");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="rounded-2xl border border-[#d8d2c6] p-5">
        <h3 className="text-lg font-semibold">Cuentas conectadas</h3>
        <p className="mt-2 text-sm text-[#5f6368]">
          El logo y el nombre visible se editan aca y luego se reflejan en las
          tarjetas de la barra izquierda.
        </p>
        {message ? (
          <p
            className={`mt-4 rounded-lg px-3 py-2 text-sm font-medium ${
              messageTone === "success"
                ? "bg-[#e6f4ea] text-[#137333]"
                : messageTone === "warning"
                  ? "bg-[#fef7e0] text-[#8b5e00]"
                  : "bg-[#fce8e6] text-[#a50e0e]"
            }`}
          >
            {message}
          </p>
        ) : null}
        <div className="mt-5 space-y-4">
          {visibleAccounts.map((account) => {
            const draft = drafts[account.address] ?? {
              displayName: account.displayName,
              logoUrl: account.logoUrl ?? "",
            };

            return (
              <div
                key={account.address}
                className="grid gap-4 rounded-2xl border border-[#e0e0e0] p-4 md:grid-cols-[56px_minmax(0,1fr)_180px]"
              >
                <div className="relative size-12">
                  {draft.logoUrl ? (
                    <img
                      src={draft.logoUrl}
                      alt=""
                      className="size-12 rounded-full border border-[#d8d2c6] object-cover"
                    />
                  ) : (
                    <div className="grid size-12 place-items-center rounded-full bg-[#e8f0fe] font-semibold text-[#174ea6]">
                      {getInitials(draft.displayName)}
                    </div>
                  )}
                  <span className="absolute right-0 top-0 size-3 rounded-full border-2 border-white bg-[#188038]" />
                </div>

                <div className="min-w-0 space-y-3">
                  <label className="block text-sm font-medium text-[#5f6368]">
                    Nombre a mostrar
                    <input
                      className="mt-1 h-10 w-full rounded-md border border-[#d8d2c6] bg-white px-3 text-sm font-normal text-[#202124] outline-none"
                      value={draft.displayName}
                      onChange={(event) =>
                        updateDraft(
                          account.address,
                          "displayName",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <p className="truncate text-sm text-[#5f6368]">
                    {account.address}
                  </p>
                  <div className="grid gap-2 md:grid-cols-[160px_minmax(0,1fr)]">
                    <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#d8d2c6] bg-white px-3 text-sm font-semibold hover:bg-[#f8fafd]">
                      <ImageUp size={16} />
                      Subir logo
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) =>
                          void uploadLogo(
                            account.address,
                            event.target.files?.[0],
                          )
                        }
                      />
                    </label>
                    <input
                      className="h-10 rounded-md border border-[#d8d2c6] bg-white px-3 text-sm outline-none"
                      value={draft.logoUrl.startsWith("data:image/")
                        ? ""
                        : draft.logoUrl}
                      onChange={(event) =>
                        updateDraft(
                          account.address,
                          "logoUrl",
                          event.target.value,
                        )
                      }
                      placeholder="URL del logo"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-start justify-between gap-3 md:items-end">
                  <span className="rounded-full bg-[#e6f4ea] px-3 py-1 text-xs font-semibold text-[#137333]">
                    {account.status}
                  </span>
                  <button
                    type="button"
                    className="flex h-10 items-center gap-2 rounded-full bg-[#1a73e8] px-4 text-sm font-semibold text-white disabled:opacity-60"
                    disabled={savingAccount === account.address || isPending}
                    onClick={() => void saveAccount(account)}
                  >
                    <Save size={16} />
                    {savingAccount === account.address ? "Guardando" : "Guardar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
