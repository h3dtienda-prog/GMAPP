"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Settings, Sun } from "lucide-react";

const defaults = {
  appName: "MAILS",
  appLogoUrl: "",
  faviconUrl: "",
  theme: "light",
};

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
    appLogoUrl:
      window.localStorage.getItem("mails-app-logo-url") ?? defaults.appLogoUrl,
    faviconUrl:
      window.localStorage.getItem("mails-app-favicon-url") ??
      defaults.faviconUrl,
    theme: window.localStorage.getItem("mails-app-theme") ?? defaults.theme,
  };
}

export function AppPreferences() {
  const [appName, setAppName] = useState(defaults.appName);
  const [appLogoUrl, setAppLogoUrl] = useState(defaults.appLogoUrl);
  const [theme, setTheme] = useState(defaults.theme);

  useEffect(() => {
    function syncPreferences() {
      const nextPreferences = readPreferences();

      setAppName(nextPreferences.appName);
      setAppLogoUrl(nextPreferences.appLogoUrl);
      setTheme(nextPreferences.theme);
      document.title = `${nextPreferences.appName} - Centro de correo`;
      applyTheme(nextPreferences.theme);
      applyFavicon(nextPreferences.faviconUrl);
    }

    window.requestAnimationFrame(syncPreferences);
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
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-3">
        {appLogoUrl ? (
          <img
            src={appLogoUrl}
            alt=""
            className="size-10 shrink-0 rounded-xl border border-[#d8d2c6] object-cover"
          />
        ) : (
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1a73e8] text-sm font-semibold text-white">
            {appName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase text-[#8b5e34]">
            {appName}
          </p>
          <h1 className="truncate text-2xl font-semibold text-[#202124]">
            Centro de correo
          </h1>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Link
          href="/?settings=appearance"
          className="grid size-9 place-items-center rounded-full border border-[#d8d2c6] bg-white text-[#202124] shadow-sm"
          aria-label="Configuracion"
        >
          <Settings size={17} />
        </Link>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-full border border-[#d8d2c6] bg-white text-[#202124] shadow-sm"
          onClick={toggleTheme}
          aria-label="Cambiar tema"
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </div>
  );
}
