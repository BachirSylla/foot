// Vocabulaire visuel partagé par l'accueil (MatchCard) et la page d'un match
// (MatchHero) : un seul endroit pour les libellés de statut et le format de date.

import type { MatchStatus } from "./types";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function formatMatchDate(iso: string): {
  day: string;
  dayNum: number;
  month: string;
  time: string;
} {
  const d = new Date(iso);
  return {
    day: DAYS[d.getDay()],
    dayNum: d.getDate(),
    month: MONTHS[d.getMonth()],
    time: `${d.getHours()}h${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

export const STATUS_LABEL: Record<MatchStatus, string> = {
  open: "Inscriptions ouvertes",
  generated: "Composition prête",
  published: "Équipes publiées",
  finished: "Terminé",
  cancelled: "Annulé",
};

/** Couleur du texte (point de statut du MatchHero). */
export const STATUS_TONE: Record<MatchStatus, string> = {
  open: "text-slate-300",
  generated: "text-cyan",
  published: "text-lime",
  finished: "text-muted",
  cancelled: "text-rose",
};

/** Habillage complet du badge (carte de l'accueil). */
export const STATUS_CHIP: Record<MatchStatus, string> = {
  open: "border-slate-300/25 bg-white/[0.03] text-slate-300",
  generated: "border-cyan/30 bg-cyan/5 text-cyan",
  published: "border-lime/30 bg-lime/5 text-lime",
  finished: "border-line bg-white/[0.02] text-muted",
  cancelled: "border-rose/30 bg-rose/5 text-rose",
};

/** « À venir » = le match vit encore. Les autres vont dans la section repliable. */
export function isUpcoming(status: MatchStatus): boolean {
  return status === "open" || status === "generated" || status === "published";
}
