"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

/**
 * Demandé une seule fois par appareil : la session Supabase étant persistée,
 * le joueur retrouve son nom (et ses réponses) aux visites suivantes.
 */
export function NameScreen() {
  const { setDisplayName } = useAuth();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    setError(null);
    setBusy(true);
    try {
      await setDisplayName(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer ton nom.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-lime text-ink-800 shadow-glow">
          <span className="text-2xl">👋</span>
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">Comment tu t'appelles ?</h1>
        <p className="mt-1 text-sm text-muted">Une seule fois — pour que l'équipe te reconnaisse.</p>
      </div>

      <form onSubmit={submit} className="card space-y-3 p-5">
        <label className="block">
          <span className="label mb-1.5 block">Ton prénom / nom</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bachir Sylla"
            autoComplete="name"
            autoFocus
            required
          />
        </label>

        {error && <p className="text-[13px] text-rose">{error}</p>}

        <button type="submit" disabled={busy || !name.trim()} className="btn-primary w-full py-3">
          {busy ? "…" : "C'est parti"}
        </button>
      </form>
    </div>
  );
}
