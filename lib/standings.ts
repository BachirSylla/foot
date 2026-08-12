// Règles du classement interne, partagées par le mode live et le mode démo.
//
// En live, l'agrégation est faite par la vue SQL `player_standings`
// (supabase/migrations/002_standings.sql) ; ici on garde le barème, le tri et
// l'équivalent en mémoire pour la démo. Les deux doivent rester d'accord :
// si le barème change, changer AUSSI la vue.

import type { StandingRow } from "./types";

/** Barème. Modifiable ici (et dans la vue SQL). */
export const POINTS = { win: 3, draw: 1, loss: 0 } as const;

/** Une apparition d'un joueur dans une équipe d'un match terminé. */
export interface StandingEntry {
  userId: string;
  /** Buts de son équipe / de l'équipe adverse. */
  goalsFor: number;
  goalsAgainst: number;
}

/**
 * Départage : points, puis victoires, puis MOINS de matchs joués (celui qui fait
 * autant en moins de matchs passe devant), puis le nom pour rester déterministe.
 */
export function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      a.played - b.played ||
      a.name.localeCompare(b.name)
  );
}

/**
 * Agrège les apparitions en lignes de classement. `names` fournit le nom
 * affiché ; un joueur inconnu du roster retombe sur « Joueur ».
 */
export function buildStandings(
  entries: StandingEntry[],
  names: Record<string, string>
): StandingRow[] {
  const byPlayer = new Map<string, StandingRow>();

  for (const e of entries) {
    let row = byPlayer.get(e.userId);
    if (!row) {
      row = {
        userId: e.userId,
        name: names[e.userId] ?? "Joueur",
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
      };
      byPlayer.set(e.userId, row);
    }
    row.played++;
    if (e.goalsFor > e.goalsAgainst) {
      row.wins++;
      row.points += POINTS.win;
    } else if (e.goalsFor === e.goalsAgainst) {
      row.draws++;
      row.points += POINTS.draw;
    } else {
      row.losses++;
      row.points += POINTS.loss;
    }
  }

  return sortStandings([...byPlayer.values()]);
}
