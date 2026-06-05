"use client";

import { useEffect, useRef } from "react";

export function EmailBodyFrame({ html, title }: { html: string; title: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const srcDoc = `<!doctype html>
<html>
<head>
  <meta name="color-scheme" content="light">
  <base target="_blank">
  <style>
    html, body { margin: 0; padding: 0; background: #fff; color: #202124; }
    body { overflow-wrap: anywhere; }
    img { max-width: 100%; height: auto; }
    table { max-width: 100%; }
  </style>
</head>
<body>${html}</body>
</html>`;

  useEffect(() => {
    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    const resize = () => {
      const document = frame.contentDocument;
      const height = Math.max(
        document?.documentElement.scrollHeight ?? 0,
        document?.body.scrollHeight ?? 0,
      );

      if (height) {
        frame.style.height = `${Math.max(height + 16, window.innerHeight - 260)}px`;
      }
    };

    let observer: ResizeObserver | undefined;
    const handleLoad = () => {
      resize();

      const document = frame.contentDocument;

      if (!document) {
        return;
      }

      observer = new ResizeObserver(resize);
      observer.observe(document.documentElement);
      observer.observe(document.body);
      document.querySelectorAll("img").forEach((image) => {
        image.addEventListener("load", resize);
      });
    };

    frame.addEventListener("load", handleLoad);
    window.addEventListener("resize", resize);
    const timer = window.setTimeout(handleLoad, 300);

    return () => {
      observer?.disconnect();
      frame.removeEventListener("load", handleLoad);
      window.removeEventListener("resize", resize);
      window.clearTimeout(timer);
    };
  }, [html]);

  return (
    <iframe
      ref={frameRef}
      className="min-h-[calc(100vh-260px)] w-full border-0 bg-white"
      referrerPolicy="no-referrer"
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
      srcDoc={srcDoc}
      title={title}
    />
  );
}
