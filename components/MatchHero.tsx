"use client";

import { useStore } from "@/lib/store";
import { StatPill } from "./ui";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function formatDate(iso: string) {
  const d = new Date(iso);
  const day = DAYS[d.getDay()];
  const time = `${d.getHours()}h${String(d.getMinutes()).padStart(2, "0")}`;
  return { day, dayNum: d.getDate(), month: MONTHS[d.getMonth()], time };
}

export function MatchHero() {
  const { match, counts } = useStore();
  if (!match) return null;
  const { day, dayNum, month, time } = formatDate(match.startsAt);

  const statusLabel =
    match.status === "published" ? "Équipes publiées" : match.status === "generated" ? "Composition prête" : "Inscriptions ouvertes";
  const statusTone =
    match.status === "published" ? "text-lime" : match.status === "generated" ? "text-cyan" : "text-slate-300";

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
