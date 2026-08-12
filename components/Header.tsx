"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { CURRENT_USER_ID, DEMO_PLAYERS } from "@/lib/mock";

/**
 * En-tête commun à l'accueil et à la page d'un match. Le logo ramène toujours
 * à la liste des matchs. `right` reçoit le sélecteur « Ma réponse / Organiser »
 * sur la page d'un match (il n'a pas de sens sur l'accueil).
 */
export function Header({ right }: { right?: ReactNode }) {
  const auth = useAuth();

  const name = auth.configured
    ? auth.profile?.full_name ?? auth.session?.user.email ?? null
    : DEMO_PLAYERS.find((p) => p.id === CURRENT_USER_ID)?.name ?? null;

  return (
    <header className="flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-lime text-ink-800 shadow-glow">
          <BallIcon />
        </div>
        <div className="leading-tight">
          <div className="font-display text-lg font-bold tracking-tight">TeamMix</div>
          <div className="text-[11px] text-muted">
            {name ? `Salut ${name.split(" ")[0]}` : "Équipes équilibrées"}
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <Link
          href="/classement"
          title="Classement"
          // Sur mobile le libellé est masqué : sans ça, le lien ne serait
          // annoncé que « 🏆 » par les lecteurs d'écran.
          aria-label="Classement"
          className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-lime/30 hover:text-lime"
        >
          🏆 <span className="hidden sm:inline">Classement</span>
        </Link>
        {right}
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
