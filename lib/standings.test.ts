// Tests du classement interne — Vitest (`npm test`).
// Ces règles sont dupliquées dans la vue SQL `player_standings` : ces tests
// documentent le barème et le départage attendus des deux côtés.
import { test, expect } from "vitest";
import {
  aggregateTopScorers,
  buildStandings,
  POINTS,
  sortStandings,
  type ScorerEntry,
  type StandingEntry,
} from "./standings";
import type { StandingRow } from "./types";

const NAMES = { a: "Ana", b: "Bo", c: "Cyd", d: "Dia" };

/** Un match terminé : chaque camp devient une apparition par joueur. */
function match(teamA: string[], teamB: string[], scoreA: number, scoreB: number): StandingEntry[] {
  return [
    ...teamA.map((userId) => ({ userId, goalsFor: scoreA, goalsAgainst: scoreB })),
    ...teamB.map((userId) => ({ userId, goalsFor: scoreB, goalsAgainst: scoreA })),
  ];
}

test("victoire 3, nul 1, défaite 0", () => {
  const rows = buildStandings(match(["a"], ["b"], 3, 2), NAMES);
  expect(rows.map((r) => [r.name, r.played, r.wins, r.draws, r.losses, r.points])).toEqual([
    ["Ana", 1, 1, 0, 0, POINTS.win],
    ["Bo", 1, 0, 0, 1, POINTS.loss],
  ]);

  const nul = buildStandings(match(["a"], ["b"], 1, 1), NAMES);
  expect(nul.every((r) => r.draws === 1 && r.points === POINTS.draw)).toBe(true);
});

test("agrège plusieurs matchs par joueur", () => {
  const rows = buildStandings(
    [...match(["a", "b"], ["c"], 2, 0), ...match(["a"], ["b", "c"], 0, 4), ...match(["a"], ["c"], 1, 1)],
    NAMES
  );
  const ana = rows.find((r) => r.userId === "a")!;
  expect([ana.played, ana.wins, ana.draws, ana.losses, ana.points]).toEqual([3, 1, 1, 1, 4]);

  const cyd = rows.find((r) => r.userId === "c")!;
  expect([cyd.played, cyd.wins, cyd.draws, cyd.losses, cyd.points]).toEqual([3, 1, 1, 1, 4]);
});

test("trie par points, puis victoires, puis moins de matchs joués", () => {
  const rows: StandingRow[] = [
    { userId: "a", name: "Ana", played: 5, wins: 1, draws: 3, losses: 1, points: 6 },
    { userId: "b", name: "Bo", played: 4, wins: 2, draws: 0, losses: 2, points: 6 },
    { userId: "c", name: "Cyd", played: 3, wins: 2, draws: 0, losses: 1, points: 6 },
    { userId: "d", name: "Dia", played: 1, wins: 0, draws: 0, losses: 1, points: 0 },
  ];
  // Cyd et Bo ont 2 victoires ; Cyd les a faites en moins de matchs.
  expect(sortStandings(rows).map((r) => r.userId)).toEqual(["c", "b", "a", "d"]);
});

test("un joueur hors roster reste listé sous « Joueur »", () => {
  const rows = buildStandings(match(["inconnu"], ["a"], 0, 1), NAMES);
  expect(rows.find((r) => r.userId === "inconnu")?.name).toBe("Joueur");
});

test("sans match terminé, le classement est vide", () => {
  expect(buildStandings([], NAMES)).toEqual([]);
});

// --- Meilleurs buteurs ------------------------------------------------------
// Ces règles sont dupliquées dans la vue SQL `top_scorers`.

function goal(matchId: string, userId: keyof typeof NAMES, goals: number): ScorerEntry {
  return { matchId, userId, name: NAMES[userId], goals };
}

test("additionne les buts d'un joueur et compte ses matchs", () => {
  const rows = aggregateTopScorers([
    goal("m1", "a", 2),
    goal("m2", "a", 1),
    goal("m1", "b", 1),
  ]);
  expect(rows.map((r) => [r.name, r.goals, r.matches])).toEqual([
    ["Ana", 3, 2],
    ["Bo", 1, 1],
  ]);
});

test("à buts égaux, le moins de matchs passe devant, puis le nom", () => {
  const rows = aggregateTopScorers([
    goal("m1", "a", 2), // Ana : 4 buts en 2 matchs
    goal("m2", "a", 2),
    goal("m1", "b", 4), // Bo : 4 buts en 1 match
    goal("m1", "c", 4), // Cyd : 4 buts en 1 match aussi -> départage par le nom
  ]);
  expect(rows.map((r) => r.userId)).toEqual(["b", "c", "a"]);
});

test("les lignes à 0 but ne font pas de buteur", () => {
  expect(aggregateTopScorers([goal("m1", "a", 0), goal("m1", "b", 0)])).toEqual([]);
  const rows = aggregateTopScorers([goal("m1", "a", 0), goal("m2", "a", 1)]);
  expect(rows.map((r) => [r.name, r.goals, r.matches])).toEqual([["Ana", 1, 1]]);
});
