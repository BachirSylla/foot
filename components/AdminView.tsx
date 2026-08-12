"use client";

import { useState } from "react";
import { useStore, type GenMode } from "@/lib/store";
import { useConfirm } from "./ConfirmDialog";
import type { Match } from "@/lib/types";
import { MatchHero } from "./MatchHero";
import { ShareMatch } from "./ShareMatch";
import { TeamsBoard } from "./TeamsBoard";
import { MatchForm } from "./MatchForm";
import { ResultForm } from "./ResultForm";
import { Scoreboard } from "./Scoreboard";
import { Avatar, PositionBadge } from "./ui";

export function AdminView() {
  const { match, mode, result, availablePlayers, actions } = useStore();
  const confirm = useConfirm();
  const [genMode, setGenMode] = useState<GenMode>("balanced");

  // La page du match garantit `match` non nul (sinon elle affiche « introuvable »).
  if (!match) return null;

  const enough = availablePlayers.length >= 4;
  const hasResult = !!result && match.status !== "open";
  const published = match.status === "published";
  const finished = match.status === "finished";

  // Déverrouiller retire la composition de l'écran des joueurs : geste volontaire,
  // jamais un clic distrait — c'est ce qui rend la promesse de verrouillage crédible.
  // La compo est conservée : l'organisateur peut la republier telle quelle.
  async function unlock() {
    const ok = await confirm({
      message: "Les joueurs ne verront plus les équipes le temps de re-générer.",
      confirmLabel: "Déverrouiller",
    });
    if (!ok) return;
    actions.unpublish();
  }

  return (
    <div className="space-y-5">
      <MatchHero />

      {/* Un match joué ne s'invite plus, ne se modifie plus, ne s'annule plus :
          pour y revenir, il faut passer par « Rouvrir le match ». */}
      {!finished && (
        <>
          <ShareMatch />
          <ManageMatch match={match} />
        </>
      )}

      <ResultForm />

      {!published && !finished && (
        <section className="card p-5">
          <h2 className="font-display text-lg font-bold">Générer les équipes</h2>
          <p className="text-sm text-muted">
            {availablePlayers.length} joueur{availablePlayers.length > 1 ? "s" : ""} prêt
            {availablePlayers.length > 1 ? "s" : ""} (dispo + postes déclarés).
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <ModeCard active={genMode === "balanced"} onClick={() => setGenMode("balanced")} emoji="🎯" title="Équilibré" desc="Postes couverts, équipes cohérentes." />
            <ModeCard active={genMode === "fun"} onClick={() => setGenMode("fun")} emoji="🎲" title="Rapide / fun" desc="Tirage express bien réparti." />
          </div>

          <button disabled={!enough} onClick={() => actions.generate(genMode)} className="btn-primary mt-4 w-full py-3 text-base">
            {hasResult ? "🎲 Relancer le tirage" : "🎲 Générer les équipes"}
          </button>
          {!enough && <p className="mt-2 text-center text-[13px] text-rose/90">Il faut au moins 4 joueurs disponibles avec un poste.</p>}
        </section>
      )}

      {hasResult && result && (
        <>
          {finished && <Scoreboard />}

          <TeamsBoard result={result} locked={published || finished} />

          {!published && !finished && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => actions.resetGeneration()} className="btn-ghost py-3">Annuler</button>
              <button onClick={() => actions.publish()} className="btn-primary py-3">🔒 Publier les équipes</button>
            </div>
          )}

          {published && (
            <div className="card border-lime/30 bg-lime/5 p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔒</span>
                <p className="text-sm text-lime">
                  Composition définitive publiée. Tous les joueurs la voient maintenant.
                </p>
              </div>
              <button onClick={unlock} className="btn-ghost mt-3 w-full py-2.5 text-[13px]">
                🔓 Déverrouiller les équipes
              </button>
            </div>
          )}
        </>
      )}

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Joueurs prêts</h2>
          <span className="chip border-lime/30 text-lime">{availablePlayers.length}</span>
        </div>
        {availablePlayers.length === 0 ? (
          <p className="text-sm text-muted">Personne n'a encore confirmé{mode === "live" ? " sa présence" : ""}.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {availablePlayers.map((p) => (
              <li key={p.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-white/[0.02] p-2">
                <Avatar name={p.name} size={32} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{p.name.split(" ")[0]}</span>
                <div className="flex gap-1">
                  {p.positions.map((pos, i) => (
                    <PositionBadge key={pos} pos={pos} primary={i === 0} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ManageMatch({ match }: { match: Match }) {
  const { actions } = useStore();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);

  async function cancel() {
    const ok = await confirm({
      title: "Annuler le match",
      message: "Le match sera annulé pour tout le monde.",
      confirmLabel: "Oui, annuler",
      cancelLabel: "Retour",
      tone: "danger",
    });
    if (!ok) return;
    actions.cancelMatch();
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Gérer le match</h2>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-ghost px-4 py-2 text-sm">
            ✏️ Modifier
          </button>
        )}
      </div>

      {editing ? (
        <MatchForm
          mode="edit"
          initial={match}
          onSubmit={(v) => {
            actions.updateMatch(v);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            Change la date, le lieu ou l'effectif visé — ou annule le match.
          </p>
          <button onClick={cancel} className="btn-danger mt-4 w-full py-3">
            Annuler le match
          </button>
        </>
      )}
    </section>
  );
}

function ModeCard({ active, onClick, emoji, title, desc }: { active: boolean; onClick: () => void; emoji: string; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-all ${
        active ? "border-lime/60 bg-lime/10 shadow-glow" : "border-line bg-white/[0.02] hover:bg-white/[0.05]"
      }`}
    >
      <span className="text-lg">{emoji}</span>
      <span className={`text-sm font-semibold ${active ? "text-lime" : "text-slate-200"}`}>{title}</span>
      <span className="text-[11px] leading-snug text-muted">{desc}</span>
    </button>
  );
}
