import type { Player, Participation, Match } from "./types";

// Collègues de démo. (Le niveau n'est PAS utilisé dans l'app — champ gardé pour plus tard.)
export const DEMO_PLAYERS: Player[] = [
  { id: "bachir", name: "Bachir Sylla", positions: ["MID", "DEF"] },
  { id: "yoro", name: "Yoro Diallo", positions: ["FWD", "MID"] },
  { id: "djibril", name: "Djibril Bah", positions: ["GK", "DEF"] },
  { id: "moussa", name: "Moussa Camara", positions: ["DEF"] },
  { id: "oumar", name: "Oumar Baldé", positions: ["MID", "FWD"] },
  { id: "sekou", name: "Sékou Touré", positions: ["GK", "MID"] },
  { id: "ibrahima", name: "Ibrahima Barry", positions: ["DEF", "MID"] },
  { id: "lamine", name: "Lamine Condé", positions: ["FWD"] },
  { id: "amadou", name: "Amadou Sow", positions: ["MID", "DEF"] },
  { id: "fode", name: "Fodé Kanté", positions: ["FWD", "MID"] },
  { id: "mamadou", name: "Mamadou Diané", positions: ["DEF", "FWD"] },
  { id: "alpha", name: "Alpha Cissé", positions: ["MID"] },
  { id: "karim", name: "Karim Traoré", positions: ["FWD", "DEF"] },
  { id: "saliou", name: "Saliou Keïta", positions: ["GK", "DEF"] },
];

export const DEMO_MATCH: Match = {
  id: "match-1",
  title: "Match du vendredi",
  startsAt: "2026-08-14T18:00:00",
  location: "Terrain de l'entreprise",
  maxPlayers: 12,
  status: "open",
};

// L'utilisateur courant de la démo.
export const CURRENT_USER_ID = "bachir";

// Réponses préexistantes de quelques collègues (pour que la démo soit vivante).
export const INITIAL_PARTICIPATIONS: Participation[] = [
  { playerId: "yoro", status: "available", positions: ["FWD", "MID"] },
  { playerId: "djibril", status: "available", positions: ["GK", "DEF"] },
  { playerId: "moussa", status: "available", positions: ["DEF"] },
  { playerId: "oumar", status: "available", positions: ["MID", "FWD"] },
  { playerId: "sekou", status: "available", positions: ["GK", "MID"] },
  { playerId: "ibrahima", status: "available", positions: ["DEF", "MID"] },
  { playerId: "lamine", status: "available", positions: ["FWD"] },
  { playerId: "amadou", status: "maybe", positions: ["MID"] },
  { playerId: "fode", status: "available", positions: ["FWD", "MID"] },
  { playerId: "mamadou", status: "available", positions: ["DEF", "FWD"] },
  { playerId: "karim", status: "unavailable", positions: [] },
];

export function playerById(id: string): Player | undefined {
  return DEMO_PLAYERS.find((p) => p.id === id);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
