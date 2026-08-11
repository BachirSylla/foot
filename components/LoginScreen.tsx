"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const res =
      mode === "in"
        ? await signIn(email, password)
        : await signUp(email, password, fullName || email.split("@")[0]);
    setBusy(false);
    if (res.error) setError(res.error);
    else if (mode === "up")
      setInfo("Compte créé ! Si la confirmation par email est active, valide ton adresse puis connecte-toi.");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-lime text-base-800 shadow-glow">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7l3.5 2.5-1.3 4.1h-4.4L8.5 9.5 12 7z" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">TeamMix</h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "in" ? "Connecte-toi pour le match du vendredi" : "Crée ton compte joueur"}
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-3 p-5">
        {mode === "up" && (
          <Field label="Nom complet">
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Bachir Sylla"
              autoComplete="name"
            />
          </Field>
        )}
        <Field label="Email">
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="toi@entreprise.com"
            autoComplete="email"
          />
        </Field>
        <Field label="Mot de passe">
          <input
            className="input"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
          />
        </Field>

        {error && <p className="text-[13px] text-rose">{error}</p>}
        {info && <p className="text-[13px] text-lime">{info}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full py-3">
          {busy ? "…" : mode === "in" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "in" ? "up" : "in");
          setError(null);
          setInfo(null);
        }}
        className="mt-4 text-center text-sm text-muted hover:text-slate-200"
      >
        {mode === "in" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
