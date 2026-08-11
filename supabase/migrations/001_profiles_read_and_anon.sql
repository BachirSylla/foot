-- ===========================================================================
-- Migration 001 — Lecture des profils + support de l'auth anonyme
--
-- À exécuter UNE FOIS dans Supabase Studio > SQL Editor sur une base où
-- `supabase/schema.sql` a déjà été appliqué. (Sur une base neuve, le schema.sql
-- à jour contient déjà ces deux correctifs : cette migration est alors inutile.)
--
-- Idempotente : ré-exécutable sans risque.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) profiles : lecture ouverte à tout utilisateur connecté
--
-- Avant : "profiles: read own" limitait chaque joueur à sa propre ligne, donc
-- l'effectif affichait « 0/12 », « Qui vient » ne listait que soi-même, et les
-- coéquipiers apparaissaient en « Joueur » dans les équipes publiées.
--
-- ATTENTION (niveau privé) : la colonne `level` devient lisible par tous les
-- utilisateurs connectés. Elle n'est aujourd'hui ni affichée ni saisie ; le jour
-- où elle sera réintroduite, elle devra être DÉPLACÉE dans une table séparée
-- admin-only (ex. `player_ratings` avec RLS `is_admin()`) pour rester privée.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles: read own" on profiles;
drop policy if exists "profiles: read all authenticated" on profiles;

create policy "profiles: read all authenticated" on profiles
  for select using (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- 2) handle_new_user : tolérer les comptes anonymes (ni email, ni full_name)
--
-- Sans ce fallback, `insert into profiles` violerait `full_name not null` et
-- `supabase.auth.signInAnonymously()` échouerait. Le joueur choisit ensuite son
-- nom dans l'app, ce qui remplace 'Nouveau joueur'.
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name',''), new.email, 'Nouveau joueur'));
  return new;
end; $$;

-- Rappel : activer Authentication > Sign In / Providers > Anonymous sign-ins
-- dans le dashboard Supabase, sinon l'inscription par lien/QR renvoie une erreur.
