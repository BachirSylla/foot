// Moteur d'équilibrage — voir teammix/core pour la version documentée + tests.
// Ici : copie adaptée aux imports Next.js (résolution "bundler").

import type {
  Player,
  Position,
  Formation,
  Weights,
  GenerateOptions,
  GenerationResult,
  Team,
  AssignedPlayer,
} from "./types";

const DEFAULT_LEVEL = 3;

const WEIGHTS_BY_MODE: Record<string, Weights> = {
  fast: { level: 1, tiers: 0, positions: 0, rotation: 0 },
  balanced: { level: 1, tiers: 0.5, positions: 1.5, rotation: 0 },
  competition: { level: 1, tiers: 0.75, positions: 1.5, rotation: 0.5 },
};

function levelOf(p: Player, def: number): number {
  return p.level ?? def;
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function snakeDraftSplit(players: Player[], def: number): [Player[], Player[]] {
  const sorted = [...players].sort((x, y) => levelOf(y, def) - levelOf(x, def));
  const a: Player[] = [];
  const b: Player[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const toA = i % 4 === 0 || i % 4 === 3;
    (toA ? a : b).push(sorted[i]);
  }
  return [a, b];
}

function* enumerateSplits(
  players: Player[],
  sizeA: number
): Generator<[Player[], Player[]]> {
  const n = players.length;
  const combo: number[] = [];
  function* build(start: number, need: number): Generator<[Player[], Player[]]> {
    if (need === 0) {
      const inA = new Set(combo);
      const a: Player[] = [];
      const b: Player[] = [];
      for (let i = 0; i < n; i++) (inA.has(i) ? a : b).push(players[i]);
      yield [a, b];
      return;
    }
    for (let i = start; i <= n - need; i++) {
      if (combo.length === 0 && i !== 0) continue;
      combo.push(i);
      yield* build(i + 1, need - 1);
      combo.pop();
    }
  }
  yield* build(0, sizeA);
}

function assignPositions(
  group: Player[],
  formation: Formation | undefined
): { assigned: AssignedPlayer[]; positionCost: number } {
  const need: Record<Position, number> = formation
    ? { GK: formation.GK, DEF: formation.DEF, MID: formation.MID, FWD: formation.FWD }
    : { GK: 1, DEF: 0, MID: 0, FWD: 0 };

  const assigned: AssignedPlayer[] = [];
  const remaining = new Set(group.map((_, i) => i));
  let cost = 0;
  const order: Position[] = ["GK", "DEF", "MID", "FWD"];

  for (const pos of order) {
    let slots = need[pos];
    while (slots > 0) {
      let best = -1;
      let bestScore = Infinity;
      for (const i of remaining) {
        const p = group[i];
        const pref = p.positions.indexOf(pos);
        if (pref === -1) continue;
        const score = pref * 10 + p.positions.length;
        if (score < bestScore) {
          bestScore = score;
          best = i;
        }
      }
      if (best === -1) {
        cost += 1;
        slots--;
        continue;
      }
      assigned.push({ player: group[best], assignedPosition: pos });
      remaining.delete(best);
      slots--;
    }
  }

  for (const i of remaining) {
    const p = group[i];
    assigned.push({ player: p, assignedPosition: p.positions[0] ?? "MID" });
  }
  return { assigned, positionCost: cost };
}

function tierOf(level: number): "low" | "mid" | "high" {
  if (level <= 2) return "low";
  if (level >= 4) return "high";
  return "mid";
}

function scoreSplit(
  groupA: Player[],
  groupB: Player[],
  formation: Formation | undefined,
  weights: Weights,
  rotationHistory: Record<string, number> | undefined,
  def: number
) {
  const sum = (g: Player[]) => g.reduce((s, p) => s + levelOf(p, def), 0);
  const levelDiff = Math.abs(sum(groupA) - sum(groupB));

  const tierCount = (g: Player[]) => {
    const c = { low: 0, mid: 0, high: 0 };
    for (const p of g) c[tierOf(levelOf(p, def))]++;
    return c;
  };
  const ta = tierCount(groupA);
  const tb = tierCount(groupB);
  const tierDiff =
    Math.abs(ta.low - tb.low) + Math.abs(ta.mid - tb.mid) + Math.abs(ta.high - tb.high);

  const resA = assignPositions(groupA, formation);
  const resB = assignPositions(groupB, formation);
  const positionCost = resA.positionCost + resB.positionCost;

  let rotationCost = 0;
  if (rotationHistory) {
    const within = (g: Player[]) => {
      let s = 0;
      for (let i = 0; i < g.length; i++)
        for (let j = i + 1; j < g.length; j++)
          s += rotationHistory[pairKey(g[i].id, g[j].id)] ?? 0;
      return s;
    };
    rotationCost = within(groupA) + within(groupB);
  }

  const breakdown = { level: levelDiff, tiers: tierDiff, positions: positionCost, rotation: rotationCost };
  const score =
    weights.level * levelDiff +
    weights.tiers * tierDiff +
    weights.positions * positionCost +
    weights.rotation * rotationCost;

  return { score, breakdown, assignedA: resA.assigned, assignedB: resB.assigned };
}

function buildTeam(assigned: AssignedPlayer[], def: number): Team {
  return {
    players: assigned,
    totalLevel: assigned.reduce((s, a) => s + levelOf(a.player, def), 0),
  };
}

function warningsFor(players: Player[]): string[] {
  const w: string[] = [];
  const keepers = players.filter((p) => p.positions.includes("GK")).length;
  if (keepers === 0) w.push("Aucun gardien déclaré : prévoir un gardien tournant.");
  else if (keepers === 1)
    w.push("Un seul gardien : une seule équipe aura un vrai gardien (gardien tournant conseillé).");
  if (players.length % 2 === 1)
    w.push("Nombre impair : une équipe aura un joueur de plus.");
  return w;
}

export function generateTeams(
  players: Player[],
  options: GenerateOptions = {}
): GenerationResult {
  if (players.length < 2) throw new Error("Il faut au moins 2 joueurs.");

  const mode = options.mode ?? "balanced";
  const def = options.defaultLevel ?? DEFAULT_LEVEL;
  const weights: Weights = { ...WEIGHTS_BY_MODE[mode], ...(options.weights ?? {}) };
  const sizeA = Math.ceil(players.length / 2);
  const warnings = warningsFor(players);

  if (mode === "fast") {
    const [ga, gb] = snakeDraftSplit(players, def);
    const scored = scoreSplit(ga, gb, options.formation, weights, options.rotationHistory, def);
    return {
      teamA: buildTeam(scored.assignedA, def),
      teamB: buildTeam(scored.assignedB, def),
      score: scored.score,
      breakdown: scored.breakdown,
      warnings,
    };
  }

  let best: {
    score: number;
    breakdown: GenerationResult["breakdown"];
    a: AssignedPlayer[];
    b: AssignedPlayer[];
  } | null = null;

  let evaluated = 0;
  const HARD_CAP = 400_000;

  for (const [ga, gb] of enumerateSplits(players, sizeA)) {
    if (Math.abs(ga.length - gb.length) > 1) continue;
    const scored = scoreSplit(ga, gb, options.formation, weights, options.rotationHistory, def);
    if (!best || scored.score < best.score) {
      best = { score: scored.score, breakdown: scored.breakdown, a: scored.assignedA, b: scored.assignedB };
    }
    if (++evaluated >= HARD_CAP) break;
  }

  if (!best) {
    const [ga, gb] = snakeDraftSplit(players, def);
    const scored = scoreSplit(ga, gb, options.formation, weights, options.rotationHistory, def);
    best = { score: scored.score, breakdown: scored.breakdown, a: scored.assignedA, b: scored.assignedB };
  }

  return {
    teamA: buildTeam(best.a, def),
    teamB: buildTeam(best.b, def),
    score: best.score,
    breakdown: best.breakdown,
    warnings,
  };
}

export const PRESET_FORMATIONS: Record<number, Formation> = {
  5: { GK: 1, DEF: 2, MID: 1, FWD: 1 },
  6: { GK: 1, DEF: 2, MID: 2, FWD: 1 },
  7: { GK: 1, DEF: 2, MID: 3, FWD: 1 },
  8: { GK: 1, DEF: 3, MID: 3, FWD: 1 },
};

/** Formation adaptée au nombre de joueurs par équipe (repli raisonnable). */
export function formationForTeamSize(size: number): Formation {
  if (PRESET_FORMATIONS[size]) return PRESET_FORMATIONS[size];
  if (size <= 4) return { GK: 1, DEF: 1, MID: 1, FWD: Math.max(0, size - 3) };
  const outfield = size - 1;
  const def = Math.round(outfield * 0.4);
  const fwd = Math.round(outfield * 0.25);
  return { GK: 1, DEF: def, MID: outfield - def - fwd, FWD: fwd };
}
