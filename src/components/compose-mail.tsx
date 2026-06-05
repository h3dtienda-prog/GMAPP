"use client";

import { FormEvent, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Link,
  Paperclip,
  Pencil,
  Send,
  Trash2,
  Underline,
  X,
} from "lucide-react";

type Attachment = {
  content: string;
  name: string;
  type: string;
};

function fileToAttachment(file: File) {
  return new Promise<Attachment>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}.`));
    reader.onload = () =>
      resolve({
        content: String(reader.result).split(",")[1] ?? "",
        name: file.name,
        type: file.type,
      });
    reader.readAsDataURL(file);
  });
}

export function ComposeMail({ account }: { account: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [showCopies, setShowCopies] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState("");

  function format(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }

  async function addAttachments(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    const totalSize = selected.reduce((total, file) => total + file.size, 0);

    if (totalSize > 3_000_000) {
      setError("Los adjuntos deben pesar menos de 3 MB en total.");
      return;
    }

    setError("");
    setAttachments(await Promise.all(selected.map(fileToAttachment)));
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    const response = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account,
        attachments,
        bcc: formData.get("bcc"),
        body: editorRef.current?.innerHTML ?? "",
        cc: formData.get("cc"),
        subject: formData.get("subject"),
        to: formData.get("to"),
      }),
    });
    const result = (await response.json()) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(result.error ?? "No se pudo enviar.");
      return;
    }

    setAttachments([]);
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
        <div className="fixed bottom-4 right-4 z-50 flex h-[min(620px,calc(100vh-2rem))] w-[min(560px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-[#dadce0] bg-white text-[#202124] shadow-2xl dark:border-[#3c4043] dark:bg-[#202124] dark:text-[#e8eaed]">
          <div className="flex h-11 shrink-0 items-center justify-between bg-[#40464f] px-4 text-sm font-semibold text-white dark:bg-[#303134]">
            <span>Mensaje nuevo desde {account}</span>
            <button type="button" onClick={() => setOpen(false)} title="Cerrar">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={send} className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#202124]">
            <div className="flex items-center border-b border-[#dadce0] px-4 dark:border-[#3c4043]">
              <input
                name="to"
                type="text"
                required
                placeholder="Para"
                className="h-11 min-w-0 flex-1 bg-white outline-none dark:bg-[#202124]"
              />
              <button
                type="button"
                onClick={() => setShowCopies((value) => !value)}
                className="text-xs text-[#5f6368] dark:text-[#bdc1c6]"
              >
                Cc Cco
              </button>
            </div>
            {showCopies ? (
              <div className="grid grid-cols-2 border-b border-[#dadce0] dark:border-[#3c4043]">
                <input name="cc" placeholder="Cc" className="h-10 bg-white px-4 outline-none dark:bg-[#202124]" />
                <input name="bcc" placeholder="Cco" className="h-10 bg-white px-4 outline-none dark:bg-[#202124]" />
              </div>
            ) : null}
            <input
              name="subject"
              required
              placeholder="Asunto"
              className="h-11 shrink-0 border-b border-[#dadce0] bg-white px-4 outline-none dark:border-[#3c4043] dark:bg-[#202124]"
            />
            <div
              ref={editorRef}
              contentEditable
              data-placeholder="Escribe tu mensaje"
              className="min-h-0 flex-1 overflow-auto bg-white px-4 py-3 outline-none empty:before:text-[#5f6368] empty:before:content-[attr(data-placeholder)] dark:bg-[#202124]"
            />
            {attachments.length > 0 ? (
              <div className="flex flex-wrap gap-2 border-t border-[#dadce0] px-4 py-2 text-xs dark:border-[#3c4043]">
                {attachments.map((attachment, index) => (
                  <span key={`${attachment.name}-${index}`} className="rounded-full bg-[#eaf1fb] px-3 py-1 dark:bg-[#303134]">
                    {attachment.name}
                  </span>
                ))}
              </div>
            ) : null}
            {error ? <p className="px-4 py-2 text-sm text-[#b3261e]">{error}</p> : null}
            <div className="flex shrink-0 items-center gap-1 border-t border-[#dadce0] bg-white px-3 py-2 dark:border-[#3c4043] dark:bg-[#202124]">
              <button disabled={pending} className="mr-2 flex h-9 items-center gap-2 rounded-full bg-[#0b57d0] px-5 text-sm font-semibold text-white disabled:opacity-60">
                <Send size={16} />
                {pending ? "Enviando..." : "Enviar"}
              </button>
              {[
                ["bold", "Negrita", Bold],
                ["italic", "Cursiva", Italic],
                ["underline", "Subrayado", Underline],
              ].map(([command, title, Icon]) => (
                <button key={String(command)} type="button" onClick={() => format(String(command))} title={String(title)} className="grid size-8 place-items-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#303134]">
                  <Icon size={17} />
                </button>
              ))}
              <button type="button" onClick={() => format("createLink", window.prompt("URL del enlace") ?? undefined)} title="Insertar enlace" className="grid size-8 place-items-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#303134]">
                <Link size={17} />
              </button>
              <label title="Adjuntar archivos" className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#303134]">
                <Paperclip size={17} />
                <input type="file" multiple className="hidden" onChange={(event) => void addAttachments(event.target.files)} />
              </label>
              <button type="button" onClick={() => setAttachments([])} title="Quitar adjuntos" className="ml-auto grid size-8 place-items-center rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#303134]">
                <Trash2 size={17} />
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
