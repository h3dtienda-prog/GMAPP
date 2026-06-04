"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ImageUp, MonitorCog, Palette, Save, UsersRound } from "lucide-react";
import { AccountSettingsEditor } from "@/components/account-settings-editor";
import type { GmailDashboardAccount } from "@/lib/gmail";

type SettingsPanelProps = {
  accounts: GmailDashboardAccount[];
  section?: string;
};

const sections = [
  { id: "appearance", label: "Apariencia", icon: Palette },
  { id: "accounts", label: "Cuentas", icon: UsersRound },
  { id: "layout", label: "Panel lateral", icon: MonitorCog },
];

const defaults = {
  appName: "MAILS",
  appLogoUrl: "",
  faviconUrl: "",
  theme: "light",
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

export function SettingsPanel({
  accounts,
  section = "appearance",
}: SettingsPanelProps) {
  const activeSection = sections.some((item) => item.id === section)
    ? section
    : "appearance";
  const [appName, setAppName] = useState(defaults.appName);
  const [appLogoUrl, setAppLogoUrl] = useState(defaults.appLogoUrl);
  const [faviconUrl, setFaviconUrl] = useState(defaults.faviconUrl);
  const [theme, setTheme] = useState(defaults.theme);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      setAppName(window.localStorage.getItem("mails-app-name") ?? defaults.appName);
      setAppLogoUrl(
        window.localStorage.getItem("mails-app-logo-url") ??
          defaults.appLogoUrl,
      );
      setFaviconUrl(
        window.localStorage.getItem("mails-app-favicon-url") ??
          defaults.faviconUrl,
      );
      setTheme(window.localStorage.getItem("mails-app-theme") ?? defaults.theme);
    });
  }, []);

  function savePreferences() {
    const nextName = appName.trim() || defaults.appName;

    window.localStorage.setItem("mails-app-name", nextName);
    window.localStorage.setItem("mails-app-logo-url", appLogoUrl.trim());
    window.localStorage.setItem("mails-app-favicon-url", faviconUrl.trim());
    window.localStorage.setItem("mails-app-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.title = `${nextName} - Centro de correo`;
    window.dispatchEvent(new Event("mails-preferences-updated"));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  async function uploadPreferenceLogo(
    file: File | undefined,
    setter: (value: string) => void,
  ) {
    if (!file) {
      return;
    }

    setter(await readFileAsDataUrl(file));
  }

  return (
    <section className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-[#d8d2c6] px-6 py-5">
        <p className="text-sm font-medium text-[#5f6368]">Centro de correo</p>
        <h2 className="mt-1 text-3xl font-semibold">Configuracion</h2>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="border-b border-[#d8d2c6] bg-[#f8fafd] p-4 lg:border-b-0 lg:border-r">
          <div className="space-y-1">
            {sections.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={`/?settings=${item.id}`}
                  className={`flex h-11 items-center gap-3 rounded-full px-4 text-sm font-medium ${
                    activeSection === item.id
                      ? "bg-[#d3e3fd] text-[#041e49]"
                      : "text-[#3c4043] hover:bg-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-6">
          {activeSection === "appearance" ? (
            <div className="max-w-3xl space-y-5">
              <div className="rounded-2xl border border-[#d8d2c6] p-5">
                <h3 className="text-lg font-semibold">Marca de la app</h3>
                <div className="mt-5 grid gap-4 md:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="grid size-24 place-items-center overflow-hidden rounded-3xl border border-[#d8d2c6] bg-[#e8f0fe] text-xl font-semibold text-[#174ea6]">
                    {appLogoUrl ? (
                      <img
                        src={appLogoUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      appName.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-[#5f6368]">
                      Nombre visible
                      <input
                        className="mt-1 h-11 w-full rounded-md border border-[#d8d2c6] bg-white px-3 text-[#202124] outline-none"
                        value={appName}
                        onChange={(event) => setAppName(event.target.value)}
                      />
                    </label>
                    <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#d8d2c6] bg-white px-4 text-sm font-semibold hover:bg-[#f8fafd]">
                      <ImageUp size={17} />
                      Subir logo
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) =>
                          void uploadPreferenceLogo(
                            event.target.files?.[0],
                            setAppLogoUrl,
                          )
                        }
                      />
                    </label>
                    <input
                      className="h-11 w-full rounded-md border border-[#d8d2c6] bg-white px-3 text-sm outline-none"
                      value={appLogoUrl.startsWith("data:image/")
                        ? ""
                        : appLogoUrl}
                      onChange={(event) => setAppLogoUrl(event.target.value)}
                      placeholder="URL del logo"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#d8d2c6] p-5">
                <h3 className="text-lg font-semibold">Icono y tema</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-[#5f6368]">
                    Icono de pestana
                    <input
                      className="mt-1 h-11 w-full rounded-md border border-[#d8d2c6] bg-white px-3 text-sm text-[#202124] outline-none"
                      value={faviconUrl.startsWith("data:image/")
                        ? ""
                        : faviconUrl}
                      onChange={(event) => setFaviconUrl(event.target.value)}
                      placeholder="URL del favicon"
                    />
                  </label>
                  <label className="block text-sm font-medium text-[#5f6368]">
                    Modo visual
                    <select
                      className="mt-1 h-11 w-full rounded-md border border-[#d8d2c6] bg-white px-3 text-sm text-[#202124] outline-none"
                      value={theme}
                      onChange={(event) => setTheme(event.target.value)}
                    >
                      <option value="light">Claro</option>
                      <option value="dark">Oscuro</option>
                    </select>
                  </label>
                </div>
                <label className="mt-4 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#d8d2c6] bg-white px-4 text-sm font-semibold hover:bg-[#f8fafd]">
                  <ImageUp size={17} />
                  Subir icono de pestana
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) =>
                      void uploadPreferenceLogo(
                        event.target.files?.[0],
                        setFaviconUrl,
                      )
                    }
                  />
                </label>
              </div>

              <button
                type="button"
                className="flex h-11 items-center gap-2 rounded-full bg-[#1a73e8] px-5 text-sm font-semibold text-white"
                onClick={savePreferences}
              >
                <Save size={17} />
                {saved ? "Guardado" : "Guardar cambios"}
              </button>
            </div>
          ) : null}

          {activeSection === "accounts" ? (
            <AccountSettingsEditor accounts={accounts} />
          ) : null}

          {activeSection === "layout" ? (
            <div className="max-w-3xl rounded-2xl border border-[#d8d2c6] p-5">
              <h3 className="text-lg font-semibold">Panel lateral</h3>
              <p className="mt-2 text-sm text-[#5f6368]">
                Arrastra el borde derecho de la columna izquierda para ajustar el
                ancho. El tamano queda guardado en este navegador.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
