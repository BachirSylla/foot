"use client";

import { useStore } from "@/lib/store";
import { STATUS_LABEL, STATUS_TONE, formatMatchDate } from "@/lib/matchDisplay";
import { StatPill } from "./ui";

export function MatchHero() {
  const { match, counts } = useStore();
  if (!match) return null;
  const { day, dayNum, month, time } = formatMatchDate(match.startsAt);

  const statusLabel = STATUS_LABEL[match.status];
  const statusTone = STATUS_TONE[match.status];

  return (
    <section className="card pitch-lines relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lime/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="chip border-lime/30 bg-lime/5 text-lime">⚽ Football · Entre nous</span>
          <span className={`text-[11px] font-semibold ${statusTone}`}>● {statusLabel}</span>
        </div>

        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {match.title}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {day} {dayNum} {month} · {time} · {match.location}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
          <StatPill value={counts.available} label="Présents" tone="lime" />
          <StatPill value={counts.maybe} label="Peut-être" tone="cyan" />
          <StatPill value={`${counts.available}/${match.maxPlayers}`} label="Objectif" />
        </div>
      </div>
    </section>
  );
}
