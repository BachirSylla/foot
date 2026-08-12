"use client";

import type { Position } from "@/lib/types";
import { POSITION_SHORT } from "@/lib/types";
import { initials } from "@/lib/mock";

const POS_COLOR: Record<Position, string> = {
  GK: "text-amber-300 border-amber-300/30 bg-amber-300/10",
  DEF: "text-cyan border-cyan/30 bg-cyan/10",
  MID: "text-lime border-lime/30 bg-lime/10",
  FWD: "text-rose border-rose/30 bg-rose/10",
};

export function PositionBadge({ pos, primary }: { pos: Position; primary?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${POS_COLOR[pos]} ${
        primary ? "" : "opacity-70"
      }`}
    >
      {POSITION_SHORT[pos]}
    </span>
  );
}

export function Avatar({
  name,
  size = 40,
  accent = "lime",
}: {
  name: string;
  size?: number;
  accent?: "lime" | "cyan" | "rose" | "muted";
}) {
  const ring =
    accent === "cyan"
      ? "ring-cyan/40 text-cyan"
      : accent === "rose"
      ? "ring-rose/40 text-rose"
      : accent === "muted"
      ? "ring-white/15 text-slate-300"
      : "ring-lime/40 text-lime";
  return (
    <span
      className={`grid place-items-center rounded-full bg-ink-600 font-display font-bold ring-1 ${ring}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

/** Écran d'attente (chargement de la session ou d'un match). */
export function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative grid h-16 w-16 place-items-center">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-lime/20 border-t-lime" />
          <span className="text-2xl">⚽</span>
        </div>
        <span className="text-sm text-muted">Chargement…</span>
      </div>
    </div>
  );
}

export function StatPill({
  value,
  label,
  tone = "default",
}: {
  value: React.ReactNode;
  label: string;
  tone?: "default" | "lime" | "cyan" | "rose";
}) {
  const color =
    tone === "lime"
      ? "text-lime"
      : tone === "cyan"
      ? "text-cyan"
      : tone === "rose"
      ? "text-rose"
      : "text-slate-100";
  return (
    <div className="flex flex-col">
      <span className={`font-display text-2xl font-bold leading-none ${color}`}>{value}</span>
      <span className="label mt-1">{label}</span>
    </div>
  );
}
