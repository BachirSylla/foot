"use client";

import { useStore } from "@/lib/store";
import { Avatar, PositionBadge } from "./ui";
import type { Availability } from "@/lib/types";

const DOT: Record<Availability, string> = {
  available: "bg-lime",
  maybe: "bg-cyan",
  unavailable: "bg-rose/70",
};

export function ParticipantsList() {
  const { roster, participations } = useStore();

  const rows = roster
    .map((p) => ({ player: p, part: participations[p.id] }))
    .sort((a, b) => {
    const order: Record<string, number> = { available: 0, maybe: 1, undefined: 2, unavailable: 3 };
    const sa = order[a.part?.status ?? "undefined"];
    const sb = order[b.part?.status ?? "undefined"];
    return sa - sb;
  });

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Qui vient ?</h2>
        <span className="chip">{roster.length} collègues</span>
      </div>

      <ul className="divide-y divide-line">
        {rows.map(({ player, part }) => {
          const status = part?.status;
          const accent = status === "available" ? "lime" : status === "maybe" ? "cyan" : "muted";
          return (
            <li key={player.id} className="flex items-center gap-3 py-2.5">
              <span className="relative">
                <Avatar name={player.name} size={38} accent={accent as any} />
                {status && (
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-base-700 ${DOT[status]}`}
                  />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-100">{player.name}</div>
                <div className="text-[11px] text-muted">
                  {status === "available"
                    ? "Présent"
                    : status === "maybe"
                    ? "Peut-être"
                    : status === "unavailable"
                    ? "Absent"
                    : "Pas encore répondu"}
                </div>
              </div>
              <div className="flex gap-1">
                {status === "available" &&
                  part!.positions.map((pos, i) => <PositionBadge key={pos} pos={pos} primary={i === 0} />)}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
