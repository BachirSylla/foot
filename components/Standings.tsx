"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import * as repo from "@/lib/repo";
import * as demoStore from "@/lib/demoStore";
import { useDemoState } from "@/lib/demoStore";
import { POINTS } from "@/lib/standings";
import type { StandingRow } from "@/lib/types";
import { Avatar } from "./ui";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Classement interne, agrégé sur les matchs terminés qui ont un score. */
export function Standings() {
  const auth = useAuth();
  const live = auth.configured;
  const demo = useDemoState();

  const [liveRows, setLiveRows] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    setLiveRows(await repo.fetchStandings(sb));
  }, []);

  useEffect(() => {
    if (!live) return;
    let active = true;
    (async () => {
      try {
        await reload();
        if (active) setError(null);
      } catch (err) {
        console.error(err);
        if (active) setError("Impossible de charger le classement.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [live, reload]);

  // En démo, le classement se recalcule à chaque changement du store en mémoire.
  const demoRows = useMemo(() => demoStore.getStandings(), [demo]);
  const rows = live ? liveRows : demoRows;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Classement</h1>
        <p className="mt-0.5 text-sm text-muted">
          Victoire {POINTS.win} pts · Nul {POINTS.draw} pt · Défaite {POINTS.loss}. Seuls les matchs
          terminés comptent.
        </p>
      </div>

      {error && <p className="card border-rose/30 bg-rose/5 p-4 text-[13px] text-rose">{error}</p>}

      {loading ? (
        <p className="card p-6 text-center text-sm text-muted">Chargement du classement…</p>
      ) : rows.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-3xl">🏆</p>
          <h2 className="mt-2 font-display text-lg font-bold">Aucun match terminé pour l'instant.</h2>
          <p className="mt-1 text-sm text-muted">
            Le classement se remplit dès que l'organisateur saisit un score.
          </p>
        </div>
      ) : (
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="label px-3 py-2.5 text-left font-semibold">#</th>
                  <th className="label px-1 py-2.5 text-left font-semibold">Joueur</th>
                  <th className="label px-2 py-2.5 text-right font-semibold">MJ</th>
                  <th className="label px-2 py-2.5 text-right font-semibold">V</th>
                  <th className="label px-2 py-2.5 text-right font-semibold">N</th>
                  <th className="label px-2 py-2.5 text-right font-semibold">D</th>
                  <th className="label px-3 py-2.5 text-right font-semibold">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row, i) => (
                  <tr key={row.userId} className={i < 3 ? "bg-lime/[0.04]" : undefined}>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center font-display font-bold text-muted">
                      {MEDALS[i] ?? i + 1}
                    </td>
                    <td className="px-1 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.name} size={30} accent={i < 3 ? "lime" : "muted"} />
                        <span className="min-w-0 truncate font-medium text-slate-100">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-right text-muted">{row.played}</td>
                    <td className="px-2 py-2.5 text-right text-slate-200">{row.wins}</td>
                    <td className="px-2 py-2.5 text-right text-slate-200">{row.draws}</td>
                    <td className="px-2 py-2.5 text-right text-slate-200">{row.losses}</td>
                    <td className="px-3 py-2.5 text-right font-display font-bold text-lime">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
