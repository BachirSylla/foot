// Tests du moteur d'équilibrage — Vitest (`npm test`).
import { test, expect } from "vitest";
import { generateTeams, pairKey, PRESET_FORMATIONS } from "./balance";
import type { Player, Position } from "./types";

function p(id: string, positions: Position[], level?: number, name = id): Player {
  return { id, name, positions, level };
}
const ids = (team: { players: { player: Player }[] }) => team.players.map((a) => a.player.id).sort();
const levelDiff = (r: ReturnType<typeof generateTeams>) => Math.abs(r.teamA.totalLevel - r.teamB.totalLevel);
const everyone = (r: ReturnType<typeof generateTeams>) => [...ids(r.teamA), ...ids(r.teamB)].sort();

const ten: Player[] = [
  p("gk1", ["GK", "DEF"], 4),
  p("gk2", ["GK", "MID"], 3),
  p("d1", ["DEF"], 5),
  p("d2", ["DEF", "MID"], 2),
  p("d3", ["DEF", "FWD"], 3),
  p("m1", ["MID"], 5),
  p("m2", ["MID", "FWD"], 4),
  p("m3", ["MID", "DEF"], 2),
  p("f1", ["FWD"], 4),
  p("f2", ["FWD", "MID"], 3),
];

test("répartit tous les joueurs, sans perte ni doublon", () => {
  const res = generateTeams(ten, { mode: "balanced" });
  expect(everyone(res)).toEqual(ten.map((x) => x.id).sort());
});

test("équipes de taille égale quand N est pair", () => {
  const res = generateTeams(ten, { mode: "balanced" });
  expect(res.teamA.players.length).toBe(5);
  expect(res.teamB.players.length).toBe(5);
});

test("N impair -> une équipe a un joueur de plus, avec avertissement", () => {
  const res = generateTeams(ten.slice(0, 9), { mode: "balanced" });
  expect([res.teamA.players.length, res.teamB.players.length].sort()).toEqual([4, 5]);
  expect(res.warnings.some((w) => w.includes("impair"))).toBe(true);
});

test("mode équilibré : écart de niveau minimal", () => {
  const res = generateTeams(ten, { mode: "balanced" });
  expect(levelDiff(res)).toBeLessThanOrEqual(1);
});

test("Messi vs bras cassés : forts et faibles répartis (écart nul)", () => {
  const stars: Player[] = [
    p("star1", ["FWD"], 5), p("star2", ["MID"], 5), p("star3", ["DEF"], 5), p("star4", ["MID"], 5),
    p("noob1", ["FWD"], 1), p("noob2", ["MID"], 1), p("noob3", ["DEF"], 1), p("noob4", ["MID"], 1),
  ];
  const res = generateTeams(stars, { mode: "balanced" });
  expect(levelDiff(res)).toBe(0);
  expect(ids(res.teamA).filter((id) => id.startsWith("star")).length).toBe(2);
});

test("un seul gardien -> avertissement, pas de crash", () => {
  const oneGk: Player[] = [
    p("gk", ["GK"], 3), p("a", ["DEF"], 3), p("b", ["MID"], 3),
    p("c", ["FWD"], 3), p("d", ["DEF"], 3), p("e", ["MID"], 3),
  ];
  const res = generateTeams(oneGk, { mode: "balanced", formation: { GK: 1, DEF: 1, MID: 1, FWD: 0 } });
  expect(res.warnings.some((w) => w.toLowerCase().includes("gardien"))).toBe(true);
  expect(everyone(res).length).toBe(6);
});

test("le gardien déclaré est assigné au poste GK", () => {
  const res = generateTeams(ten, { mode: "balanced", formation: PRESET_FORMATIONS[5] });
  const gkA = res.teamA.players.filter((a) => a.assignedPosition === "GK").length;
  const gkB = res.teamB.players.filter((a) => a.assignedPosition === "GK").length;
  expect(gkA + gkB).toBeGreaterThanOrEqual(1);
  expect(gkA).toBeLessThanOrEqual(1);
  expect(gkB).toBeLessThanOrEqual(1);
});

test("cold start : sans niveaux, ça fonctionne", () => {
  const noLevels = ten.map((x) => p(x.id, x.positions));
  const res = generateTeams(noLevels, { mode: "balanced" });
  expect(levelDiff(res)).toBe(0);
  expect(everyone(res).length).toBe(10);
});

test("rotation : sépare les joueurs qui ont trop joué ensemble", () => {
  const four: Player[] = [p("a", ["MID"], 3), p("b", ["MID"], 3), p("c", ["MID"], 3), p("d", ["MID"], 3)];
  const res = generateTeams(four, { mode: "competition", rotationHistory: { [pairKey("a", "b")]: 10 } });
  const a = ids(res.teamA);
  expect(a.includes("a") && a.includes("b")).toBe(false);
});

// Le mode « Équilibré » de l'app ajoute la rotation au barème et remonte le
// poids des postes — miroir de BALANCED_WEIGHTS dans lib/store.tsx (changer les
// deux ensemble). Le score du moteur est une somme pondérée : c'est l'écart
// entre ces deux poids, et lui seul, qui garantit que la couverture des postes
// ne s'échange jamais contre de la rotation.
const APP_BALANCED = { positions: 100, rotation: 0.5 };

test("rotation en mode équilibré : sépare les habitués à postes équivalents", () => {
  const four: Player[] = [p("a", ["MID"], 3), p("b", ["MID"], 3), p("c", ["MID"], 3), p("d", ["MID"], 3)];
  const res = generateTeams(four, {
    mode: "balanced",
    weights: APP_BALANCED,
    rotationHistory: { [pairKey("a", "b")]: 10 },
  });
  const a = ids(res.teamA);
  expect(a.includes("a") && a.includes("b")).toBe(false);
});

test("couvrir un poste l'emporte toujours sur la rotation", () => {
  // Deux gardiens pour deux équipes : les séparer est la SEULE façon de couvrir
  // le poste partout. On pénalise lourdement chaque paire (gardien + joueur de
  // champ) pour que la rotation, elle, préfère empiler les deux gardiens dans la
  // même équipe — et on vérifie qu'elle n'y arrive pas.
  const six: Player[] = [
    p("gk1", ["GK"], 3), p("gk2", ["GK"], 3),
    p("d1", ["DEF"], 3), p("d2", ["DEF"], 3),
    p("f1", ["FWD"], 3), p("f2", ["FWD"], 3),
  ];
  const formation = { GK: 1, DEF: 1, MID: 0, FWD: 1 };
  const rotationHistory: Record<string, number> = {};
  for (const gk of ["gk1", "gk2"]) {
    for (const out of ["d1", "d2", "f1", "f2"]) rotationHistory[pairKey(gk, out)] = 50;
  }

  const res = generateTeams(six, { mode: "balanced", formation, weights: APP_BALANCED, rotationHistory });
  const gkA = res.teamA.players.filter((x) => x.assignedPosition === "GK").length;
  const gkB = res.teamB.players.filter((x) => x.assignedPosition === "GK").length;
  expect([gkA, gkB]).toEqual([1, 1]);
  expect(res.breakdown.positions).toBe(0);

  // Contrôle : avec le poids d'origine (postes 1.5), la même situation faisait
  // céder les postes. C'est bien la surcharge de poids qui fait la garantie.
  const weak = generateTeams(six, {
    mode: "balanced",
    formation,
    weights: { rotation: 0.5 },
    rotationHistory,
  });
  expect(weak.breakdown.positions).toBeGreaterThan(0);
});

test("mode rapide (snake draft) : équilibré", () => {
  const res = generateTeams(ten, { mode: "fast" });
  expect(everyone(res).length).toBe(10);
  expect(levelDiff(res)).toBeLessThanOrEqual(3);
});

test("14 joueurs : rapide et bien équilibré", () => {
  const many: Player[] = [];
  const positions: Position[][] = [["GK", "DEF"], ["DEF", "MID"], ["MID", "FWD"], ["FWD", "MID"]];
  for (let i = 0; i < 14; i++) many.push(p(`p${i}`, positions[i % positions.length], (i % 5) + 1));
  const res = generateTeams(many, { mode: "balanced" });
  expect(everyone(res).length).toBe(14);
  expect(levelDiff(res)).toBeLessThanOrEqual(2);
});

test("moins de 2 joueurs -> erreur explicite", () => {
  expect(() => generateTeams([p("solo", ["MID"], 3)])).toThrow(/au moins 2/);
});
