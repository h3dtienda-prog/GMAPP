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
      const height = frame.contentDocument?.documentElement.scrollHeight;

      if (height) {
        frame.style.height = `${Math.max(height + 8, 180)}px`;
      }
    };

    frame.addEventListener("load", resize);
    const timer = window.setTimeout(resize, 500);

    return () => {
      frame.removeEventListener("load", resize);
      window.clearTimeout(timer);
    };
  }, [html]);

  return (
    <iframe
      ref={frameRef}
      className="min-h-48 w-full border-0 bg-white"
      referrerPolicy="no-referrer"
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      srcDoc={srcDoc}
      title={title}
    />
  );
}
