"use client";

import { useStore } from "@/lib/store";
import { useAuth, PLACEHOLDER_NAME } from "@/lib/auth";
import { PlayerView } from "./PlayerView";
import { AdminView } from "./AdminView";
import { RevealOverlay } from "./RevealOverlay";
import { WelcomeScreen } from "./WelcomeScreen";
import { NameScreen } from "./NameScreen";

export function AppShell() {
  const auth = useAuth();
  const store = useStore();

  // Mode live : garde d'authentification. (Le mode démo n'en a pas.)
  if (auth.configured) {
    if (!auth.ready || !store.ready) return <Splash />;
    if (!auth.session) return <WelcomeScreen />;
    // Joueur arrivé par le lien / QR : il choisit son nom une seule fois.
    const nameMissing = !auth.profile?.full_name || auth.profile.full_name === PLACEHOLDER_NAME;
    if (auth.isAnonymous && nameMissing) return <NameScreen />;
  }

  const { role, setRole, isAdmin } = store;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-24 pt-5 sm:px-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-lime text-base-800 shadow-glow">
            <BallIcon />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold tracking-tight">TeamMix</div>
            <div className="text-[11px] text-muted">
              {store.currentUser ? `Salut ${store.currentUser.name.split(" ")[0]}` : "Équipes équilibrées"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="flex rounded-xl border border-line bg-base-700/60 p-1 text-xs font-semibold">
              <button
                onClick={() => setRole("player")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  role === "player" ? "bg-white/10 text-white" : "text-muted hover:text-slate-200"
                }`}
              >
                {store.mode === "demo" ? "Joueur" : "Ma réponse"}
              </button>
              <button
                onClick={() => setRole("admin")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  role === "admin" ? "bg-white/10 text-white" : "text-muted hover:text-slate-200"
                }`}
              >
                {store.mode === "demo" ? "Admin" : "Organiser"}
              </button>
            </div>
          )}
          {auth.configured && auth.session && (
            <button
              onClick={() => auth.signOut()}
              title="Se déconnecter"
              className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:text-rose"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <main className="mt-6 flex-1">{role === "admin" && isAdmin ? <AdminView /> : <PlayerView />}</main>

      <RevealOverlay />
    </div>
  );
}

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative grid h-16 w-16 place-items-center">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-lime/20 border-t-lime" />
          <span className="text-2xl">⚽</span>
        </div>
        <span className="text-sm text-muted">Chargement…</span>
      </div>
    </div>
  );
}

function BallIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7l3.5 2.5-1.3 4.1h-4.4L8.5 9.5 12 7z" fill="currentColor" stroke="none" />
    </svg>
  );
}
