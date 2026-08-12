"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useConfirm } from "./ConfirmDialog";

/**
 * Saisie du score par l'organisateur. Disponible dès que les équipes sont
 * publiées, et encore après : un match terminé reste corrigible (le formulaire
 * est pré-rempli et l'enregistrement fait un upsert).
 */
export function ResultForm() {
  const { match, score, actions } = useStore();
  const confirm = useConfirm();
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  // Pré-remplissage : le score courant (et ses corrections venues du temps réel).
  useEffect(() => {
    setA(score ? String(score.scoreA) : "");
    setB(score ? String(score.scoreB) : "");
  }, [score]);

  if (!match || (match.status !== "published" && match.status !== "finished")) return null;
  const finished = match.status === "finished";

  const scoreA = Number(a);
  const scoreB = Number(b);
  const valid =
    a !== "" && b !== "" && Number.isInteger(scoreA) && Number.isInteger(scoreB) && scoreA >= 0 && scoreB >= 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const ok = await confirm({
      message: "Enregistrer ce score ? Le match passera en terminé.",
      confirmLabel: "Enregistrer",
    });
    if (!ok) return;
    actions.saveResult(scoreA, scoreB);
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
