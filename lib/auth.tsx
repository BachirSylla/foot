"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { ProfileRow } from "./database.types";

/**
 * Nom posé par le trigger `handle_new_user` quand le compte n'a ni email ni
 * `full_name` (cas d'une connexion anonyme). Tant que le profil porte ce nom,
 * l'app demande au joueur de choisir le sien.
 */
export const PLACEHOLDER_NAME = "Nouveau joueur";

interface AuthState {
  ready: boolean;
  session: Session | null;
  profile: ProfileRow | null;
  isAdmin: boolean;
  /** Session ouverte via `signInAnonymously` (joueur arrivé par le lien / QR). */
  isAnonymous: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  /** Rejoint le match sans mot de passe (auth anonyme Supabase). */
  joinAsPlayer: () => Promise<{ error: string | null }>;
  /** Enregistre le nom affiché du joueur sur son profil. */
  setDisplayName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured;
  const [ready, setReady] = useState(!configured); // en démo, prêt immédiatement
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  async function loadProfile(userId: string) {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.from("profiles").select("*").eq("id", userId).single();
    setProfile((data as ProfileRow) ?? null);
  }

  useEffect(() => {
    if (!configured) return;
    const sb = getSupabase();
    if (!sb) return;

    sb.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setReady(true);
    });

    const { data: sub } = sb.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s) await loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [configured]);

  const value: AuthState = {
    ready,
    session,
    profile,
    isAdmin: profile?.role === "admin",
    isAnonymous: !!session?.user?.is_anonymous,
    configured,
    async signIn(email, password) {
      const sb = getSupabase();
      if (!sb) return { error: "Supabase non configuré." };
      const { error } = await sb.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    async signUp(email, password, fullName) {
      const sb = getSupabase();
      if (!sb) return { error: "Supabase non configuré." };
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      return { error: error?.message ?? null };
    },
    async joinAsPlayer() {
      const sb = getSupabase();
      if (!sb) return { error: "Supabase non configuré." };
      const { error } = await sb.auth.signInAnonymously();
      return { error: error?.message ?? null };
    },
    async setDisplayName(name) {
      const sb = getSupabase();
      if (!sb || !session) return;
      const { error } = await sb.from("profiles").update({ full_name: name }).eq("id", session.user.id);
      if (error) throw error;
      await loadProfile(session.user.id);
    },
    async signOut() {
      const sb = getSupabase();
      await sb?.auth.signOut();
      setProfile(null);
    },
    async refreshProfile() {
      if (session) await loadProfile(session.user.id);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
