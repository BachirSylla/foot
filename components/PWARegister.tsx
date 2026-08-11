"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* silencieux : le SW est un bonus, l'app fonctionne sans */
      });
    }
  }, []);
  return null;
}
