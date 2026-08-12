"use client";

import { useStore } from "@/lib/store";
import type { Position } from "@/lib/types";
import { MatchHero } from "./MatchHero";
import { PositionPicker } from "./PositionPicker";
import { ParticipantsList } from "./ParticipantsList";
import { PublishedTeams } from "./TeamsBoard";
import { Scoreboard } from "./Scoreboard";
import type { Availability } from "@/lib/types";

const AVAIL: { key: Availability; label: string; emoji: string; cls: string }[] = [
  { key: "available", label: "Je joue", emoji: "🟢", cls: "border-lime/60 bg-lime/10 text-lime shadow-glow" },
  { key: "maybe", label: "Peut-être", emoji: "🟡", cls: "border-cyan/50 bg-cyan/10 text-cyan" },
  { key: "unavailable", label: "Absent", emoji: "🔴", cls: "border-rose/50 bg-rose/10 text-rose" },
];

export function PlayerView() {
  const { match, currentUser, participations, actions } = useStore();

  // La page du match gère le cas « introuvable » ; ici le match existe toujours.
  if (!match) return null;

  const myPart = currentUser ? participations[currentUser.id] : undefined;
  const myStatus = myPart?.status ?? null;
  const myPositions = myPart?.positions ?? [];
  const firstName = currentUser?.name.split(" ")[0] ?? "toi";

  return (
    <div className="space-y-5">
      <MatchHero />

      {match.status === "finished" ? (
        <>
          <Scoreboard />
          <PublishedTeams />
        </>
      ) : match.status === "published" ? (
        <PublishedTeams />
      ) : (
        <section className="card p-5">
          <div>
            <h2 className="font-display text-lg font-bold">Ta réponse</h2>
            <p className="text-sm text-muted">Salut {firstName}, tu es des nôtres vendredi ?</p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {AVAIL.map((a) => {
              const active = myStatus === a.key;
              return (
                <button
                  key={a.key}
                  onClick={() => actions.setMyAvailability(a.key)}
                  className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-sm font-semibold transition-all active:scale-[0.98] ${
                    active ? a.cls : "border-line bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="text-lg">{a.emoji}</span>
                  {a.label}
                </button>
              );
            })}
          </div>

          {myStatus === "available" && (
            <div className="mt-6 animate-[fadeIn_.2s_ease]">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="label">Tes postes pour ce match</span>
                <span className="text-[11px] text-muted">{myPositions.length}/2</span>
              </div>
              <PositionPicker
                value={myPositions}
                onChange={(positions: Position[]) => actions.setMyPositions(positions)}
              />
              {myPositions.length === 0 && (
                <p className="mt-3 text-center text-[13px] text-rose/90">
                  Choisis au moins un poste pour valider ta présence.
                </p>
              )}
              {myPositions.length > 0 && (
                <p className="mt-3 text-center text-[13px] text-lime">
                  ✓ C'est noté ! Rendez-vous vendredi. Les équipes seront révélées par l'organisateur.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <ParticipantsList />
    </div>
  );
}
