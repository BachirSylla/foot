"use client";

import type { Position } from "@/lib/types";
import { ALL_POSITIONS, POSITION_LABEL } from "@/lib/types";

const ICON: Record<Position, string> = { GK: "🧤", DEF: "🛡️", MID: "⚙️", FWD: "⚡" };

export function PositionPicker({
  value,
  onChange,
  max = 2,
}: {
  value: Position[];
  onChange: (next: Position[]) => void;
  max?: number;
}) {
  function toggle(pos: Position) {
    if (value.includes(pos)) {
      onChange(value.filter((p) => p !== pos));
    } else {
      const next = [...value, pos];
      onChange(next.slice(-max)); // garde les `max` derniers -> remplace le plus ancien
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {ALL_POSITIONS.map((pos) => {
        const active = value.includes(pos);
        const rank = value.indexOf(pos);
        return (
          <button
            key={pos}
            onClick={() => toggle(pos)}
            className={`group relative flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${
              active
                ? "border-lime/60 bg-lime/10 shadow-glow"
                : "border-line bg-white/[0.02] hover:bg-white/[0.05]"
            }`}
          >
            <span className="text-xl">{ICON[pos]}</span>
            <span className="flex flex-col">
              <span className={`text-sm font-semibold ${active ? "text-lime" : "text-slate-200"}`}>
                {POSITION_LABEL[pos]}
              </span>
              <span className="text-[11px] text-muted">
                {active ? (rank === 0 ? "Poste principal" : "Poste secondaire") : "Disponible"}
              </span>
            </span>
            {active && (
              <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-lime text-[11px] font-bold text-ink-800">
                {rank + 1}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
