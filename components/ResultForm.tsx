"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { PlayerGoals, Team } from "@/lib/types";
import { useConfirm } from "./ConfirmDialog";

/**
 * Saisie du score par l'organisateur. Disponible dès que les équipes sont
 * publiées, et encore après : un match terminé reste corrigible (le formulaire
 * est pré-rempli et l'enregistrement fait un upsert).
 *
 * Sous le score, les buteurs — saisie OPTIONNELLE et non bloquante : la somme
 * des buts n'a pas à égaler le score (csc, oublis…). Ils n'entrent pas dans les
 * points du classement, seulement dans celui des meilleurs buteurs.
 */
export function ResultForm() {
  const { match, score, result, goals, actions } = useStore();
  const confirm = useConfirm();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [tally, setTally] = useState<Record<string, number>>({});

  // Pré-remplissage (score et buteurs) : on dépend du CONTENU du store et non de
  // la RÉFÉRENCE des objets. En live, le moindre événement temps réel — une
  // simple réponse de joueur — relit tout et rend de nouveaux objets ; sur la
  // référence, la saisie en cours de l'organisateur serait écrasée. Sur le
  // contenu, seule une vraie correction (venue d'un autre appareil) l'écrase.
  const scoreKey = score ? `${score.scoreA}-${score.scoreB}` : "";
  useEffect(() => {
    const [nextA, nextB] = scoreKey ? scoreKey.split("-") : ["", ""];
    setA(nextA);
    setB(nextB);
  }, [scoreKey]);

  const goalsRef = useRef(goals);
  goalsRef.current = goals;
  const goalsKey = Object.keys(goals)
    .sort()
    .map((userId) => `${userId}:${goals[userId]}`)
    .join("|");
  useEffect(() => {
    setTally(goalsRef.current);
  }, [goalsKey]);

  if (!match || (match.status !== "published" && match.status !== "finished")) return null;
  const finished = match.status === "finished";

  const scoreA = Number(a);
  const scoreB = Number(b);
  const valid =
    a !== "" && b !== "" && Number.isInteger(scoreA) && Number.isInteger(scoreB) && scoreA >= 0 && scoreB >= 0;

  function bump(userId: string, delta: number) {
    setTally((t) => ({ ...t, [userId]: Math.max(0, (t[userId] ?? 0) + delta) }));
  }

  /** Les buteurs à enregistrer : uniquement des joueurs des équipes du match. */
  function collectGoals(): PlayerGoals[] | undefined {
    if (!result) return undefined;
    const out: PlayerGoals[] = [];
    for (const team of [result.teamA, result.teamB]) {
      for (const { player } of team.players) {
        const n = tally[player.id] ?? 0;
        if (n > 0) out.push({ userId: player.id, goals: n });
      }
    }
    return out;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const ok = await confirm({
      message: "Enregistrer ce score ? Le match passera en terminé.",
      confirmLabel: "Enregistrer",
    });
    if (!ok) return;
    actions.saveResult(scoreA, scoreB, collectGoals());
  }

  async function reopen() {
    const ok = await confirm({
      message:
        "Rouvrir ce match ? Il repassera en « équipes publiées » et sortira du classement tant qu'il n'est pas re-terminé.",
      confirmLabel: "Rouvrir",
    });
    if (!ok) return;
    actions.reopenMatch();
  }

  return (
    <section className="card p-5">
      <h2 className="font-display text-lg font-bold">Résultat du match</h2>
      <p className="text-sm text-muted">
        {score
          ? "Score enregistré. Tu peux le corriger si besoin."
          : "Saisis le score final : le match passera en terminé et comptera au classement."}
      </p>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label mb-1.5 block text-cyan">Équipe A</span>
            <input
              className="input text-center font-display text-lg font-bold"
              type="number"
              min={0}
              inputMode="numeric"
              value={a}
              onChange={(e) => setA(e.target.value)}
              placeholder="0"
            />
          </label>
          <label className="block">
            <span className="label mb-1.5 block text-rose">Équipe B</span>
            <input
              className="input text-center font-display text-lg font-bold"
              type="number"
              min={0}
              inputMode="numeric"
              value={b}
              onChange={(e) => setB(e.target.value)}
              placeholder="0"
            />
          </label>
        </div>

        {result && (
          <div className="pt-1">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="label">Buteurs (optionnel)</span>
              <span className="text-[11px] text-muted">Les buts ne changent pas les points.</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ScorerColumn team={result.teamA} side="A" expected={a === "" ? null : scoreA} tally={tally} onBump={bump} />
              <ScorerColumn team={result.teamB} side="B" expected={b === "" ? null : scoreB} tally={tally} onBump={bump} />
            </div>
          </div>
        )}

        <button type="submit" disabled={!valid} className="btn-primary w-full py-3">
          {score ? "Corriger le résultat" : "Enregistrer le résultat"}
        </button>
      </form>

      {finished && (
        <button onClick={reopen} className="btn-ghost mt-3 w-full py-2.5 text-[13px]">
          Rouvrir le match
        </button>
      )}
    </section>
  );
}

/**
 * Les joueurs d'une équipe avec un sélecteur « – N + ». Le compteur en tête est
 * purement indicatif : rien n'empêche d'enregistrer un total différent du score.
 */
function ScorerColumn({
  team,
  side,
  expected,
  tally,
  onBump,
}: {
  team: Team;
  side: "A" | "B";
  expected: number | null;
  tally: Record<string, number>;
  onBump: (userId: string, delta: number) => void;
}) {
  const isA = side === "A";
  const sum = team.players.reduce((n, { player }) => n + (tally[player.id] ?? 0), 0);
  const matchesScore = expected !== null && sum === expected;

  return (
    <div className="rounded-xl border border-line bg-white/[0.02] p-2.5">
      <div className={`font-display text-[11px] font-bold ${isA ? "text-cyan" : "text-rose"}`}>
        ÉQUIPE {side}
      </div>
      <div className={`mt-0.5 text-[11px] ${matchesScore ? "text-lime" : "text-muted"}`}>
        {expected === null ? `${sum} but${sum > 1 ? "s" : ""} attribué${sum > 1 ? "s" : ""}` : `${sum} / ${expected} buts attribués`}
      </div>

      <ul className="mt-2 space-y-1">
        {team.players.map(({ player }) => {
          const n = tally[player.id] ?? 0;
          return (
            <li key={player.id} className="flex items-center gap-1">
              <span
                className={`min-w-0 flex-1 truncate text-[12px] ${n > 0 ? "font-semibold text-slate-100" : "text-slate-300"}`}
                title={player.name}
              >
                {player.name.split(" ")[0]}
              </span>
              <StepButton label={`Retirer un but à ${player.name}`} disabled={n === 0} onClick={() => onBump(player.id, -1)}>
                –
              </StepButton>
              <span
                className={`w-4 text-center font-display text-[12px] font-bold ${n > 0 ? "text-lime" : "text-muted"}`}
              >
                {n}
              </span>
              <StepButton label={`Ajouter un but à ${player.name}`} onClick={() => onBump(player.id, 1)}>
                +
              </StepButton>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line bg-white/[0.03] font-display text-[13px] font-bold leading-none text-slate-300 transition hover:bg-white/[0.08] active:scale-95 disabled:opacity-25 disabled:hover:bg-white/[0.03]"
    >
      {children}
    </button>
  );
}
