"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import * as repo from "@/lib/repo";
import * as demoStore from "@/lib/demoStore";
import { useDemoState } from "@/lib/demoStore";
import { CURRENT_USER_ID } from "@/lib/mock";
import { isUpcoming } from "@/lib/matchDisplay";
import type { Availability, Match, MatchScore } from "@/lib/types";
import { MatchCard } from "./MatchCard";
import { MatchForm, type MatchFormValues } from "./MatchForm";
import { useConfirm } from "./ConfirmDialog";

type Counts = Record<string, { available: number; maybe: number }>;
type Mine = Record<string, Availability>;
type Scores = Record<string, MatchScore>;

/**
 * Accueil : tous les matchs, à venir puis passés. Plusieurs matchs peuvent être
 * ouverts en même temps (mardi + vendredi) — chacun a sa page et son QR.
 */
export function MatchList() {
  const auth = useAuth();
  const router = useRouter();
  const confirm = useConfirm();
  const live = auth.configured;

  const demo = useDemoState();
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [liveCounts, setLiveCounts] = useState<Counts>({});
  const [liveMine, setLiveMine] = useState<Mine>({});
  const [liveScores, setLiveScores] = useState<Scores>({});
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const isAdmin = live ? auth.isAdmin : true;
  const userId = live ? auth.session?.user.id : CURRENT_USER_ID;

  const reload = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const matches = await repo.listMatches(sb);
    setLiveMatches(matches);
    const ids = matches.map((m) => m.id);
    const [counts, mine, scores] = await Promise.all([
      repo.fetchParticipationCounts(sb, ids),
      userId ? repo.fetchMyParticipations(sb, userId, ids) : Promise.resolve({} as Mine),
      repo.fetchResults(sb, ids),
    ]);
    setLiveCounts(counts);
    setLiveMine(mine);
    setLiveScores(scores);
  }, [userId]);

  useEffect(() => {
    if (!live) return;
    let active = true;
    (async () => {
      try {
        await reload();
        if (active) setError(null);
      } catch (err) {
        console.error(err);
        if (active) setError("Impossible de charger les matchs.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [live, reload]);

  // Temps réel : un match créé / modifié / annulé ailleurs apparaît ici sans refresh.
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  useEffect(() => {
    if (!live || !auth.session) return;
    const sb = getSupabase();
    if (!sb) return;
    const channel = sb
      .channel("matches-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () =>
        reloadRef.current().catch(console.error)
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [live, auth.session]);

  // En démo, tout est dérivé du store en mémoire.
  const demoCounts = useMemo<Counts>(() => {
    const out: Counts = {};
    for (const m of demo.matches) {
      const parts = Object.values(demo.participationsByMatch[m.id] ?? {});
      out[m.id] = {
        available: parts.filter((p) => p.status === "available").length,
        maybe: parts.filter((p) => p.status === "maybe").length,
      };
    }
    return out;
  }, [demo]);

  const demoMine = useMemo<Mine>(() => {
    const out: Mine = {};
    for (const m of demo.matches) {
      const status = demo.participationsByMatch[m.id]?.[CURRENT_USER_ID]?.status;
      if (status) out[m.id] = status;
    }
    return out;
  }, [demo]);

  const matches = live ? liveMatches : demoStore.listMatches();
  const counts = live ? liveCounts : demoCounts;
  const mine = live ? liveMine : demoMine;
  const scores = live ? liveScores : demo.scoreByMatch;

  const upcoming = matches.filter((m) => isUpcoming(m.status));
  const past = matches.filter((m) => !isUpcoming(m.status));

  async function openCreate() {
    // Message volontairement fidèle au modèle multi-matchs : rien n'est archivé,
    // les matchs déjà ouverts le restent.
    const ok = await confirm({
      message: "Créer un nouveau match ? Il s'ajoutera aux matchs à venir, sans toucher aux autres.",
      confirmLabel: "Créer",
    });
    if (ok) setCreating(true);
  }

  async function create(values: MatchFormValues) {
    if (!live) {
      const match = demoStore.createMatch(values);
      setCreating(false);
      router.push(`/m/${match.id}`);
      return;
    }
    const sb = getSupabase();
    if (!sb || !auth.session) return;
    try {
      const match = await repo.createMatch(sb, values, auth.session.user.id);
      setCreating(false);
      router.push(`/m/${match.id}`);
    } catch (err) {
      console.error(err);
      setError("La création du match a échoué.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Les matchs</h1>
          <p className="mt-0.5 text-sm text-muted">
            Ouvre un match pour répondre — ou pour l'organiser.
          </p>
        </div>
        {isAdmin && !creating && (
          <button onClick={openCreate} className="btn-primary shrink-0 px-4 py-2.5">
            ➕ Nouveau match
          </button>
        )}
      </div>

      {error && (
        <p className="card border-rose/30 bg-rose/5 p-4 text-[13px] text-rose">{error}</p>
      )}

      {creating && (
        <section className="card p-5">
          <h2 className="font-display text-lg font-bold">Nouveau match</h2>
          <p className="text-sm text-muted">Il s'ouvre aux inscriptions dès sa création.</p>
          <MatchForm mode="create" onSubmit={create} onCancel={() => setCreating(false)} />
        </section>
      )}

      {loading ? (
        <p className="card p-6 text-center text-sm text-muted">Chargement des matchs…</p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="label">À venir</h2>
            {upcoming.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-3xl">📅</p>
                <h3 className="mt-2 font-display text-lg font-bold">Aucun match programmé</h3>
                <p className="mt-1 text-sm text-muted">
                  {isAdmin
                    ? "Crée le prochain match pour ouvrir les inscriptions."
                    : "Reviens quand l'organisateur aura créé le prochain match."}
                </p>
              </div>
            ) : (
              upcoming.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  available={counts[m.id]?.available ?? 0}
                  myStatus={mine[m.id]}
                  score={scores[m.id]}
                />
              ))
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-3">
              <button
                onClick={() => setShowPast((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="label">Passés · {past.length}</span>
                <span className="text-xs text-muted">{showPast ? "Masquer ▲" : "Afficher ▼"}</span>
              </button>
              {showPast &&
                past.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    available={counts[m.id]?.available ?? 0}
                    myStatus={mine[m.id]}
                    score={scores[m.id]}
                  />
                ))}
            </section>
          )}

          {/* Raccourci vers le classement (aussi accessible depuis l'en-tête). */}
          <Link
            href="/classement"
            className="card flex items-center justify-between p-4 transition-all hover:border-lime/30 hover:bg-ink-700/90"
          >
            <span className="flex items-center gap-2.5">
              <span className="text-xl">🏆</span>
              <span>
                <span className="block text-sm font-semibold text-slate-100">Classement interne</span>
                <span className="block text-[12px] text-muted">
                  Points, victoires et matchs joués
                </span>
              </span>
            </span>
            <span className="text-[13px] text-muted">Voir →</span>
          </Link>
        </>
      )}
    </div>
  );
}
