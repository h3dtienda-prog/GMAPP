"use client";

import { useEffect } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

const storageKey = "mails-sidebar-width";
const minWidth = 248;
const maxWidth = 440;

export function SidebarResizer() {
  useEffect(() => {
    const storedWidth = window.localStorage.getItem(storageKey);

    if (storedWidth) {
      document.documentElement.style.setProperty(
        "--sidebar-width",
        `${Number(storedWidth)}px`,
      );
    }
  }, []);

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const currentWidth =
      Number(
        getComputedStyle(document.documentElement)
          .getPropertyValue("--sidebar-width")
          .replace("px", ""),
      ) || 280;

    function handleMove(moveEvent: PointerEvent) {
      const nextWidth = Math.min(
        maxWidth,
        Math.max(minWidth, currentWidth + moveEvent.clientX - startX),
      );

      document.documentElement.style.setProperty(
        "--sidebar-width",
        `${nextWidth}px`,
      );
      window.localStorage.setItem(storageKey, String(nextWidth));
    }

    function stopResize() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopResize);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stopResize);
  }

  return (
    <button
      type="button"
      className="absolute bottom-0 right-[-5px] top-0 hidden w-2 cursor-col-resize rounded-full hover:bg-[#d8d2c6] lg:block"
      onPointerDown={startResize}
      aria-label="Ajustar ancho de cuentas"
    />
  );
}
