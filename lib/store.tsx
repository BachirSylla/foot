"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Availability,
  GenerationResult,
  Match,
  MatchScore,
  Participation,
  Player,
  Position,
} from "./types";
import { DEMO_PLAYERS, CURRENT_USER_ID } from "./mock";
import * as demoStore from "./demoStore";
import { useDemoState } from "./demoStore";
import { generateTeams, formationForTeamSize } from "./balance";
import { getSupabase } from "./supabase";
import { useAuth } from "./auth";
import * as repo from "./repo";

export type Role = "player" | "admin";
export type GenMode = "fun" | "balanced";

interface CurrentUser {
  id: string;
  name: string;
}

export interface MatchPatch {
  title: string;
  startsAt: string;
  location: string;
  maxPlayers: number;
}

interface Ctx {
  ready: boolean;
  mode: "demo" | "live";
  currentUser: CurrentUser | null;
  isAdmin: boolean;
  role: Role;
  setRole: (r: Role) => void;
  match: Match | null;
  roster: Player[];
  participations: Record<string, Participation>;
  availablePlayers: Player[];
  counts: { available: number; maybe: number; unavailable: number };
  /** La composition (équipes tirées). */
  result: GenerationResult | null;
  /** Le score final, une fois le match terminé. Distinct de `result`. */
  score: MatchScore | null;
  revealing: boolean;
  actions: {
    setMyAvailability: (status: Availability) => void;
    setMyPositions: (positions: Position[]) => void;
    /** Admin : retire la réponse d'un joueur pour ce match (doublon, erreur…). */
    removeParticipation: (userId: string) => void;
    generate: (genMode: GenMode, teamSize?: number) => void;
    endReveal: () => void;
    publish: () => void;
    /** Retire la publication mais garde la composition (statut `generated`). */
    unpublish: () => void;
    resetGeneration: () => void;
    /** Saisit (ou corrige) le score : le match passe en « terminé ». */
    saveResult: (scoreA: number, scoreB: number) => void;
    /** Ramène un match terminé en « équipes publiées » (le score est conservé). */
    reopenMatch: () => void;
    updateMatch: (patch: MatchPatch) => void;
    cancelMatch: () => void;
  };
}

const StoreContext = createContext<Ctx | null>(null);

const NO_PARTICIPATIONS: Record<string, Participation> = {};

function computeAvailable(roster: Player[], parts: Record<string, Participation>): Player[] {
  return roster
    .filter((p) => {
      const part = parts[p.id];
      return part?.status === "available" && part.positions.length > 0;
    })
    .map((p) => ({ ...p, positions: parts[p.id]!.positions }));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function runGeneration(available: Player[], genMode: GenMode, teamSize?: number): GenerationResult {
  const size = teamSize ?? Math.floor(available.length / 2);
  const formation = formationForTeamSize(Math.max(1, size));
  return generateTeams(shuffle(available), {
    mode: genMode === "fun" ? "fast" : "balanced",
    formation,
  });
}

/**
 * Store d'UN match. Toutes les données (réponses, composition, temps réel) sont
 * scopées sur `matchId` : deux matchs ouverts en même temps ne se mélangent pas.
 * La création d'un match, elle, vit sur l'accueil (`MatchList`).
 */
export function StoreProvider({ matchId, children }: { matchId: string; children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const mode: "demo" | "live" = auth.configured ? "live" : "demo";

  const demo = useDemoState();
  const [ready, setReady] = useState(mode === "demo");
  const [role, setRole] = useState<Role>("player");
  const [liveMatch, setLiveMatch] = useState<Match | null>(null);
  const [liveRoster, setLiveRoster] = useState<Player[]>([]);
  const [liveParticipations, setLiveParticipations] = useState<Record<string, Participation>>({});
  const [liveResult, setLiveResult] = useState<GenerationResult | null>(null);
  const [liveScore, setLiveScore] = useState<MatchScore | null>(null);
  const [revealing, setRevealing] = useState(false);

  // Lecture : le mode démo lit le store en mémoire, le mode live l'état chargé.
  const match = mode === "demo" ? demo.matches.find((m) => m.id === matchId) ?? null : liveMatch;
  const roster = mode === "demo" ? DEMO_PLAYERS : liveRoster;
  const participations =
    mode === "demo" ? demo.participationsByMatch[matchId] ?? NO_PARTICIPATIONS : liveParticipations;
  const result = mode === "demo" ? demo.resultByMatch[matchId] ?? null : liveResult;
  const score = mode === "demo" ? demo.scoreByMatch[matchId] ?? null : liveScore;

  const currentUser: CurrentUser | null =
    mode === "demo"
      ? { id: CURRENT_USER_ID, name: DEMO_PLAYERS.find((p) => p.id === CURRENT_USER_ID)?.name ?? "Toi" }
      : auth.session
      ? { id: auth.session.user.id, name: auth.profile?.full_name ?? auth.session.user.email ?? "Toi" }
      : null;

  const isAdmin = mode === "demo" ? true : auth.isAdmin;

  // --- Chargement des données (mode live) ---
  const reloadAll = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const r = await repo.fetchRoster(sb);
    setLiveRoster(r);
    const rm: Record<string, Player> = {};
    for (const p of r) rm[p.id] = p;

    const m = await repo.fetchMatchById(sb, matchId);
    setLiveMatch(m);
    if (m) {
      const parts = await repo.fetchParticipations(sb, m.id);
      const map: Record<string, Participation> = {};
      for (const p of parts) map[p.playerId] = p;
      setLiveParticipations(map);
      const comp = await repo.fetchComposition(sb, m.id, rm);
      setLiveResult(comp?.result ?? null);
      setLiveScore(await repo.fetchResult(sb, m.id));
    } else {
      setLiveParticipations({});
      setLiveResult(null);
      setLiveScore(null);
    }
  }, [matchId]);

  // `auth.profile?.full_name` en dépendance : quand un joueur anonyme choisit son
  // nom, on recharge l'effectif pour qu'il n'apparaisse plus en « Nouveau joueur ».
  const myName = auth.profile?.full_name;
  useEffect(() => {
    if (mode !== "live") return;
    if (!auth.ready) return;
    if (!auth.session) {
      setReady(true);
      return;
    }
    let active = true;
    (async () => {
      try {
        await reloadAll();
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [mode, auth.ready, auth.session, myName, reloadAll]);

  // --- Temps réel (mode live), scopé sur le match de la page ---
  const reloadRef = useRef(reloadAll);
  reloadRef.current = reloadAll;
  useEffect(() => {
    if (mode !== "live" || !auth.session) return;
    const sb = getSupabase();
    if (!sb) return;
    const channel = sb
      .channel(`match-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "participations", filter: `match_id=eq.${matchId}` }, () => reloadRef.current())
      .on("postgres_changes", { event: "*", schema: "public", table: "team_compositions", filter: `match_id=eq.${matchId}` }, () => reloadRef.current())
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, () => reloadRef.current())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_results", filter: `match_id=eq.${matchId}` }, () => reloadRef.current())
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [mode, auth.session, matchId]);

  // --- Actions ---
  const setMyAvailability = useCallback(
    (status: Availability) => {
      if (!currentUser) return;
      const prev = participations[currentUser.id];
      const next: Participation = {
        playerId: currentUser.id,
        status,
        positions: status === "unavailable" ? [] : prev?.positions ?? [],
      };
      if (mode === "demo") {
        demoStore.upsertParticipation(matchId, next);
        demoStore.setResult(matchId, null);
        demoStore.setStatus(matchId, "open");
      } else {
        setLiveParticipations((p) => ({ ...p, [currentUser.id]: next }));
        const sb = getSupabase();
        if (sb) repo.upsertParticipation(sb, matchId, currentUser.id, status, next.positions).catch(console.error);
      }
    },
    [currentUser, participations, mode, matchId]
  );

  const setMyPositions = useCallback(
    (positions: Position[]) => {
      if (!currentUser) return;
      const prev = participations[currentUser.id];
      const status: Availability = prev?.status === "unavailable" || !prev ? "available" : prev.status;
      const next: Participation = { playerId: currentUser.id, status, positions };
      if (mode === "demo") {
        demoStore.upsertParticipation(matchId, next);
        demoStore.setResult(matchId, null);
      } else {
        setLiveParticipations((p) => ({ ...p, [currentUser.id]: next }));
        const sb = getSupabase();
        if (sb) repo.upsertParticipation(sb, matchId, currentUser.id, status, positions).catch(console.error);
      }
    },
    [currentUser, participations, mode, matchId]
  );

  const removeParticipation = useCallback(
    (userId: string) => {
      if (mode === "demo") {
        demoStore.removeParticipation(matchId, userId);
      } else {
        setLiveParticipations((p) => {
          const next = { ...p };
          delete next[userId];
          return next;
        });
        const sb = getSupabase();
        if (sb) repo.removeParticipation(sb, matchId, userId).catch(console.error);
      }
    },
    [mode, matchId]
  );

  const generate = useCallback(
    (genMode: GenMode, teamSize?: number) => {
      const available = computeAvailable(roster, participations);
      if (available.length < 2) return;
      const res = runGeneration(available, genMode, teamSize);
      setRevealing(true);
      if (mode === "demo") {
        demoStore.setResult(matchId, res);
        demoStore.setStatus(matchId, "generated");
      } else {
        setLiveResult(res);
        setLiveMatch((m) => (m ? { ...m, status: "generated" } : m));
        const sb = getSupabase();
        if (sb) repo.saveComposition(sb, matchId, res, genMode).catch(console.error);
      }
    },
    [roster, participations, mode, matchId]
  );

  const endReveal = useCallback(() => setRevealing(false), []);

  /** Change le statut du match (démo : en mémoire, live : optimiste + base). */
  const applyStatus = useCallback(
    (status: "open" | "generated" | "published") => {
      if (mode === "demo") {
        demoStore.setStatus(matchId, status);
      } else {
        setLiveMatch((m) => (m ? { ...m, status } : m));
        const sb = getSupabase();
        if (sb) repo.setMatchStatus(sb, matchId, status).catch(console.error);
      }
    },
    [mode, matchId]
  );

  const publish = useCallback(() => {
    applyStatus("published");
    setRevealing(false);
  }, [applyStatus]);

  const unpublish = useCallback(() => {
    applyStatus("generated");
    setRevealing(false);
  }, [applyStatus]);

  const resetGeneration = useCallback(() => {
    if (mode === "demo") demoStore.setResult(matchId, null);
    else setLiveResult(null);
    applyStatus("open");
  }, [mode, matchId, applyStatus]);

  const saveResult = useCallback(
    (scoreA: number, scoreB: number) => {
      if (mode === "demo") {
        demoStore.setScore(matchId, { scoreA, scoreB });
        demoStore.setStatus(matchId, "finished");
      } else {
        setLiveScore({ scoreA, scoreB });
        setLiveMatch((m) => (m ? { ...m, status: "finished" } : m));
        const sb = getSupabase();
        if (sb) repo.saveResult(sb, matchId, scoreA, scoreB).catch(console.error);
      }
    },
    [mode, matchId]
  );

  // Le score reste en base : comme la vue `player_standings` ne compte que les
  // matchs 'finished', il sort du classement jusqu'à la prochaine validation.
  const reopenMatch = useCallback(() => {
    applyStatus("published");
  }, [applyStatus]);

  const updateMatch = useCallback(
    (patch: MatchPatch) => {
      if (mode === "demo") {
        demoStore.updateMatch(matchId, patch);
      } else {
        setLiveMatch((m) => (m ? { ...m, ...patch } : m));
        const sb = getSupabase();
        if (sb) repo.updateMatch(sb, matchId, patch).catch(console.error);
      }
    },
    [mode, matchId]
  );

  const cancelMatch = useCallback(() => {
    if (mode === "demo") {
      demoStore.cancelMatch(matchId);
    } else {
      const sb = getSupabase();
      if (sb) repo.cancelMatch(sb, matchId).catch(console.error);
    }
    setRevealing(false);
    // Le match quitte les « à venir » : on renvoie l'organisateur sur la liste.
    router.push("/");
  }, [mode, matchId, router]);

  const value = useMemo<Ctx>(() => {
    const available = computeAvailable(roster, participations);
    let a = 0, mb = 0, u = 0;
    for (const p of roster) {
      const s = participations[p.id]?.status;
      if (s === "available") a++;
      else if (s === "maybe") mb++;
      else if (s === "unavailable") u++;
    }
    return {
      ready,
      mode,
      currentUser,
      isAdmin,
      role,
      setRole,
      match,
      roster,
      participations,
      availablePlayers: available,
      counts: { available: a, maybe: mb, unavailable: u },
      result,
      score,
      revealing,
      actions: {
        setMyAvailability, setMyPositions, removeParticipation, generate, endReveal,
        publish, unpublish, resetGeneration, saveResult, reopenMatch, updateMatch, cancelMatch,
      },
    };
  }, [
    ready, mode, currentUser, isAdmin, role, match, roster, participations, result, score, revealing,
    setMyAvailability, setMyPositions, removeParticipation, generate, endReveal,
    publish, unpublish, resetGeneration, saveResult, reopenMatch, updateMatch, cancelMatch,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore doit être utilisé dans <StoreProvider>");
  return ctx;
}
