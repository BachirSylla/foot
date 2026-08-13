// Parcours du mode démo — Vitest (`npm test`).
// Le store démo est l'équivalent en mémoire des vues SQL `top_scorers` et
// `pair_together_counts` : ces tests vérifient surtout la règle de statut (un
// match rouvert ne compte plus) et le fait qu'une saisie de buts REMPLACE la
// précédente, comme `repo.saveGoals`.
//
// ATTENTION : le store démo est un singleton de module, l'état persiste d'un
// test à l'autre. Chaque test travaille donc sur ses propres matchs/joueurs.
import { test, expect } from "vitest";
import * as demoStore from "./demoStore";
import { pairKey } from "./balance";
import type { GenerationResult } from "./types";

const compo: GenerationResult = {
  teamA: {
    players: [
      { player: { id: "yoro", name: "Yoro Diallo", positions: ["FWD"] }, assignedPosition: "FWD" },
      { player: { id: "moussa", name: "Moussa Camara", positions: ["DEF"] }, assignedPosition: "DEF" },
    ],
    totalLevel: 0,
  },
  teamB: {
    players: [
      { player: { id: "lamine", name: "Lamine Condé", positions: ["FWD"] }, assignedPosition: "FWD" },
      { player: { id: "sekou", name: "Sékou Touré", positions: ["GK"] }, assignedPosition: "GK" },
    ],
    totalLevel: 0,
  },
  score: 0,
  breakdown: { level: 0, tiers: 0, positions: 0, rotation: 0 },
  warnings: [],
};

test("parcours démo : saisie des buts -> classement buteurs -> réouverture", () => {
  demoStore.setResult("demo-1", compo);
  demoStore.setScore("demo-1", { scoreA: 3, scoreB: 1 });
  demoStore.setStatus("demo-1", "finished");
  demoStore.setGoals("demo-1", [
    { userId: "yoro", goals: 2 },
    { userId: "moussa", goals: 1 },
    { userId: "lamine", goals: 1 },
    { userId: "sekou", goals: 0 }, // ignoré
  ]);

  expect(demoStore.getGoals("demo-1")).toEqual({ yoro: 2, moussa: 1, lamine: 1 });
  expect(demoStore.getTopScorers().map((r) => [r.name, r.goals, r.matches])).toEqual([
    ["Yoro Diallo", 2, 1],
    ["Lamine Condé", 1, 1],
    ["Moussa Camara", 1, 1],
  ]);
  // Le classement principal est inchangé par les buts : 3-1 => A gagne.
  const standings = demoStore.getStandings();
  expect(standings.find((r) => r.userId === "yoro")?.points).toBe(3);
  expect(standings.find((r) => r.userId === "lamine")?.points).toBe(0);

  // Réouverture : les buts restent stockés mais sortent du classement.
  demoStore.setStatus("demo-1", "published");
  expect(demoStore.getGoals("demo-1")).toEqual({ yoro: 2, moussa: 1, lamine: 1 });
  expect(demoStore.getTopScorers()).toEqual([]);
  expect(demoStore.getStandings()).toEqual([]);

  // Re-terminé : ils recomptent.
  demoStore.setStatus("demo-1", "finished");
  expect(demoStore.getTopScorers()).toHaveLength(3);

  // Une nouvelle saisie REMPLACE la précédente (pas d'accumulation).
  demoStore.setGoals("demo-1", [{ userId: "yoro", goals: 1 }]);
  expect(demoStore.getTopScorers().map((r) => [r.userId, r.goals])).toEqual([["yoro", 1]]);
});

/** Une composition minimale : les ids servent aussi de noms. */
function compoOf(teamA: string[], teamB: string[]): GenerationResult {
  const team = (ids: string[]) => ({
    players: ids.map((id) => ({
      player: { id, name: id, positions: ["MID" as const] },
      assignedPosition: "MID" as const,
    })),
    totalLevel: 0,
  });
  return {
    teamA: team(teamA),
    teamB: team(teamB),
    score: 0,
    breakdown: { level: 0, tiers: 0, positions: 0, rotation: 0 },
    warnings: [],
  };
}

function playedTogether(): (a: string, b: string) => number | undefined {
  const counts = demoStore.getPairTogether();
  return (a, b) => counts[pairKey(a, b)];
}

test("rotation démo : compte les paires des matchs terminés seulement", () => {
  const input = { title: "Rotation", startsAt: "2026-09-01T18:00:00", location: "Terrain", maxPlayers: 10 };
  const m1 = demoStore.createMatch(input);
  demoStore.setResult(m1.id, compoOf(["r1", "r2"], ["r3", "r4"]));

  // Compo tirée mais match pas encore joué : rien ne compte.
  expect(playedTogether()("r1", "r2")).toBeUndefined();

  demoStore.setStatus(m1.id, "finished");
  const after = playedTogether();
  expect(after("r1", "r2")).toBe(1);
  expect(after("r3", "r4")).toBe(1);
  // Adversaires, pas coéquipiers : hors sujet pour la rotation.
  expect(after("r1", "r3")).toBeUndefined();

  // Deuxième match ensemble : la paire pèse plus lourd.
  const m2 = demoStore.createMatch(input);
  demoStore.setResult(m2.id, compoOf(["r1", "r2"], ["r3", "r4"]));
  demoStore.setStatus(m2.id, "finished");
  expect(playedTogether()("r1", "r2")).toBe(2);

  // Réouverture : le match sort du calcul, comme pour les points et les buts.
  demoStore.setStatus(m2.id, "published");
  expect(playedTogether()("r1", "r2")).toBe(1);
});
