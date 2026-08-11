// Types (allégés) reflétant supabase/schema.sql.
// Pour la version générée automatiquement : `supabase gen types typescript`.

import type { Position } from "./types";

export type MatchTypeDb = "internal" | "external";
export type MatchStatusDb = "draft" | "open" | "generated" | "published" | "finished" | "cancelled";
export type AvailabilityDb = "available" | "unavailable" | "maybe";
export type RoleDb = "player" | "admin";
export type TeamSide = "A" | "B";

export interface ProfileRow {
  id: string;
  full_name: string;
  role: RoleDb;
  level: number | null;
  usual_positions: Position[];
  created_at: string;
}

export interface MatchRow {
  id: string;
  title: string | null;
  starts_at: string;
  location: string | null;
  sport: string;
  type: MatchTypeDb;
  max_players: number;
  team_size: number | null;
  formation: Record<string, number> | null;
  status: MatchStatusDb;
  created_by: string;
  created_at: string;
}

export interface ParticipationRow {
  id: string;
  match_id: string;
  user_id: string;
  status: AvailabilityDb;
  positions: Position[];
  responded_at: string;
}

export interface CompositionRow {
  id: string;
  match_id: string;
  seed: string | null;
  mode: string;
  score: number | null;
  breakdown: Record<string, number> | null;
  is_locked: boolean;
  generated_at: string;
}

export interface AssignmentRow {
  id: string;
  composition_id: string;
  user_id: string;
  team: TeamSide;
  assigned_position: Position;
}
