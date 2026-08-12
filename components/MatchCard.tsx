"use client";

import Link from "next/link";
import type { Availability, Match, MatchScore } from "@/lib/types";
import { STATUS_CHIP, STATUS_LABEL, formatMatchDate } from "@/lib/matchDisplay";

/** Une ligne de l'accueil : tout le nécessaire pour choisir un match d'un coup d'œil. */
export function MatchCard({
  match,
  available,
  myStatus,
  score,
}: {
  match: Match;
  available: number;
  /** Ma réponse pour ce match (`undefined` = pas encore répondu). */
  myStatus?: Availability;
  /** Score final, pour un match terminé. */
  score?: MatchScore;
}) {
  const { day, dayNum, month, time } = formatMatchDate(match.startsAt);
  const past = match.status === "finished" || match.status === "cancelled";

  return (
    <Link
      href={`/m/${match.id}`}
      className={`card block p-4 transition-all hover:border-lime/30 hover:bg-ink-700/90 active:scale-[0.995] ${
        past ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Couleur explicite : un titre de carte ne doit jamais dépendre de
              l'héritage pour rester lisible sur le fond sombre. */}
          <h3 className="truncate font-display text-lg font-bold tracking-tight text-slate-100">
            {match.title}
          </h3>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {day} {dayNum} {month} · {time} · {match.location}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={`chip whitespace-nowrap ${STATUS_CHIP[match.status]}`}>
            {STATUS_LABEL[match.status]}
          </span>
          {match.status === "finished" && score && (
            <span className="font-display text-lg font-bold leading-none">
              <span className="text-cyan">{score.scoreA}</span>
              <span className="mx-1 text-muted">–</span>
              <span className="text-rose">{score.scoreB}</span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="text-[13px] text-muted">
          <span className="font-display font-bold text-lime">{available}</span> présent
          {available > 1 ? "s" : ""} · objectif {match.maxPlayers}
        </span>
        {!past && (
          <span
            className={`text-[11px] font-semibold ${myStatus ? "text-lime" : "text-cyan"}`}
          >
            {myStatus ? "✓ Répondu" : "● À répondre"}
          </span>
        )}
      </div>
    </Link>
  );
}
