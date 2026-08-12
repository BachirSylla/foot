"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Header } from "./Header";
import { PlayerView } from "./PlayerView";
import { AdminView } from "./AdminView";
import { RevealOverlay } from "./RevealOverlay";
import { Splash } from "./ui";

/** Page d'un match : la réponse du joueur ou l'écran d'organisation. */
export function MatchDetail() {
  const store = useStore();
  const { role, setRole, isAdmin, match, ready, mode } = store;

  if (!ready) return <Splash />;

  const toggle = isAdmin ? (
    <div className="flex rounded-xl border border-line bg-ink-700/60 p-1 text-xs font-semibold">
      <button
        onClick={() => setRole("player")}
        className={`rounded-lg px-3 py-1.5 transition ${
          role === "player" ? "bg-white/10 text-white" : "text-muted hover:text-slate-200"
        }`}
      >
        {mode === "demo" ? "Joueur" : "Ma réponse"}
      </button>
      <button
        onClick={() => setRole("admin")}
        className={`rounded-lg px-3 py-1.5 transition ${
          role === "admin" ? "bg-white/10 text-white" : "text-muted hover:text-slate-200"
        }`}
      >
        {mode === "demo" ? "Admin" : "Organiser"}
      </button>
    </div>
  ) : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-24 pt-5 sm:px-6">
      <Header right={match ? toggle : null} />

      <Link
        href="/"
        className="mt-5 inline-flex w-fit items-center gap-1.5 text-[13px] text-muted transition hover:text-slate-200"
      >
        ← Tous les matchs
      </Link>

      <main className="mt-3 flex-1">
        {!match ? <MissingMatch /> : role === "admin" && isAdmin ? <AdminView /> : <PlayerView />}
      </main>

      <RevealOverlay />
    </div>
  );
}

function MissingMatch() {
  return (
    <div className="card p-6 text-center">
      <p className="text-3xl">🔍</p>
      <h2 className="mt-2 font-display text-lg font-bold">Ce match n'existe plus</h2>
      <p className="mt-1 text-sm text-muted">
        Il a peut-être été supprimé. Retourne à la liste pour voir les matchs en cours.
      </p>
      <Link href="/" className="btn-primary mt-4 inline-flex px-5 py-2.5">
        Voir les matchs
      </Link>
    </div>
  );
}
