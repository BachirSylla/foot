"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useConfirm } from "./ConfirmDialog";
import { Avatar, PositionBadge } from "./ui";
import type { Availability } from "@/lib/types";

const DOT: Record<Availability, string> = {
  available: "bg-lime",
  maybe: "bg-cyan",
  unavailable: "bg-rose/70",
};

const STATUS_LABEL: Record<Availability, string> = {
  available: "Présent",
  maybe: "Peut-être",
  unavailable: "Absent",
};

const ORDER: Record<Availability, number> = { available: 0, maybe: 1, unavailable: 2 };

/**
 * Les réponses de CE match, et rien d'autre. On ne liste pas le roster global :
 * avec le join par lien / QR (un profil anonyme par appareil), il contient des
 * comptes d'autres matchs et des doublons qui n'ont rien à faire ici.
 */
export function ParticipantsList() {
  const { roster, participations, isAdmin, currentUser, actions } = useStore();
  const confirm = useConfirm();

  const rows = useMemo(() => {
    // Le roster ne sert plus qu'à retrouver un nom (user_id → profil).
    const names: Record<string, string> = {};
    for (const p of roster) names[p.id] = p.name;

    return Object.values(participations)
      .map((part) => ({ part, name: names[part.playerId] ?? "Joueur" }))
      .sort((a, b) => {
        const byStatus = ORDER[a.part.status] - ORDER[b.part.status];
        return byStatus !== 0 ? byStatus : a.name.localeCompare(b.name);
      });
  }, [roster, participations]);

  async function remove(userId: string, name: string) {
    const ok = await confirm({
      message: `Retirer ${name} de ce match ? Sa réponse sera supprimée.`,
      confirmLabel: "Retirer",
      tone: "danger",
    });
    if (!ok) return;
    actions.removeParticipation(userId);
  }

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Qui vient ?</h2>
        <span className="chip">
          {rows.length} réponse{rows.length > 1 ? "s" : ""}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">Personne n'a encore répondu à ce match.</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map(({ part, name }) => {
            const accent =
              part.status === "available" ? "lime" : part.status === "maybe" ? "cyan" : "muted";
            return (
              <li key={part.playerId} className="flex items-center gap-3 py-2.5">
                <span className="relative">
                  <Avatar name={name} size={38} accent={accent} />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-base-700 ${
                      DOT[part.status]
                    }`}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-100">
                    {name}
                    {currentUser?.id === part.playerId && (
                      <span className="ml-1.5 text-[11px] font-medium text-muted">(toi)</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted">{STATUS_LABEL[part.status]}</div>
                </div>
                <div className="flex items-center gap-1">
                  {part.status === "available" &&
                    part.positions.map((pos, i) => (
                      <PositionBadge key={pos} pos={pos} primary={i === 0} />
                    ))}
                  {isAdmin && (
                    <button
                      onClick={() => remove(part.playerId, name)}
                      title="Retirer ce joueur du match"
                      className="btn-ghost ml-1 shrink-0 px-2.5 py-1.5 text-[11px] hover:border-rose/40 hover:text-rose"
                    >
                      Retirer
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
