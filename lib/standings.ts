// Règles du classement interne, partagées par le mode live et le mode démo.
//
// En live, l'agrégation est faite par la vue SQL `player_standings`
// (supabase/migrations/002_standings.sql) ; ici on garde le barème, le tri et
// l'équivalent en mémoire pour la démo. Les deux doivent rester d'accord :
// si le barème change, changer AUSSI la vue.

import type { ScorerRow, StandingRow } from "./types";

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

// --- Meilleurs buteurs ------------------------------------------------------
//
// Classement SÉPARÉ du classement principal : les buts ne donnent aucun point.
// En live, l'agrégation est faite par la vue SQL `top_scorers`
// (supabase/migrations/003_scorers.sql) ; ici on garde le tri et l'équivalent
// en mémoire pour la démo. Les deux doivent rester d'accord.

/** Les buts d'un joueur sur UN match (une ligne de `match_goals`). */
export interface ScorerEntry {
  userId: string;
  name: string;
  goals: number;
  matchId: string;
}

/**
 * Départage : buts, puis MOINS de matchs (celui qui en met autant en moins de
 * matchs passe devant), puis le nom pour rester déterministe.
 */
export function sortScorers(rows: ScorerRow[]): ScorerRow[] {
  return [...rows].sort(
    (a, b) => b.goals - a.goals || a.matches - b.matches || a.name.localeCompare(b.name)
  );
}

/**
 * Agrège les buts par joueur. `matches` compte les matchs DISTINCTS où il a
 * marqué (miroir du `count(distinct match_id)` de la vue) ; les lignes à 0 but
 * sont ignorées, elles ne font pas de lui un buteur.
 */
export function aggregateTopScorers(entries: ScorerEntry[]): ScorerRow[] {
  const byPlayer = new Map<string, ScorerRow & { matchIds: Set<string> }>();

  for (const e of entries) {
    if (e.goals <= 0) continue;
    let row = byPlayer.get(e.userId);
    if (!row) {
      row = { userId: e.userId, name: e.name, goals: 0, matches: 0, matchIds: new Set() };
      byPlayer.set(e.userId, row);
    }
    row.goals += e.goals;
    row.matchIds.add(e.matchId);
  }

  return sortScorers(
    [...byPlayer.values()].map(({ matchIds, ...row }) => ({ ...row, matches: matchIds.size }))
  );
}
