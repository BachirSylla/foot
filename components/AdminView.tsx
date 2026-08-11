"use client";

import { useState } from "react";
import { useStore, type GenMode } from "@/lib/store";
import type { Match } from "@/lib/types";
import { MatchHero } from "./MatchHero";
import { ShareMatch } from "./ShareMatch";
import { TeamsBoard } from "./TeamsBoard";
import { Avatar, PositionBadge } from "./ui";

export function AdminView() {
  const { match, mode, result, availablePlayers, actions } = useStore();
  const [genMode, setGenMode] = useState<GenMode>("balanced");

  if (!match) {
    // En live, l'admin doit créer le premier match.
    return <CreateMatchForm />;
  }

  const enough = availablePlayers.length >= 4;
  const hasResult = !!result && match.status !== "open";

  return (
    <div className="space-y-5">
      <MatchHero />

      <ShareMatch />

      <ManageMatch match={match} />

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

      {hasResult && result && (
        <>
          <TeamsBoard result={result} locked={match.status === "published"} />

          {match.status !== "published" ? (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => actions.resetGeneration()} className="btn-ghost py-3">Annuler</button>
              <button onClick={() => actions.publish()} className="btn-primary py-3">🔒 Publier les équipes</button>
            </div>
          ) : (
            <div className="card flex items-center gap-3 border-lime/30 bg-lime/5 p-4">
              <span className="text-xl">🔒</span>
              <p className="text-sm text-lime">
                Composition définitive publiée. Tous les joueurs la voient maintenant — impossible de la changer.
              </p>
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

function CreateMatchForm() {
  const { actions } = useStore();
  return (
    <section className="card p-5">
      <h2 className="font-display text-lg font-bold">Créer le prochain match</h2>
      <p className="text-sm text-muted">Aucun match en cours. Lance-en un pour ouvrir les inscriptions.</p>
      <MatchForm mode="create" onSubmit={(v) => actions.createMatch(v)} />
    </section>
  );
}

function ManageMatch({ match }: { match: Match }) {
  const { actions } = useStore();
  const [editing, setEditing] = useState(false);

  function cancel() {
    if (!window.confirm("Annuler le match ? Les réponses et la composition seront perdues.")) return;
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

export interface MatchFormValues {
  title: string;
  startsAt: string;
  location: string;
  maxPlayers: number;
}

/** Découpe un ISO en valeurs locales pour les champs `date` / `time`. */
function splitLocal(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** Formulaire partagé par la création et l'édition d'un match. */
function MatchForm({
  mode,
  initial,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: Match;
  onSubmit: (values: MatchFormValues) => void;
  onCancel?: () => void;
}) {
  const start = initial ? splitLocal(initial.startsAt) : null;
  const [title, setTitle] = useState(initial?.title ?? "Match du vendredi");
  const [date, setDate] = useState(start?.date ?? "");
  const [time, setTime] = useState(start?.time ?? "18:00");
  const [location, setLocation] = useState(initial?.location ?? "Terrain de l'entreprise");
  const [maxPlayers, setMaxPlayers] = useState(initial?.maxPlayers ?? 12);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    const startsAt = new Date(`${date}T${time}:00`).toISOString();
    onSubmit({ title, startsAt, location, maxPlayers });
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <label className="block">
        <span className="label mb-1.5 block">Titre</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label mb-1.5 block">Date</span>
          <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="label mb-1.5 block">Heure</span>
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <label className="block">
        <span className="label mb-1.5 block">Lieu</span>
        <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
      </label>
      <label className="block">
        <span className="label mb-1.5 block">Nombre de joueurs visé</span>
        <input className="input" type="number" min={4} max={30} value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} />
      </label>
      {mode === "create" ? (
        <button type="submit" className="btn-primary w-full py-3">Créer le match</button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="btn-ghost py-3">Annuler</button>
          <button type="submit" className="btn-primary py-3">Enregistrer</button>
        </div>
      )}
    </form>
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
