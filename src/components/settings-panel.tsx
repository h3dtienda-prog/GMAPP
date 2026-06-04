"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HelpCircle,
  ImageUp,
  MailCheck,
  MonitorCog,
  Palette,
  Save,
  ServerCog,
  UsersRound,
} from "lucide-react";
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
  { id: "help", label: "Ayuda", icon: HelpCircle },
];

const defaults = {
  appName: "MAILS",
  appTitle: "Centro de correo",
  appLogoUrl: "",
  faviconUrl: "",
  theme: "light",
  lightBackground: "#f6f8fc",
  lightSurface: "#ffffff",
  lightSidebar: "#f6f8fc",
  lightAccent: "#0b57d0",
  lightButton: "#c2e7ff",
  darkBackground: "#1f1f1f",
  darkSurface: "#202124",
  darkSidebar: "#1f1f1f",
  darkAccent: "#8ab4f8",
  darkButton: "#2d5f7a",
};

type AppPreferenceValues = typeof defaults;

function mergePreferences(
  localPreferences: AppPreferenceValues,
  remotePreferences: AppPreferenceValues,
) {
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
    lightBackground:
      remotePreferences.lightBackground || localPreferences.lightBackground,
    lightSurface: remotePreferences.lightSurface || localPreferences.lightSurface,
    lightSidebar: remotePreferences.lightSidebar || localPreferences.lightSidebar,
    lightAccent: remotePreferences.lightAccent || localPreferences.lightAccent,
    lightButton: remotePreferences.lightButton || localPreferences.lightButton,
    darkBackground:
      remotePreferences.darkBackground || localPreferences.darkBackground,
    darkSurface: remotePreferences.darkSurface || localPreferences.darkSurface,
    darkSidebar: remotePreferences.darkSidebar || localPreferences.darkSidebar,
    darkAccent: remotePreferences.darkAccent || localPreferences.darkAccent,
    darkButton: remotePreferences.darkButton || localPreferences.darkButton,
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function applyCustomColors(preferences: AppPreferenceValues) {
  const root = document.documentElement;

  root.style.setProperty("--mail-light-bg", preferences.lightBackground);
  root.style.setProperty("--mail-light-surface", preferences.lightSurface);
  root.style.setProperty("--mail-light-sidebar", preferences.lightSidebar);
  root.style.setProperty("--mail-light-accent", preferences.lightAccent);
  root.style.setProperty("--mail-light-button", preferences.lightButton);
  root.style.setProperty("--mail-dark-bg", preferences.darkBackground);
  root.style.setProperty("--mail-dark-surface", preferences.darkSurface);
  root.style.setProperty("--mail-dark-sidebar", preferences.darkSidebar);
  root.style.setProperty("--mail-dark-accent", preferences.darkAccent);
  root.style.setProperty("--mail-dark-button", preferences.darkButton);
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-[#5f6368] dark:text-[#bdc1c6]">
      {label}
      <div className="mt-1 flex h-11 items-center gap-2 rounded-md border border-[#d8d2c6] bg-white px-2 dark:border-[#3c4043] dark:bg-[#303134]">
        <input
          type="color"
          className="size-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          title={label}
        />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-[#202124] outline-none dark:text-[#e8eaed]"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  );
}

export function SettingsPanel({
  accounts,
  section = "appearance",
}: SettingsPanelProps) {
  const activeSection = sections.some((item) => item.id === section)
    ? section
    : "appearance";
  const [appName, setAppName] = useState(defaults.appName);
  const [appTitle, setAppTitle] = useState(defaults.appTitle);
  const [appLogoUrl, setAppLogoUrl] = useState(defaults.appLogoUrl);
  const [faviconUrl, setFaviconUrl] = useState(defaults.faviconUrl);
  const [theme, setTheme] = useState(defaults.theme);
  const [lightBackground, setLightBackground] = useState(defaults.lightBackground);
  const [lightSurface, setLightSurface] = useState(defaults.lightSurface);
  const [lightSidebar, setLightSidebar] = useState(defaults.lightSidebar);
  const [lightAccent, setLightAccent] = useState(defaults.lightAccent);
  const [lightButton, setLightButton] = useState(defaults.lightButton);
  const [darkBackground, setDarkBackground] = useState(defaults.darkBackground);
  const [darkSurface, setDarkSurface] = useState(defaults.darkSurface);
  const [darkSidebar, setDarkSidebar] = useState(defaults.darkSidebar);
  const [darkAccent, setDarkAccent] = useState(defaults.darkAccent);
  const [darkButton, setDarkButton] = useState(defaults.darkButton);
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveTone, setSaveTone] = useState<"success" | "warning" | "error">(
    "success",
  );

  useEffect(() => {
    window.requestAnimationFrame(async () => {
      const localPreferences = {
        appName: window.localStorage.getItem("mails-app-name") ?? defaults.appName,
        appTitle:
          window.localStorage.getItem("mails-app-title") ?? defaults.appTitle,
        appLogoUrl:
          window.localStorage.getItem("mails-app-logo-url") ??
          defaults.appLogoUrl,
        faviconUrl:
          window.localStorage.getItem("mails-app-favicon-url") ??
          defaults.faviconUrl,
        theme: window.localStorage.getItem("mails-app-theme") ?? defaults.theme,
        lightBackground:
          window.localStorage.getItem("mails-color-light-background") ??
          defaults.lightBackground,
        lightSurface:
          window.localStorage.getItem("mails-color-light-surface") ??
          defaults.lightSurface,
        lightSidebar:
          window.localStorage.getItem("mails-color-light-sidebar") ??
          defaults.lightSidebar,
        lightAccent:
          window.localStorage.getItem("mails-color-light-accent") ??
          defaults.lightAccent,
        lightButton:
          window.localStorage.getItem("mails-color-light-button") ??
          defaults.lightButton,
        darkBackground:
          window.localStorage.getItem("mails-color-dark-background") ??
          defaults.darkBackground,
        darkSurface:
          window.localStorage.getItem("mails-color-dark-surface") ??
          defaults.darkSurface,
        darkSidebar:
          window.localStorage.getItem("mails-color-dark-sidebar") ??
          defaults.darkSidebar,
        darkAccent:
          window.localStorage.getItem("mails-color-dark-accent") ??
          defaults.darkAccent,
        darkButton:
          window.localStorage.getItem("mails-color-dark-button") ??
          defaults.darkButton,
      };

      const preferences = await fetch("/api/preferences", { cache: "no-store" })
        .then((response) =>
          response.ok
            ? response
                .json()
                .then((remotePreferences: AppPreferenceValues) =>
                  mergePreferences(localPreferences, remotePreferences),
                )
            : localPreferences,
        )
        .catch(() => localPreferences);

      setAppName(preferences.appName);
      setAppTitle(preferences.appTitle);
      setAppLogoUrl(preferences.appLogoUrl);
      setFaviconUrl(preferences.faviconUrl);
      setTheme(preferences.theme);
      setLightBackground(preferences.lightBackground);
      setLightSurface(preferences.lightSurface);
      setLightSidebar(preferences.lightSidebar);
      setLightAccent(preferences.lightAccent);
      setLightButton(preferences.lightButton);
      setDarkBackground(preferences.darkBackground);
      setDarkSurface(preferences.darkSurface);
      setDarkSidebar(preferences.darkSidebar);
      setDarkAccent(preferences.darkAccent);
      setDarkButton(preferences.darkButton);
      applyCustomColors(preferences);
    });
  }, []);

  async function savePreferences() {
    const nextName = appName.trim() || defaults.appName;
    const nextPreferences = {
      appName: nextName,
      appTitle: appTitle.trim() || defaults.appTitle,
      appLogoUrl: appLogoUrl.trim(),
      faviconUrl: faviconUrl.trim(),
      theme,
      lightBackground,
      lightSurface,
      lightSidebar,
      lightAccent,
      lightButton,
      darkBackground,
      darkSurface,
      darkSidebar,
      darkAccent,
      darkButton,
    };

    window.localStorage.setItem("mails-app-name", nextName);
    window.localStorage.setItem("mails-app-title", nextPreferences.appTitle);
    window.localStorage.setItem("mails-app-logo-url", nextPreferences.appLogoUrl);
    window.localStorage.setItem("mails-app-favicon-url", nextPreferences.faviconUrl);
    window.localStorage.setItem("mails-app-theme", theme);
    window.localStorage.setItem(
      "mails-color-light-background",
      nextPreferences.lightBackground,
    );
    window.localStorage.setItem(
      "mails-color-light-surface",
      nextPreferences.lightSurface,
    );
    window.localStorage.setItem(
      "mails-color-light-sidebar",
      nextPreferences.lightSidebar,
    );
    window.localStorage.setItem(
      "mails-color-light-accent",
      nextPreferences.lightAccent,
    );
    window.localStorage.setItem(
      "mails-color-light-button",
      nextPreferences.lightButton,
    );
    window.localStorage.setItem(
      "mails-color-dark-background",
      nextPreferences.darkBackground,
    );
    window.localStorage.setItem(
      "mails-color-dark-surface",
      nextPreferences.darkSurface,
    );
    window.localStorage.setItem(
      "mails-color-dark-sidebar",
      nextPreferences.darkSidebar,
    );
    window.localStorage.setItem(
      "mails-color-dark-accent",
      nextPreferences.darkAccent,
    );
    window.localStorage.setItem(
      "mails-color-dark-button",
      nextPreferences.darkButton,
    );
    document.documentElement.classList.toggle("dark", theme === "dark");
    applyCustomColors(nextPreferences);
    document.title = `${nextName} - ${nextPreferences.appTitle}`;
    window.dispatchEvent(new Event("mails-preferences-updated"));

    const response = await fetch("/api/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nextPreferences),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      setSaveTone(body?.error?.includes("migracion") ? "warning" : "error");
      setSaveMessage(
        body?.error?.includes("migracion")
          ? "Guardado en este navegador. Falta aplicar la migracion de Supabase para guardarlo globalmente."
          : body?.error ?? "No se pudo guardar la marca de la app.",
      );
      return;
    }

    setSaveTone("success");
    setSaveMessage("Marca de la app guardada.");
    setSaved(true);
    window.setTimeout(() => {
      setSaved(false);
      setSaveMessage(null);
    }, 1800);
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
                    <label className="block text-sm font-medium text-[#5f6368]">
                      Titulo principal
                      <input
                        className="mt-1 h-11 w-full rounded-md border border-[#d8d2c6] bg-white px-3 text-[#202124] outline-none"
                        value={appTitle}
                        onChange={(event) => setAppTitle(event.target.value)}
                        placeholder="Centro de correo"
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

              <div className="rounded-2xl border border-[#d8d2c6] p-5 dark:border-[#3c4043]">
                <h3 className="text-lg font-semibold">Colores</h3>
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <div className="space-y-3 rounded-xl bg-[#f8fafd] p-4 dark:bg-[#26272a]">
                    <p className="text-sm font-semibold">Modo claro</p>
                    <ColorControl
                      label="Fondo"
                      value={lightBackground}
                      onChange={setLightBackground}
                    />
                    <ColorControl
                      label="Superficie"
                      value={lightSurface}
                      onChange={setLightSurface}
                    />
                    <ColorControl
                      label="Panel lateral"
                      value={lightSidebar}
                      onChange={setLightSidebar}
                    />
                    <ColorControl
                      label="Acento y seleccion"
                      value={lightAccent}
                      onChange={setLightAccent}
                    />
                    <ColorControl
                      label="Boton principal"
                      value={lightButton}
                      onChange={setLightButton}
                    />
                  </div>

                  <div className="space-y-3 rounded-xl bg-[#202124] p-4 text-[#e8eaed]">
                    <p className="text-sm font-semibold">Modo oscuro</p>
                    <ColorControl
                      label="Fondo"
                      value={darkBackground}
                      onChange={setDarkBackground}
                    />
                    <ColorControl
                      label="Superficie"
                      value={darkSurface}
                      onChange={setDarkSurface}
                    />
                    <ColorControl
                      label="Panel lateral"
                      value={darkSidebar}
                      onChange={setDarkSidebar}
                    />
                    <ColorControl
                      label="Acento y seleccion"
                      value={darkAccent}
                      onChange={setDarkAccent}
                    />
                    <ColorControl
                      label="Boton principal"
                      value={darkButton}
                      onChange={setDarkButton}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="flex h-11 items-center gap-2 rounded-full bg-[#1a73e8] px-5 text-sm font-semibold text-white"
                onClick={() => void savePreferences()}
              >
                <Save size={17} />
                {saved ? "Guardado" : "Guardar cambios"}
              </button>
              {saveMessage ? (
                <p
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    saveTone === "success"
                      ? "bg-[#e6f4ea] text-[#137333]"
                      : saveTone === "warning"
                        ? "bg-[#fef7e0] text-[#8b5e00]"
                        : "bg-[#fce8e6] text-[#a50e0e]"
                  }`}
                >
                  {saveMessage}
                </p>
              ) : null}
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

          {activeSection === "help" ? (
            <div className="max-w-4xl space-y-5">
              <div className="rounded-2xl border border-[#d8d2c6] p-5">
                <div className="flex items-start gap-3">
                  <MailCheck className="mt-1 text-[#1a73e8]" size={22} />
                  <div>
                    <h3 className="text-lg font-semibold">
                      Conexion de cuentas Gmail
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#5f6368]">
                      Cada cuenta Gmail se conecta con OAuth de Google. La app
                      guarda los tokens cifrados en Supabase y usa Gmail API
                      para leer mensajes, etiquetas y ejecutar acciones como
                      archivar, destacar, marcar como leido o mover a etiquetas.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-[#f8fafd] p-4">
                    <p className="text-sm font-semibold">Agregar una cuenta</p>
                    <p className="mt-2 text-sm text-[#5f6368]">
                      Usa Conectar Gmail, elegi la cuenta y acepta todos los
                      permisos solicitados.
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f8fafd] p-4">
                    <p className="text-sm font-semibold">Si falta permiso</p>
                    <p className="mt-2 text-sm text-[#5f6368]">
                      Reconecta esa cuenta. Google entrega un token nuevo con
                      los permisos actualizados.
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f8fafd] p-4">
                    <p className="text-sm font-semibold">Modo prueba Google</p>
                    <p className="mt-2 text-sm text-[#5f6368]">
                      Mientras la app no este verificada, agrega cada email como
                      test user en Google Cloud.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#d8d2c6] p-5">
                <div className="flex items-start gap-3">
                  <ServerCog className="mt-1 text-[#188038]" size={22} />
                  <div>
                    <h3 className="text-lg font-semibold">
                      Como seguir con cuentas IMAP
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#5f6368]">
                      El siguiente paso es agregar un conector IMAP para cuentas
                      que no sean Gmail. Para eso la app necesitara guardar por
                      cuenta: servidor IMAP, puerto, seguridad SSL/TLS, usuario,
                      contrasena o app password, nombre visible y logo.
                    </p>
                  </div>
                </div>
                <ol className="mt-4 space-y-3 text-sm text-[#3c4043]">
                  <li className="rounded-xl bg-[#f8fafd] p-4">
                    <strong>1. Configuracion de cuenta:</strong> crear un
                    formulario IMAP con host, puerto, usuario y clave segura.
                  </li>
                  <li className="rounded-xl bg-[#f8fafd] p-4">
                    <strong>2. Prueba de conexion:</strong> validar credenciales
                    antes de guardarlas cifradas en Supabase.
                  </li>
                  <li className="rounded-xl bg-[#f8fafd] p-4">
                    <strong>3. Sincronizacion:</strong> leer carpetas, mensajes
                    recientes, no leidos y etiquetas/carpetas propias de cada
                    proveedor.
                  </li>
                  <li className="rounded-xl bg-[#f8fafd] p-4">
                    <strong>4. Acciones:</strong> mover, archivar, marcar leido
                    y responder segun las capacidades del servidor IMAP/SMTP.
                  </li>
                </ol>
              </div>

              <div className="rounded-2xl border border-[#d8d2c6] p-5">
                <h3 className="text-lg font-semibold">Notas utiles</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5f6368]">
                  <li>
                    Para mas de 10 cuentas en el navegador, Google puede pedir
                    cerrar sesion en otras cuentas; eso es una regla del login
                    de Google, no de esta app.
                  </li>
                  <li>
                    Los logos, nombres visibles y orden de tarjetas se pueden
                    personalizar desde Configuracion &gt; Cuentas.
                  </li>
                  <li>
                    Para que nombre, logo y orden se guarden en Supabase, la
                    tabla necesita las columnas display_name, logo_url y
                    sort_order.
                  </li>
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
