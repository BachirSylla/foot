"use client";

// Couche d'accès aux données en mode "live" (Supabase).
// Le mode démo n'utilise pas ce fichier (il reste 100% en mémoire).

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Availability,
  Match,
  MatchScore,
  MatchStatus,
  Participation,
  Player,
  Position,
  GenerationResult,
  StandingRow,
  Team,
} from "./types";
import type {
  ProfileRow,
  ParticipationRow,
  MatchRow,
  MatchResultRow,
  CompositionRow,
  AssignmentRow,
  StandingsViewRow,
} from "./database.types";
import { sortStandings } from "./standings";

/**
 * `draft` est le défaut de la colonne en base mais l'app ne le manipule pas :
 * on le ramène à `open`. Les autres statuts sont conservés tels quels — l'accueil
 * a besoin de `finished` / `cancelled` pour classer les matchs passés.
 */
function matchFromRow(r: MatchRow): Match {
  return {
    id: r.id,
    title: r.title ?? "Match",
    startsAt: r.starts_at,
    location: r.location ?? "",
    maxPlayers: r.max_players,
    status: (r.status === "draft" ? "open" : r.status) as MatchStatus,
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

/** Un match précis (page /m/[id]). `null` si l'id n'existe pas / plus. */
export async function fetchMatchById(sb: SupabaseClient, id: string): Promise<Match | null> {
  const { data, error } = await sb.from("matches").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? matchFromRow(data as MatchRow) : null;
}

/** Tous les matchs, du plus récent au plus ancien (l'accueil sépare à venir / passés). */
export async function listMatches(sb: SupabaseClient): Promise<Match[]> {
  const { data, error } = await sb
    .from("matches")
    .select("*")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return (data as MatchRow[]).map(matchFromRow);
}

/** Nombre de présents / peut-être par match, agrégé côté client (une seule requête). */
export async function fetchParticipationCounts(
  sb: SupabaseClient,
  matchIds: string[]
): Promise<Record<string, { available: number; maybe: number }>> {
  const counts: Record<string, { available: number; maybe: number }> = {};
  for (const id of matchIds) counts[id] = { available: 0, maybe: 0 };
  if (matchIds.length === 0) return counts;

  const { data, error } = await sb
    .from("participations")
    .select("match_id, status")
    .in("match_id", matchIds);
  if (error) throw error;
  for (const r of data as Pick<ParticipationRow, "match_id" | "status">[]) {
    const c = counts[r.match_id];
    if (!c) continue;
    if (r.status === "available") c.available++;
    else if (r.status === "maybe") c.maybe++;
  }
  return counts;
}

/** Ma réponse pour chaque match (badge « ✓ Répondu » sur l'accueil). */
export async function fetchMyParticipations(
  sb: SupabaseClient,
  userId: string,
  matchIds: string[]
): Promise<Record<string, Availability>> {
  const mine: Record<string, Availability> = {};
  if (matchIds.length === 0) return mine;
  const { data, error } = await sb
    .from("participations")
    .select("match_id, status")
    .eq("user_id", userId)
    .in("match_id", matchIds);
  if (error) throw error;
  for (const r of data as Pick<ParticipationRow, "match_id" | "status">[]) {
    mine[r.match_id] = r.status;
  }
  return mine;
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

/**
 * Supprime la réponse d'un joueur pour ce match (ménage d'un doublon par l'admin).
 * La policy « participations: admin » autorise l'admin à supprimer n'importe quelle
 * ligne ; un joueur ne peut effacer que la sienne.
 */
export async function removeParticipation(
  sb: SupabaseClient,
  matchId: string,
  userId: string
): Promise<void> {
  const { error } = await sb
    .from("participations")
    .delete()
    .eq("match_id", matchId)
    .eq("user_id", userId);
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
  if (status === "generated") {
    // Déverrouillage : la compo est conservée mais redevient invisible pour les
    // joueurs (la policy RLS ne l'ouvre que sur un match `published`).
    await sb.from("team_compositions").update({ is_locked: false }).eq("match_id", matchId);
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
 * Le match quitte la section « À venir » de l'accueil et rejoint les matchs passés
 * (l'historique reste en base, sa page /m/[id] reste consultable).
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

// --- Résultat & classement (V2) --------------------------------------------

/**
 * Enregistre (ou corrige) le score, puis passe le match en 'finished'.
 * Un seul résultat par match : upsert sur `match_id`.
 */
export async function saveResult(
  sb: SupabaseClient,
  matchId: string,
  scoreA: number,
  scoreB: number
): Promise<void> {
  const { error } = await sb
    .from("match_results")
    .upsert({ match_id: matchId, score_a: scoreA, score_b: scoreB }, { onConflict: "match_id" });
  if (error) throw error;
  const { error: mErr } = await sb.from("matches").update({ status: "finished" }).eq("id", matchId);
  if (mErr) throw mErr;
}

export async function fetchResult(sb: SupabaseClient, matchId: string): Promise<MatchScore | null> {
  const { data, error } = await sb
    .from("match_results")
    .select("score_a, score_b")
    .eq("match_id", matchId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as Pick<MatchResultRow, "score_a" | "score_b">;
  return { scoreA: r.score_a, scoreB: r.score_b };
}

/** Les scores de plusieurs matchs d'un coup (cartes de l'accueil). */
export async function fetchResults(
  sb: SupabaseClient,
  matchIds: string[]
): Promise<Record<string, MatchScore>> {
  const out: Record<string, MatchScore> = {};
  if (matchIds.length === 0) return out;
  const { data, error } = await sb
    .from("match_results")
    .select("match_id, score_a, score_b")
    .in("match_id", matchIds);
  if (error) throw error;
  for (const r of data as MatchResultRow[]) {
    out[r.match_id] = { scoreA: r.score_a, scoreB: r.score_b };
  }
  return out;
}

/**
 * Classement interne. L'agrégation (V/N/D/points) est faite par la vue SQL
 * `player_standings` ; ici on ne fait qu'y accrocher les noms et appliquer le
 * départage (voir `lib/standings.ts`).
 */
export async function fetchStandings(sb: SupabaseClient): Promise<StandingRow[]> {
  const { data, error } = await sb.from("player_standings").select("*");
  if (error) throw error;
  const rows = data as StandingsViewRow[];
  if (rows.length === 0) return [];

  const { data: profiles, error: pErr } = await sb.from("profiles").select("id, full_name");
  if (pErr) throw pErr;
  const names: Record<string, string> = {};
  for (const p of profiles as Pick<ProfileRow, "id" | "full_name">[]) names[p.id] = p.full_name;

  return sortStandings(
    rows.map((r) => ({
      userId: r.user_id,
      name: names[r.user_id] ?? "Joueur",
      played: r.played,
      wins: r.wins,
      draws: r.draws,
      losses: r.losses,
      points: r.points,
    }))
  );
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
