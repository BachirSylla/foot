"use client";

// Couche d'accès aux données en mode "live" (Supabase).
// Le mode démo n'utilise pas ce fichier (il reste 100% en mémoire).

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Match,
  Participation,
  Player,
  Position,
  GenerationResult,
  Team,
} from "./types";
import type {
  ProfileRow,
  ParticipationRow,
  MatchRow,
  CompositionRow,
  AssignmentRow,
} from "./database.types";

function matchFromRow(r: MatchRow): Match {
  return {
    id: r.id,
    title: r.title ?? "Match",
    startsAt: r.starts_at,
    location: r.location ?? "",
    maxPlayers: r.max_players,
    status: r.status === "published" ? "published" : r.status === "generated" ? "generated" : "open",
  };
}

export async function fetchRoster(sb: SupabaseClient): Promise<Player[]> {
  const { data, error } = await sb.from("profiles").select("id, full_name, usual_positions, level");
  if (error) throw error;
  return (data as ProfileRow[]).map((p) => ({
    id: p.id,
    name: p.full_name,
    positions: p.usual_positions ?? [],
    level: p.level ?? undefined,
  }));
}

export async function fetchCurrentMatch(sb: SupabaseClient): Promise<Match | null> {
  const { data, error } = await sb
    .from("matches")
    .select("*")
    .in("status", ["open", "generated", "published"])
    .order("starts_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  const row = (data as MatchRow[])[0];
  return row ? matchFromRow(row) : null;
}

export async function fetchParticipations(
  sb: SupabaseClient,
  matchId: string
): Promise<Participation[]> {
  const { data, error } = await sb
    .from("participations")
    .select("user_id, status, positions")
    .eq("match_id", matchId);
  if (error) throw error;
  return (data as Pick<ParticipationRow, "user_id" | "status" | "positions">[]).map((r) => ({
    playerId: r.user_id,
    status: r.status,
    positions: r.positions ?? [],
  }));
}

export async function upsertParticipation(
  sb: SupabaseClient,
  matchId: string,
  userId: string,
  status: Participation["status"],
  positions: Position[]
): Promise<void> {
  const { error } = await sb
    .from("participations")
    .upsert(
      { match_id: matchId, user_id: userId, status, positions },
      { onConflict: "match_id,user_id" }
    );
  if (error) throw error;
}

/** Reconstruit un GenerationResult affichable à partir des lignes stockées. */
export async function fetchComposition(
  sb: SupabaseClient,
  matchId: string,
  roster: Record<string, Player>
): Promise<{ result: GenerationResult; locked: boolean } | null> {
  const { data: comps, error: cErr } = await sb
    .from("team_compositions")
    .select("*")
    .eq("match_id", matchId)
    .limit(1);
  if (cErr) throw cErr;
  const comp = (comps as CompositionRow[])[0];
  if (!comp) return null;

  const { data: assigns, error: aErr } = await sb
    .from("team_assignments")
    .select("user_id, team, assigned_position")
    .eq("composition_id", comp.id);
  if (aErr) throw aErr;

  const teamA: Team = { players: [], totalLevel: 0 };
  const teamB: Team = { players: [], totalLevel: 0 };
  for (const a of assigns as Pick<AssignmentRow, "user_id" | "team" | "assigned_position">[]) {
    const player = roster[a.user_id] ?? { id: a.user_id, name: "Joueur", positions: [] };
    (a.team === "A" ? teamA : teamB).players.push({ player, assignedPosition: a.assigned_position });
  }

  const result: GenerationResult = {
    teamA,
    teamB,
    score: comp.score ?? 0,
    breakdown: (comp.breakdown as any) ?? { level: 0, tiers: 0, positions: 0, rotation: 0 },
    warnings: [],
  };
  return { result, locked: comp.is_locked };
}

export async function saveComposition(
  sb: SupabaseClient,
  matchId: string,
  result: GenerationResult,
  mode: string
): Promise<void> {
  // Upsert de la composition (une par match).
  const { data: comp, error: cErr } = await sb
    .from("team_compositions")
    .upsert(
      {
        match_id: matchId,
        mode,
        score: result.score,
        breakdown: result.breakdown,
        is_locked: false,
      },
      { onConflict: "match_id" }
    )
    .select("id")
    .single();
  if (cErr) throw cErr;
  const compId = (comp as { id: string }).id;

  // Remplace les affectations.
  await sb.from("team_assignments").delete().eq("composition_id", compId);
  const rows = [
    ...result.teamA.players.map((p) => ({
      composition_id: compId,
      user_id: p.player.id,
      team: "A" as const,
      assigned_position: p.assignedPosition,
    })),
    ...result.teamB.players.map((p) => ({
      composition_id: compId,
      user_id: p.player.id,
      team: "B" as const,
      assigned_position: p.assignedPosition,
    })),
  ];
  const { error: aErr } = await sb.from("team_assignments").insert(rows);
  if (aErr) throw aErr;

  await sb.from("matches").update({ status: "generated" }).eq("id", matchId);
}

export async function setMatchStatus(
  sb: SupabaseClient,
  matchId: string,
  status: "open" | "generated" | "published"
): Promise<void> {
  const { error } = await sb.from("matches").update({ status }).eq("id", matchId);
  if (error) throw error;
  if (status === "published") {
    await sb.from("team_compositions").update({ is_locked: true }).eq("match_id", matchId);
  }
  if (status === "open") {
    // annulation : on déverrouille et on efface la compo
    const { data } = await sb.from("team_compositions").select("id").eq("match_id", matchId).limit(1);
    const comp = (data as { id: string }[])[0];
    if (comp) {
      await sb.from("team_assignments").delete().eq("composition_id", comp.id);
      await sb.from("team_compositions").delete().eq("match_id", matchId);
    }
  }
}

export async function updateMatch(
  sb: SupabaseClient,
  matchId: string,
  patch: { title: string; startsAt: string; location: string; maxPlayers: number }
): Promise<void> {
  const { error } = await sb
    .from("matches")
    .update({
      title: patch.title,
      starts_at: patch.startsAt,
      location: patch.location,
      max_players: patch.maxPlayers,
    })
    .eq("id", matchId);
  if (error) throw error;
}

/**
 * Annule le match : supprime la compo éventuelle puis passe le statut en 'cancelled'.
 * `fetchCurrentMatch` ne lit que ['open','generated','published'] : le match
 * annulé disparaît donc automatiquement de l'app (l'historique reste en base).
 */
export async function cancelMatch(sb: SupabaseClient, matchId: string): Promise<void> {
  const { data } = await sb.from("team_compositions").select("id").eq("match_id", matchId).limit(1);
  const comp = (data as { id: string }[] | null)?.[0];
  if (comp) {
    await sb.from("team_assignments").delete().eq("composition_id", comp.id);
    await sb.from("team_compositions").delete().eq("match_id", matchId);
  }
  const { error } = await sb.from("matches").update({ status: "cancelled" }).eq("id", matchId);
  if (error) throw error;
}

export async function createMatch(
  sb: SupabaseClient,
  input: { title: string; startsAt: string; location: string; maxPlayers: number },
  userId: string
): Promise<Match> {
  const { data, error } = await sb
    .from("matches")
    .insert({
      title: input.title,
      starts_at: input.startsAt,
      location: input.location,
      max_players: input.maxPlayers,
      type: "internal",
      status: "open",
      created_by: userId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return matchFromRow(data as MatchRow);
}
