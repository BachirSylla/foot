"use client";

import { useState } from "react";
import type { Match } from "@/lib/types";

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

/** Formulaire partagé par la création (accueil) et l'édition (page du match). */
export function MatchForm({
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

  const submitLabel = mode === "create" ? "Créer le match" : "Enregistrer";

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
      {onCancel ? (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="btn-ghost py-3">Annuler</button>
          <button type="submit" className="btn-primary py-3">{submitLabel}</button>
        </div>
      ) : (
        <button type="submit" className="btn-primary w-full py-3">{submitLabel}</button>
      )}
    </form>
  );
}
