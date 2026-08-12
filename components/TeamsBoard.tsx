"use client";

import { motion } from "framer-motion";
import type { GenerationResult, Team, Position } from "@/lib/types";
import { POSITION_LABEL } from "@/lib/types";
import { Avatar } from "./ui";
import { useStore } from "@/lib/store";

const POS_ORDER: Position[] = ["GK", "DEF", "MID", "FWD"];

function sortByPos(team: Team) {
  return [...team.players].sort(
    (a, b) => POS_ORDER.indexOf(a.assignedPosition) - POS_ORDER.indexOf(b.assignedPosition)
  );
}

function TeamColumn({
  team,
  side,
  animate,
}: {
  team: Team;
  side: "A" | "B";
  animate?: boolean;
}) {
  const isA = side === "A";
  const accent = isA ? "cyan" : "rose";
  const players = sortByPos(team);

  return (
    <div
      className={`card relative overflow-hidden p-4 ${
        isA ? "shadow-glow-cyan" : "shadow-glow-rose"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 blur-2xl ${
          isA ? "bg-cyan/20" : "bg-rose/20"
        }`}
      />
      <div className="relative mb-3 flex items-center gap-2">
        <span
          className={`grid h-8 w-8 place-items-center rounded-lg font-display text-sm font-bold ${
            isA ? "bg-cyan/15 text-cyan" : "bg-rose/15 text-rose"
          }`}
        >
          {side}
        </span>
        <div className="leading-tight">
          <div className="font-display text-sm font-bold">Équipe {side}</div>
          <div className="text-[11px] text-muted">{players.length} joueurs</div>
        </div>
      </div>

      <ul className="relative space-y-1.5">
        {players.map((ap, i) => (
          <motion.li
            key={ap.player.id}
            initial={animate ? { opacity: 0, x: isA ? -14 : 14 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: animate ? 0.12 * i : 0, type: "spring", stiffness: 260, damping: 22 }}
            className="flex items-center gap-2.5 rounded-lg border border-line bg-white/[0.02] px-2 py-1.5"
          >
            <Avatar name={ap.player.name} size={30} accent={accent as any} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium" title={ap.player.name}>
              {ap.player.name.split(" ")[0]}
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                isA ? "bg-cyan/10 text-cyan" : "bg-rose/10 text-rose"
              }`}
              title={POSITION_LABEL[ap.assignedPosition]}
            >
              {ap.assignedPosition}
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export function TeamsBoard({
  result,
  locked,
  animate,
}: {
  result: GenerationResult;
  locked?: boolean;
  animate?: boolean;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-center gap-3">
        <span className="font-display text-sm font-bold text-cyan">ÉQUIPE A</span>
        <span className="grid h-7 w-7 place-items-center rounded-full border border-line bg-ink-700 text-[11px] font-bold text-muted">
          VS
        </span>
        <span className="font-display text-sm font-bold text-rose">ÉQUIPE B</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TeamColumn team={result.teamA} side="A" animate={animate} />
        <TeamColumn team={result.teamB} side="B" animate={animate} />
      </div>

      {result.warnings.length > 0 && !locked && (
        <ul className="mt-3 space-y-1">
          {result.warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] text-amber-300/90">
              <span>⚠️</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Vue lecture seule pour les joueurs, une fois la compo publiée. */
export function PublishedTeams() {
  const { result } = useStore();
  if (!result) return null;
  return (
    <div className="space-y-3">
      <div className="card flex items-center gap-3 border-lime/30 bg-lime/5 p-4">
        <span className="text-xl">🎉</span>
        <p className="text-sm text-lime">Les équipes sont tombées ! Bon match vendredi.</p>
      </div>
      <TeamsBoard result={result} locked />
    </div>
  );
}
