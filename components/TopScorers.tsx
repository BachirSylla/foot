"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import * as repo from "@/lib/repo";
import * as demoStore from "@/lib/demoStore";
import { useDemoState } from "@/lib/demoStore";
import type { ScorerRow } from "@/lib/types";
import { Avatar } from "./ui";

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Classement des buteurs — SÉPARÉ du classement principal : les buts ne donnent
 * aucun point, ils ne font que ce tableau. Même règle de statut que les points :
 * seuls les matchs terminés comptent.
 */
export function TopScorers() {
  const auth = useAuth();
  const live = auth.configured;
  const demo = useDemoState();

  const [liveRows, setLiveRows] = useState<ScorerRow[]>([]);
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    setLiveRows(await repo.fetchTopScorers(sb));
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
        if (active) setError("Impossible de charger le classement des buteurs.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [live, reload]);

  // En démo, le classement se recalcule à chaque changement du store en mémoire.
  const demoRows = useMemo(() => demoStore.getTopScorers(), [demo]);
  const rows = live ? liveRows : demoRows;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight">⚽ Meilleurs buteurs</h2>
        <p className="mt-0.5 text-sm text-muted">
          Les buts n'entrent pas dans les points : ce tableau est à part.
        </p>
      </div>

      {error && <p className="card border-rose/30 bg-rose/5 p-4 text-[13px] text-rose">{error}</p>}

      {loading ? (
        <p className="card p-6 text-center text-sm text-muted">Chargement des buteurs…</p>
      ) : rows.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">
          Aucun but enregistré pour l'instant.
        </p>
      ) : (
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="label px-3 py-2.5 text-left font-semibold">#</th>
                  <th className="label px-1 py-2.5 text-left font-semibold">Joueur</th>
                  <th className="label px-3 py-2.5 text-right font-semibold">Buts</th>
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
                    <td className="px-3 py-2.5 text-right font-display font-bold text-lime">
                      {row.goals}
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
