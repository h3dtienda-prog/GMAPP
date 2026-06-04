"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { Moon, Save, Settings, Sun, X } from "lucide-react";

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

export function AppPreferences() {
  const [open, setOpen] = useState(false);
  const [appName, setAppName] = useState(defaults.appName);
  const [appLogoUrl, setAppLogoUrl] = useState(defaults.appLogoUrl);
  const [faviconUrl, setFaviconUrl] = useState(defaults.faviconUrl);
  const [theme, setTheme] = useState(defaults.theme);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      const nextName =
        window.localStorage.getItem("mails-app-name") ?? defaults.appName;
      const nextLogo =
        window.localStorage.getItem("mails-app-logo-url") ??
        defaults.appLogoUrl;
      const nextFavicon =
        window.localStorage.getItem("mails-app-favicon-url") ??
        defaults.faviconUrl;
      const nextTheme =
        window.localStorage.getItem("mails-app-theme") ?? defaults.theme;

      setAppName(nextName);
      setAppLogoUrl(nextLogo);
      setFaviconUrl(nextFavicon);
      setTheme(nextTheme);
      document.title = `${nextName} - Centro de correo`;
      applyTheme(nextTheme);
      applyFavicon(nextFavicon);
    });
  }, []);

  function savePreferences() {
    const nextName = appName.trim() || defaults.appName;
    const nextLogo = appLogoUrl.trim();
    const nextFavicon = faviconUrl.trim();

    window.localStorage.setItem("mails-app-name", nextName);
    window.localStorage.setItem("mails-app-logo-url", nextLogo);
    window.localStorage.setItem("mails-app-favicon-url", nextFavicon);
    window.localStorage.setItem("mails-app-theme", theme);
    setAppName(nextName);
    setAppLogoUrl(nextLogo);
    setFaviconUrl(nextFavicon);
    document.title = `${nextName} - Centro de correo`;
    applyTheme(theme);
    applyFavicon(nextFavicon);
    setOpen(false);
  }

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    window.localStorage.setItem("mails-app-theme", nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <div className="relative min-w-0 flex-1">
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
        <button
          type="button"
          className="grid size-9 place-items-center rounded-full border border-[#d8d2c6] bg-white text-[#202124] shadow-sm"
          onClick={() => setOpen(true)}
          aria-label="Personalizar app"
        >
          <Settings size={17} />
        </button>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-full border border-[#d8d2c6] bg-white text-[#202124] shadow-sm"
          onClick={toggleTheme}
          aria-label="Cambiar tema"
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>

      {open ? (
        <div className="absolute left-0 top-full z-20 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[#d8d2c6] bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Personalizar app</h2>
            <button
              type="button"
              className="grid size-8 place-items-center rounded-full hover:bg-[#f1f3f4]"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-[#5f6368]">
              Nombre
              <input
                className="mt-1 h-10 w-full rounded-md border border-[#d8d2c6] bg-white px-3 text-sm font-normal text-[#202124] outline-none"
                value={appName}
                onChange={(event) => setAppName(event.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-[#5f6368]">
              Logo de la app
              <input
                className="mt-1 h-10 w-full rounded-md border border-[#d8d2c6] bg-white px-3 text-sm font-normal text-[#202124] outline-none"
                value={appLogoUrl}
                onChange={(event) => setAppLogoUrl(event.target.value)}
                placeholder="https://..."
              />
            </label>
            <label className="block text-xs font-semibold text-[#5f6368]">
              Icono de pestana
              <input
                className="mt-1 h-10 w-full rounded-md border border-[#d8d2c6] bg-white px-3 text-sm font-normal text-[#202124] outline-none"
                value={faviconUrl}
                onChange={(event) => setFaviconUrl(event.target.value)}
                placeholder="https://..."
              />
            </label>
            <button
              type="button"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#1a73e8] px-4 text-sm font-semibold text-white"
              onClick={savePreferences}
            >
              <Save size={16} />
              Guardar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
