"use client";

import { useAuth, PLACEHOLDER_NAME } from "@/lib/auth";
import { WelcomeScreen } from "./WelcomeScreen";
import { NameScreen } from "./NameScreen";
import { Splash } from "./ui";

/**
 * Garde d'authentification globale : elle enveloppe TOUTES les routes (accueil
 * et page d'un match) depuis le layout. Elle ne dépend d'aucune donnée métier —
 * scanner le QR d'un match amène donc sur /m/{id}, et l'URL est conservée
 * pendant l'inscription : après « Rejoindre » + nom, le joueur atterrit
 * directement sur le bon match.
 *
 * Le mode démo (sans clés Supabase) n'a pas de garde du tout.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  if (!auth.configured) return <>{children}</>;
  if (!auth.ready) return <Splash />;
  if (!auth.session) return <WelcomeScreen />;

  // Joueur arrivé par le lien / QR : il choisit son nom une seule fois.
  const nameMissing = !auth.profile?.full_name || auth.profile.full_name === PLACEHOLDER_NAME;
  if (auth.isAnonymous && nameMissing) return <NameScreen />;

  return <>{children}</>;
}
