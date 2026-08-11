// Types partagés — moteur d'équilibrage + domaine applicatif.

export type Position = "GK" | "DEF" | "MID" | "FWD";
export const ALL_POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];

export const POSITION_LABEL: Record<Position, string> = {
  GK: "Gardien",
  DEF: "Défenseur",
  MID: "Milieu",
  FWD: "Attaquant",
};

export const POSITION_SHORT: Record<Position, string> = {
  GK: "GB",
  DEF: "DEF",
  MID: "MIL",
  FWD: "ATT",
};

export interface Player {
  id: string;
  name: string;
  positions: Position[];
  /** Optionnel : gardé pour une évolution future (équilibrage par niveau). */
  level?: number;
}

export interface Formation {
  GK: number;
  DEF: number;
  MID: number;
  FWD: number;
}

export interface Weights {
  level: number;
  tiers: number;
  positions: number;
  rotation: number;
}

export type GenerationMode = "fast" | "balanced" | "competition";

export interface GenerateOptions {
  formation?: Formation;
  mode?: GenerationMode;
  weights?: Partial<Weights>;
  rotationHistory?: Record<string, number>;
  defaultLevel?: number;
  /** Ordre d'entrée mélangé -> variété entre deux tirages (côté app). */
  shuffle?: () => void;
}

export interface AssignedPlayer {
  player: Player;
  assignedPosition: Position;
}

export interface Team {
  players: AssignedPlayer[];
  totalLevel: number;
}

export interface GenerationResult {
  teamA: Team;
  teamB: Team;
  score: number;
  breakdown: { level: number; tiers: number; positions: number; rotation: number };
  warnings: string[];
}

// --- Domaine applicatif (au-delà du moteur) --------------------------------

export type Availability = "available" | "maybe" | "unavailable";

export interface Participation {
  playerId: string;
  status: Availability;
  positions: Position[];
}

export type MatchStatus = "open" | "generated" | "published";

export interface Match {
  id: string;
  title: string;
  startsAt: string; // ISO
  location: string;
  maxPlayers: number;
  status: MatchStatus;
}
