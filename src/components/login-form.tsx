"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type LoginPreferences = {
  loginTitle?: string;
  loginSubtitle?: string;
  loginLogoUrl?: string;
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [preferences, setPreferences] = useState<LoginPreferences>({});

  useEffect(() => {
    void fetch("/api/preferences", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : {}))
      .then(setPreferences)
      .catch(() => undefined);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: formData.get("password") }),
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "No se pudo iniciar sesión.");
      setPending(false);
      return;
    }

    router.replace(searchParams.get("next") || "/");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8fc] p-5 text-[#202124]">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-[#dadce0] bg-white p-8 shadow-sm"
      >
        <div className="flex items-center gap-4">
          {preferences.loginLogoUrl ? (
            <img src={preferences.loginLogoUrl} alt="" className="size-14 rounded-xl object-cover" />
          ) : (
            <div className="grid size-14 place-items-center rounded-xl bg-[#0b57d0] text-white">
              <LockKeyhole size={25} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold">
              {preferences.loginTitle || "Acceso privado"}
            </h1>
            <p className="mt-1 text-sm text-[#5f6368]">
              {preferences.loginSubtitle || "Ingresa para abrir tu centro de correo."}
            </p>
          </div>
        </div>
        <label className="mt-8 block text-sm font-medium">
          Contraseña
          <input
            name="password"
            type="password"
            required
            autoFocus
            className="mt-2 h-12 w-full rounded-lg border border-[#dadce0] px-4 outline-none focus:border-[#0b57d0]"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-[#b3261e]">{error}</p> : null}
        <button
          disabled={pending}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0b57d0] font-semibold text-white disabled:opacity-60"
        >
          <LogIn size={18} />
          {pending ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
