"use client";

import { useEffect, useRef } from "react";

export function MarkMessageRead({
  account,
  gmailId,
}: {
  account: string;
  gmailId: string;
}) {
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;

    requested.current = true;
    const formData = new FormData();
    formData.set("account", account);
    formData.set("gmailId", gmailId);
    formData.set("action", "read");
    formData.set("redirectTo", "/");

    void fetch("/api/messages/action", {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" },
    });
  }, [account, gmailId]);

  return null;
}
