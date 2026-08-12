"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { LoginScreen } from "./LoginScreen";

/**
 * Écran d'accueil du mode live, avant toute session.
 * Le joueur arrive par le lien / QR partagé sur WhatsApp : il rejoint sans mot
 * de passe (auth anonyme). L'organisateur, lui, passe par le lien discret en bas.
 */
export function WelcomeScreen() {
  const { joinAsPlayer } = useAuth();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (showAdminLogin) {
    return (
      <div>
        <LoginScreen />
        <div className="pb-10 text-center">
          <button
            onClick={() => setShowAdminLogin(false)}
            className="text-sm text-muted hover:text-slate-200"
          >
            ← Je suis juste un joueur
          </button>
        </div>
      </div>
    );
  }

  async function join() {
    setError(null);
    setBusy(true);
    const res = await joinAsPlayer();
    setBusy(false);
    if (res.error) setError(res.error);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-lime text-ink-800 shadow-glow">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7l3.5 2.5-1.3 4.1h-4.4L8.5 9.5 12 7z" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">TeamMix</h1>
        <p className="mt-1 text-sm text-muted">Réponds au match du vendredi</p>
      </div>

      <div className="card space-y-3 p-5">
        <p className="text-sm text-muted">
          Pas de compte, pas de mot de passe : tu entres ton nom une fois, puis tu dis si tu joues.
        </p>
        <button onClick={join} disabled={busy} className="btn-primary w-full py-3 text-base">
          {busy ? "…" : "⚽ Rejoindre le match"}
        </button>
        {error && <p className="text-[13px] text-rose">{error}</p>}
      </div>

      <button
        onClick={() => setShowAdminLogin(true)}
        className="mt-6 text-center text-[13px] text-muted hover:text-slate-200"
      >
        Tu es l'organisateur ? Se connecter
      </button>
    </div>
  );
}
