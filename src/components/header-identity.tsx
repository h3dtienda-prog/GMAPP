"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import type { GmailDashboardAccount } from "@/lib/gmail";

type HeaderIdentityProps = {
  accounts: GmailDashboardAccount[];
  selectedAccount?: string;
};

function getInitials(value: string) {
  return (value.replace(/@.*/, "").slice(0, 2) || "MA").toUpperCase();
}

function accountProfileKey(account: string) {
  return `mails-account-profile:${account}`;
}

export function HeaderIdentity({ accounts, selectedAccount }: HeaderIdentityProps) {
  const account = accounts.find((item) => item.address === selectedAccount);
  const [logoUrl, setLogoUrl] = useState(account?.logoUrl ?? "");
  const [label, setLabel] = useState(account?.displayName ?? "MAILS APP");

  useEffect(() => {
    function syncIdentity() {
      if (account) {
        const storedProfile = window.localStorage.getItem(
          accountProfileKey(account.address),
        );

        if (storedProfile) {
          try {
            const profile = JSON.parse(storedProfile) as {
              displayName?: string;
              logoUrl?: string;
            };

            setLogoUrl(profile.logoUrl ?? account.logoUrl ?? "");
            setLabel(profile.displayName ?? account.displayName);
            return;
          } catch {
            // Ignore malformed local profile data.
          }
        }

        setLogoUrl(account.logoUrl ?? "");
        setLabel(account.displayName);
        return;
      }

      setLogoUrl(window.localStorage.getItem("mails-app-logo-url") ?? "");
      setLabel(window.localStorage.getItem("mails-app-name") ?? "MAILS APP");
    }

    window.requestAnimationFrame(syncIdentity);
    window.addEventListener("mails-preferences-updated", syncIdentity);
    window.addEventListener("mails-account-profiles-updated", syncIdentity);

    return () => {
      window.removeEventListener("mails-preferences-updated", syncIdentity);
      window.removeEventListener("mails-account-profiles-updated", syncIdentity);
    };
  }, [account]);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="size-9 rounded-full border border-[#d8d2c6] object-cover"
      />
    );
  }

  return (
    <div className="grid size-9 place-items-center rounded-full bg-[#5965c7] text-sm font-semibold text-white">
      {getInitials(label)}
    </div>
  );
}
