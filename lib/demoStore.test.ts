// Parcours du mode démo pour les buteurs — Vitest (`npm test`).
// Le store démo est l'équivalent en mémoire de la vue SQL `top_scorers` : ce
// test vérifie surtout la règle de statut (un match rouvert ne compte plus) et
// le fait qu'une saisie REMPLACE la précédente, comme `repo.saveGoals`.
import { test, expect } from "vitest";
import * as demoStore from "./demoStore";
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
