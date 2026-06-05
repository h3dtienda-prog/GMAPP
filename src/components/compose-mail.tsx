"use client";

import { useState } from "react";
import { Pencil, Send, X } from "lucide-react";

export function ComposeMail({ account }: { account: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function send(formData: FormData) {
    setPending(true);
    setError("");
    const response = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account,
        to: formData.get("to"),
        subject: formData.get("subject"),
        body: formData.get("body"),
      }),
    });
    const result = (await response.json()) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(result.error ?? "No se pudo enviar.");
      return;
    }

    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-2 mt-4 flex h-14 w-[calc(100%-1rem)] items-center justify-center gap-3 rounded-2xl bg-white px-4 text-sm font-semibold text-[#202124] shadow-sm hover:shadow-md dark:bg-[#303134] dark:text-[#e8eaed]"
      >
        <Pencil size={19} />
        Redactar
      </button>
      {open ? (
        <div className="fixed bottom-5 right-5 z-50 w-[min(520px,calc(100vw-2rem))] overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-[#202124]">
          <div className="flex h-11 items-center justify-between bg-[#40464f] px-4 text-sm font-semibold text-white">
            <span>Mensaje nuevo desde {account}</span>
            <button type="button" onClick={() => setOpen(false)} title="Cerrar">
              <X size={18} />
            </button>
          </div>
          <form action={(formData) => void send(formData)} className="p-4">
            <input
              name="to"
              type="email"
              required
              placeholder="Para"
              className="h-10 w-full border-b border-[#dadce0] bg-transparent outline-none"
            />
            <input
              name="subject"
              required
              placeholder="Asunto"
              className="h-10 w-full border-b border-[#dadce0] bg-transparent outline-none"
            />
            <textarea
              name="body"
              placeholder="Escribe tu mensaje"
              className="min-h-64 w-full resize-y bg-transparent py-3 outline-none"
            />
            {error ? <p className="mb-3 text-sm text-[#b3261e]">{error}</p> : null}
            <button
              disabled={pending}
              className="flex h-10 items-center gap-2 rounded-full bg-[#0b57d0] px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Send size={17} />
              {pending ? "Enviando..." : "Enviar"}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
