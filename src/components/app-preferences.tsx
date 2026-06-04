"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";

const defaults = {
  appName: "MAILS",
  appTitle: "Centro de correo",
  appLogoUrl: "",
  faviconUrl: "",
  theme: "light",
};

type AppPreferenceValues = typeof defaults;

function applyTheme(theme: string) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function applyFavicon(faviconUrl: string) {
  let favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");

  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }

  favicon.href = faviconUrl || "/favicon.ico";
}

function readPreferences() {
  return {
    appName: window.localStorage.getItem("mails-app-name") ?? defaults.appName,
    appTitle:
      window.localStorage.getItem("mails-app-title") ?? defaults.appTitle,
    appLogoUrl:
      window.localStorage.getItem("mails-app-logo-url") ?? defaults.appLogoUrl,
    faviconUrl:
      window.localStorage.getItem("mails-app-favicon-url") ??
      defaults.faviconUrl,
    theme: window.localStorage.getItem("mails-app-theme") ?? defaults.theme,
  };
}

async function readRemotePreferences() {
  const localPreferences = readPreferences();
  const response = await fetch("/api/preferences", { cache: "no-store" });

  if (!response.ok) {
    return localPreferences;
  }

  const remotePreferences = (await response.json()) as AppPreferenceValues;

  return {
    appName:
      remotePreferences.appName !== defaults.appName ||
      localPreferences.appName === defaults.appName
        ? remotePreferences.appName
        : localPreferences.appName,
    appTitle:
      remotePreferences.appTitle !== defaults.appTitle ||
      localPreferences.appTitle === defaults.appTitle
        ? remotePreferences.appTitle
        : localPreferences.appTitle,
    appLogoUrl: remotePreferences.appLogoUrl || localPreferences.appLogoUrl,
    faviconUrl: remotePreferences.faviconUrl || localPreferences.faviconUrl,
    theme: remotePreferences.theme || localPreferences.theme,
  };
}

export function AppPreferences() {
  const [appName, setAppName] = useState(defaults.appName);
  const [appTitle, setAppTitle] = useState(defaults.appTitle);
  const [appLogoUrl, setAppLogoUrl] = useState(defaults.appLogoUrl);

  useEffect(() => {
    function syncPreferences() {
      const nextPreferences = readPreferences();

      setAppName(nextPreferences.appName);
      setAppTitle(nextPreferences.appTitle);
      setAppLogoUrl(nextPreferences.appLogoUrl);
      document.title = `${nextPreferences.appName} - ${nextPreferences.appTitle}`;
      applyTheme(nextPreferences.theme);
      applyFavicon(nextPreferences.faviconUrl);
    }

    window.requestAnimationFrame(() => {
      void readRemotePreferences()
        .then((nextPreferences) => {
          window.localStorage.setItem("mails-app-name", nextPreferences.appName);
          window.localStorage.setItem(
            "mails-app-title",
            nextPreferences.appTitle,
          );
          window.localStorage.setItem(
            "mails-app-logo-url",
            nextPreferences.appLogoUrl,
          );
          window.localStorage.setItem(
            "mails-app-favicon-url",
            nextPreferences.faviconUrl,
          );
          window.localStorage.setItem("mails-app-theme", nextPreferences.theme);
          syncPreferences();
        })
        .catch(syncPreferences);
    });
    window.addEventListener("mails-preferences-updated", syncPreferences);

    return () => {
      window.removeEventListener("mails-preferences-updated", syncPreferences);
    };
  }, []);

  return (
    <div className="min-w-0 flex-1">
      <Link
        href="/"
        className="flex min-w-0 items-center gap-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
        aria-label="Ir a Bandeja unificada"
        title="Ir a Bandeja unificada"
      >
        {appLogoUrl ? (
          <img
            src={appLogoUrl}
            alt=""
            className="size-10 shrink-0 rounded-xl border border-[#d8d2c6] object-cover dark:border-[#3c4043]"
          />
        ) : (
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1a73e8] text-sm font-semibold text-white">
            {appName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase text-[#8b5e34] dark:text-[#fbbc04]">
            {appName}
          </p>
          <h1 className="truncate text-2xl font-semibold text-[#202124] dark:text-[#e8eaed]">
            {appTitle}
          </h1>
        </div>
      </Link>
    </div>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(defaults.theme);

  useEffect(() => {
    function syncPreferences() {
      const nextTheme = readPreferences().theme;

      setTheme(nextTheme);
      applyTheme(nextTheme);
    }

    window.requestAnimationFrame(() => {
      void readRemotePreferences()
        .then((nextPreferences) => {
          window.localStorage.setItem("mails-app-theme", nextPreferences.theme);
          syncPreferences();
        })
        .catch(syncPreferences);
    });
    window.addEventListener("mails-preferences-updated", syncPreferences);

    return () => {
      window.removeEventListener("mails-preferences-updated", syncPreferences);
    };
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    window.localStorage.setItem("mails-app-theme", nextTheme);
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new Event("mails-preferences-updated"));
  }

  return (
    <button
      type="button"
      className="grid size-10 place-items-center rounded-full text-[#3c4043] hover:bg-[#e8eaed] dark:text-[#e8eaed] dark:hover:bg-[#2b2c2f]"
      onClick={toggleTheme}
      aria-label="Cambiar tema"
      title="Cambiar tema"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
