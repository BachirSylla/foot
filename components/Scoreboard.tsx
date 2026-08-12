"use client";

import { useStore } from "@/lib/store";

/**
 * Bandeau de score d'un match terminé, visible par tout le monde (joueurs comme
 * organisateur). Mêmes accents que le TeamsBoard : cyan pour A, rose pour B.
 */
export function Scoreboard() {
  const { score } = useStore();
  if (!score) return null;

  const { scoreA, scoreB } = score;
  const aWins = scoreA > scoreB;
  const bWins = scoreB > scoreA;
  const verdict = aWins ? "Victoire de l'équipe A" : bWins ? "Victoire de l'équipe B" : "Match nul";

  return (
    <section className="card relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-cyan/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-rose/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-center gap-2">
          <span className="chip border-lime/30 bg-lime/5 text-lime">🏁 Match terminé</span>
        </div>

        <div className="mt-4 grid grid-cols-3 items-center gap-2">
          <div className="text-center">
            <div className="font-display text-sm font-bold text-cyan">ÉQUIPE A</div>
            <div
              className={`font-display text-4xl font-bold leading-none ${
                aWins ? "text-cyan" : "text-slate-100"
              }`}
            >
              {scoreA}
            </div>
          </div>

          <div className="text-center font-display text-2xl font-bold text-muted">–</div>

          <div className="text-center">
            <div className="font-display text-sm font-bold text-rose">ÉQUIPE B</div>
            <div
              className={`font-display text-4xl font-bold leading-none ${
                bWins ? "text-rose" : "text-slate-100"
              }`}
            >
              {scoreB}
            </div>
          </div>
        </div>

        <p className="mt-4 border-t border-line pt-3 text-center text-[13px] text-muted">{verdict}</p>
      </div>
    </section>
  );
}
