"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  Availability,
  GenerationResult,
  Match,
  Participation,
  Player,
  Position,
} from "./types";
import {
  DEMO_MATCH,
  DEMO_PLAYERS,
  INITIAL_PARTICIPATIONS,
  CURRENT_USER_ID,
} from "./mock";
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
  result: GenerationResult | null;
  revealing: boolean;
  actions: {
    setMyAvailability: (status: Availability) => void;
    setMyPositions: (positions: Position[]) => void;
    generate: (genMode: GenMode, teamSize?: number) => void;
    endReveal: () => void;
    publish: () => void;
    resetGeneration: () => void;
    createMatch: (input: { title: string; startsAt: string; location: string; maxPlayers: number }) => void;
    updateMatch: (patch: { title: string; startsAt: string; location: string; maxPlayers: number }) => void;
    cancelMatch: () => void;
  };
}

const StoreContext = createContext<Ctx | null>(null);

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

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const mode: "demo" | "live" = auth.configured ? "live" : "demo";

  const [ready, setReady] = useState(mode === "demo");
  const [role, setRole] = useState<Role>("player");
  const [match, setMatch] = useState<Match | null>(mode === "demo" ? DEMO_MATCH : null);
  const [roster, setRoster] = useState<Player[]>(mode === "demo" ? DEMO_PLAYERS : []);
  const [participations, setParticipations] = useState<Record<string, Participation>>(() => {
    if (mode === "demo") {
      const m: Record<string, Participation> = {};
      for (const p of INITIAL_PARTICIPATIONS) m[p.playerId] = p;
      return m;
    }
    return {};
  });
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [revealing, setRevealing] = useState(false);

  const currentUser: CurrentUser | null =
    mode === "demo"
      ? { id: CURRENT_USER_ID, name: DEMO_PLAYERS.find((p) => p.id === CURRENT_USER_ID)?.name ?? "Toi" }
      : auth.session
      ? { id: auth.session.user.id, name: auth.profile?.full_name ?? auth.session.user.email ?? "Toi" }
      : null;

  const isAdmin = mode === "demo" ? true : auth.isAdmin;

  const rosterMap = useMemo(() => {
    const m: Record<string, Player> = {};
    for (const p of roster) m[p.id] = p;
    return m;
  }, [roster]);

  // --- Chargement des données (mode live) ---
  const reloadAll = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const r = await repo.fetchRoster(sb);
    setRoster(r);
    const rm: Record<string, Player> = {};
    for (const p of r) rm[p.id] = p;

    const m = await repo.fetchCurrentMatch(sb);
    setMatch(m);
    if (m) {
      const parts = await repo.fetchParticipations(sb, m.id);
      const map: Record<string, Participation> = {};
      for (const p of parts) map[p.playerId] = p;
      setParticipations(map);
      const comp = await repo.fetchComposition(sb, m.id, rm);
      setResult(comp?.result ?? null);
    } else {
      setParticipations({});
      setResult(null);
    }
  }, []);

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
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [mode, auth.ready, auth.session, myName, reloadAll]);

  // --- Temps réel (mode live) ---
  const matchId = match?.id;
  const reloadRef = useRef(reloadAll);
  reloadRef.current = reloadAll;
  useEffect(() => {
    if (mode !== "live" || !auth.session || !matchId) return;
    const sb = getSupabase();
    if (!sb) return;
    const channel = sb
      .channel(`match-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "participations", filter: `match_id=eq.${matchId}` }, () => reloadRef.current())
      .on("postgres_changes", { event: "*", schema: "public", table: "team_compositions", filter: `match_id=eq.${matchId}` }, () => reloadRef.current())
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, () => reloadRef.current())
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
      setParticipations((p) => ({ ...p, [currentUser.id]: next }));
      if (mode === "demo") {
        setResult(null);
        setMatch((m) => (m ? { ...m, status: "open" } : m));
      } else {
        const sb = getSupabase();
        if (sb && match) repo.upsertParticipation(sb, match.id, currentUser.id, status, next.positions).catch(console.error);
      }
    },
    [currentUser, participations, mode, match]
  );

  const setMyPositions = useCallback(
    (positions: Position[]) => {
      if (!currentUser) return;
      const prev = participations[currentUser.id];
      const status: Availability = prev?.status === "unavailable" || !prev ? "available" : prev.status;
      const next: Participation = { playerId: currentUser.id, status, positions };
      setParticipations((p) => ({ ...p, [currentUser.id]: next }));
      if (mode === "demo") {
        setResult(null);
      } else {
        const sb = getSupabase();
        if (sb && match) repo.upsertParticipation(sb, match.id, currentUser.id, status, positions).catch(console.error);
      }
    },
    [currentUser, participations, mode, match]
  );

  const generate = useCallback(
    (genMode: GenMode, teamSize?: number) => {
      const available = computeAvailable(roster, participations);
      if (available.length < 2) return;
      const res = runGeneration(available, genMode, teamSize);
      setResult(res);
      setRevealing(true);
      setMatch((m) => (m ? { ...m, status: "generated" } : m));
      if (mode === "live") {
        const sb = getSupabase();
        if (sb && match) repo.saveComposition(sb, match.id, res, genMode).catch(console.error);
      }
    },
    [roster, participations, mode, match]
  );

  const endReveal = useCallback(() => setRevealing(false), []);

  const publish = useCallback(() => {
    setMatch((m) => (m ? { ...m, status: "published" } : m));
    setRevealing(false);
    if (mode === "live") {
      const sb = getSupabase();
      if (sb && match) repo.setMatchStatus(sb, match.id, "published").catch(console.error);
    }
  }, [mode, match]);

  const resetGeneration = useCallback(() => {
    setResult(null);
    setMatch((m) => (m ? { ...m, status: "open" } : m));
    if (mode === "live") {
      const sb = getSupabase();
      if (sb && match) repo.setMatchStatus(sb, match.id, "open").catch(console.error);
    }
  }, [mode, match]);

  const createMatch = useCallback(
    (input: { title: string; startsAt: string; location: string; maxPlayers: number }) => {
      if (mode !== "live") return;
      const sb = getSupabase();
      if (!sb || !currentUser) return;
      repo
        .createMatch(sb, input, currentUser.id)
        .then((m) => {
          setMatch(m);
          setParticipations({});
          setResult(null);
        })
        .catch(console.error);
    },
    [mode, currentUser]
  );

  const updateMatch = useCallback(
    (patch: { title: string; startsAt: string; location: string; maxPlayers: number }) => {
      if (!match) return;
      setMatch((m) => (m ? { ...m, ...patch } : m));
      if (mode === "live") {
        const sb = getSupabase();
        if (sb) repo.updateMatch(sb, match.id, patch).catch(console.error);
      }
    },
    [mode, match]
  );

  const cancelMatch = useCallback(() => {
    if (!match) return;
    if (mode === "live") {
      const sb = getSupabase();
      if (sb) repo.cancelMatch(sb, match.id).catch(console.error);
      setMatch(null);
      setParticipations({});
      setResult(null);
    } else {
      // Démo : pas de base, on repart d'un match ouvert et vide.
      setMatch({ ...DEMO_MATCH, status: "open" });
      setParticipations({});
      setResult(null);
    }
    setRevealing(false);
  }, [mode, match]);

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
      revealing,
      actions: {
        setMyAvailability, setMyPositions, generate, endReveal, publish, resetGeneration,
        createMatch, updateMatch, cancelMatch,
      },
    };
  }, [
    ready, mode, currentUser, isAdmin, role, match, roster, participations, result, revealing,
    setMyAvailability, setMyPositions, generate, endReveal, publish, resetGeneration,
    createMatch, updateMatch, cancelMatch,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore doit être utilisé dans <StoreProvider>");
  return ctx;
}
