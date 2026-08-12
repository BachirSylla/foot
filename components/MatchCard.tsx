"use client";

import Link from "next/link";
import type { Availability, Match } from "@/lib/types";
import { STATUS_CHIP, STATUS_LABEL, formatMatchDate } from "@/lib/matchDisplay";

/** Une ligne de l'accueil : tout le nécessaire pour choisir un match d'un coup d'œil. */
export function MatchCard({
  match,
  available,
  myStatus,
}: {
  match: Match;
  available: number;
  /** Ma réponse pour ce match (`undefined` = pas encore répondu). */
  myStatus?: Availability;
}) {
  const { day, dayNum, month, time } = formatMatchDate(match.startsAt);
  const past = match.status === "finished" || match.status === "cancelled";

  return (
    <Link
      href={`/m/${match.id}`}
      className={`card block p-4 transition-all hover:border-lime/30 hover:bg-base-700/90 active:scale-[0.995] ${
        past ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-bold tracking-tight">{match.title}</h3>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {day} {dayNum} {month} · {time} · {match.location}
          </p>
        </div>
        <span className={`chip shrink-0 whitespace-nowrap ${STATUS_CHIP[match.status]}`}>
          {STATUS_LABEL[match.status]}
        </span>
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
