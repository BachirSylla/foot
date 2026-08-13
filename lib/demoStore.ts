"use client";

// Base de données du mode démo (sans `.env.local`) : 100% en mémoire, mais
// multi-matchs comme le mode live. Un store module-level exposé via
// `useSyncExternalStore` : l'accueil (`MatchList`) et la page d'un match
// (`StoreProvider`) lisent la même source et se re-rendent ensemble.

import { useSyncExternalStore } from "react";
import type {
  GenerationResult,
  Match,
  MatchScore,
  MatchStatus,
  Participation,
  PlayerGoals,
  ScorerRow,
  StandingRow,
} from "./types";
import { DEMO_MATCH, DEMO_PLAYERS, INITIAL_PARTICIPATIONS } from "./mock";
import {
  aggregateTopScorers,
  buildStandings,
  type ScorerEntry,
  type StandingEntry,
} from "./standings";

export interface DemoState {
  matches: Match[];
  participationsByMatch: Record<string, Record<string, Participation>>;
  /** La COMPOSITION (équipes tirées) par match. */
  resultByMatch: Record<string, GenerationResult | null>;
  /** Le SCORE final par match. Distinct de la compo, comme dans le store. */
  scoreByMatch: Record<string, MatchScore>;
  /** Les buteurs par match : `{ [matchId]: { [userId]: buts } }`. */
  goalsByMatch: Record<string, Record<string, number>>;
}

export interface MatchInput {
  title: string;
  startsAt: string;
  location: string;
  maxPlayers: number;
}

function initialState(): DemoState {
  const parts: Record<string, Participation> = {};
  for (const p of INITIAL_PARTICIPATIONS) parts[p.playerId] = p;
  return {
    matches: [DEMO_MATCH],
    participationsByMatch: { [DEMO_MATCH.id]: parts },
    resultByMatch: {},
    scoreByMatch: {},
    goalsByMatch: {},
  };
}

let state: DemoState = initialState();
let nextId = 2;
const listeners = new Set<() => void>();

function commit(next: DemoState) {
  state = next;
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snapshot stable : la référence ne change que sur une vraie mutation. */
function getSnapshot(): DemoState {
  return state;
}

/** S'abonne au store démo. Le même snapshot est servi au rendu serveur. */
export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// --- Lecture ---------------------------------------------------------------

/** Matchs du plus récent au plus ancien (même ordre que `repo.listMatches`). */
export function listMatches(): Match[] {
  return [...state.matches].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

export function getMatch(id: string): Match | null {
  return state.matches.find((m) => m.id === id) ?? null;
}

export function getParticipations(matchId: string): Record<string, Participation> {
  return state.participationsByMatch[matchId] ?? {};
}

export function getResult(matchId: string): GenerationResult | null {
  return state.resultByMatch[matchId] ?? null;
}

export function getScore(matchId: string): MatchScore | null {
  return state.scoreByMatch[matchId] ?? null;
}

const NO_GOALS: Record<string, number> = {};

export function getGoals(matchId: string): Record<string, number> {
  return state.goalsByMatch[matchId] ?? NO_GOALS;
}

/**
 * Équivalent en mémoire de la vue SQL `player_standings` : on part des matchs
 * terminés qui ont un score, et des joueurs réellement placés dans une équipe
 * (la compo stockée fait office de `team_assignments`).
 */
export function getStandings(): StandingRow[] {
  const names: Record<string, string> = {};
  for (const p of DEMO_PLAYERS) names[p.id] = p.name;

  const entries: StandingEntry[] = [];
  for (const match of state.matches) {
    if (match.status !== "finished") continue;
    const score = state.scoreByMatch[match.id];
    const composition = state.resultByMatch[match.id];
    if (!score || !composition) continue;
    for (const { player } of composition.teamA.players) {
      entries.push({ userId: player.id, goalsFor: score.scoreA, goalsAgainst: score.scoreB });
    }
    for (const { player } of composition.teamB.players) {
      entries.push({ userId: player.id, goalsFor: score.scoreB, goalsAgainst: score.scoreA });
    }
    // Les noms de la compo priment (un joueur peut ne pas être dans DEMO_PLAYERS).
    for (const { player } of [...composition.teamA.players, ...composition.teamB.players]) {
      names[player.id] = player.name;
    }
  }
  return buildStandings(entries, names);
}

/**
 * Équivalent en mémoire de la vue SQL `top_scorers` : seuls les matchs terminés
 * comptent, et un joueur rouvert sort du classement comme pour les points.
 */
export function getTopScorers(): ScorerRow[] {
  const names: Record<string, string> = {};
  for (const p of DEMO_PLAYERS) names[p.id] = p.name;
  for (const composition of Object.values(state.resultByMatch)) {
    if (!composition) continue;
    for (const { player } of [...composition.teamA.players, ...composition.teamB.players]) {
      names[player.id] = player.name;
    }
  }

  const entries: ScorerEntry[] = [];
  for (const match of state.matches) {
    if (match.status !== "finished") continue;
    for (const [userId, goals] of Object.entries(getGoals(match.id))) {
      entries.push({ userId, name: names[userId] ?? "Joueur", goals, matchId: match.id });
    }
  }
  return aggregateTopScorers(entries);
}

// --- Écriture --------------------------------------------------------------

export function upsertParticipation(matchId: string, participation: Participation): void {
  const forMatch = { ...getParticipations(matchId), [participation.playerId]: participation };
  commit({
    ...state,
    participationsByMatch: { ...state.participationsByMatch, [matchId]: forMatch },
  });
}

export function removeParticipation(matchId: string, playerId: string): void {
  const forMatch = { ...getParticipations(matchId) };
  delete forMatch[playerId];
  commit({
    ...state,
    participationsByMatch: { ...state.participationsByMatch, [matchId]: forMatch },
  });
}

export function setResult(matchId: string, result: GenerationResult | null): void {
  commit({ ...state, resultByMatch: { ...state.resultByMatch, [matchId]: result } });
}

export function setScore(matchId: string, score: MatchScore): void {
  commit({ ...state, scoreByMatch: { ...state.scoreByMatch, [matchId]: score } });
}

/** Remplace les buteurs du match (miroir de `repo.saveGoals` : on n'ajoute pas). */
export function setGoals(matchId: string, goals: PlayerGoals[]): void {
  const forMatch: Record<string, number> = {};
  for (const g of goals) if (g.goals > 0) forMatch[g.userId] = g.goals;
  commit({ ...state, goalsByMatch: { ...state.goalsByMatch, [matchId]: forMatch } });
}

export function setStatus(matchId: string, status: MatchStatus): void {
  commit({
    ...state,
    matches: state.matches.map((m) => (m.id === matchId ? { ...m, status } : m)),
  });
}

export function updateMatch(matchId: string, patch: MatchInput): void {
  commit({
    ...state,
    matches: state.matches.map((m) => (m.id === matchId ? { ...m, ...patch } : m)),
  });
}

export function createMatch(input: MatchInput): Match {
  const match: Match = { id: `demo-${nextId++}`, ...input, status: "open" };
  commit({
    ...state,
    matches: [...state.matches, match],
    participationsByMatch: { ...state.participationsByMatch, [match.id]: {} },
    resultByMatch: { ...state.resultByMatch, [match.id]: null },
  });
  return match;
}

/** Comme en live : le match passe en `cancelled` et rejoint les matchs passés. */
export function cancelMatch(matchId: string): void {
  setResult(matchId, null);
  setStatus(matchId, "cancelled");
}
