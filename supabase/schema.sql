-- ===========================================================================
-- TeamMix — Schéma Supabase (PostgreSQL)
-- À coller dans Supabase Studio > SQL Editor, ou via `supabase db push`.
--
-- Couvre la V1 (users, matchs, participations, compositions) et prépare la V2
-- (niveau, historique de rotation, résultats). Row Level Security (RLS) incluse
-- pour empêcher un joueur de voir/modifier ce qu'il ne doit pas — c'est le socle
-- anti-manipulation.
-- ===========================================================================

-- --- Extensions -----------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- --- Enums ----------------------------------------------------------------
create type user_role       as enum ('player', 'admin');
create type match_type      as enum ('internal', 'external');
create type match_status    as enum ('draft', 'open', 'generated', 'published', 'finished', 'cancelled');
create type availability    as enum ('available', 'unavailable', 'maybe');
create type position_code   as enum ('GK', 'DEF', 'MID', 'FWD');
create type team_side       as enum ('A', 'B');

-- ===========================================================================
-- profiles : 1 ligne par utilisateur (liée à auth.users de Supabase Auth)
-- ===========================================================================
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text not null,
  role         user_role not null default 'player',
  -- Niveau global, PRIVÉ (visible admin uniquement via RLS). 1 = débutant → 5 = excellent.
  level        smallint check (level between 1 and 5),
  -- Postes habituels : pré-remplissage indicatif (les postes réels sont déclarés par match).
  usual_positions position_code[] not null default '{}',
  created_at   timestamptz not null default now()
);

-- ===========================================================================
-- matches : un « vendredi » = un match
-- ===========================================================================
create table matches (
  id            uuid primary key default gen_random_uuid(),
  title         text,
  starts_at     timestamptz not null,
  location      text,
  sport         text not null default 'football',
  type          match_type not null default 'internal',
  max_players   smallint not null check (max_players between 2 and 40),
  team_size     smallint check (team_size between 1 and 20),
  -- Formation cible par équipe, ex : {"GK":1,"DEF":2,"MID":1,"FWD":1} (CIBLE, pas contrainte dure).
  formation     jsonb,
  status        match_status not null default 'draft',
  created_by    uuid not null references profiles (id),
  created_at    timestamptz not null default now()
);
create index on matches (starts_at);
create index on matches (status);

-- ===========================================================================
-- participations : réponse d'un joueur pour un match (dispo + postes du jour)
-- ===========================================================================
create table participations (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null references matches (id) on delete cascade,
  user_id       uuid not null references profiles (id) on delete cascade,
  status        availability not null default 'available',
  -- Postes déclarés POUR CE MATCH, ordonnés (préféré d'abord). Max 2 côté UI.
  positions     position_code[] not null default '{}',
  responded_at  timestamptz not null default now(),
  unique (match_id, user_id)
);
create index on participations (match_id);

-- ===========================================================================
-- team_compositions : le résultat de la génération (verrouillable, auditable)
-- ===========================================================================
create table team_compositions (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null references matches (id) on delete cascade,
  -- Seed + score : rendent la composition reproductible et « officielle »
  -- (protection contre l'admin qui régénère jusqu'à obtenir ce qu'il veut).
  seed          text,
  mode          text not null default 'balanced',
  score         numeric,
  breakdown     jsonb,
  is_locked     boolean not null default false,
  generated_at  timestamptz not null default now(),
  unique (match_id)
);

create table team_assignments (
  id              uuid primary key default gen_random_uuid(),
  composition_id  uuid not null references team_compositions (id) on delete cascade,
  user_id         uuid not null references profiles (id) on delete cascade,
  team            team_side not null,
  assigned_position position_code not null,
  unique (composition_id, user_id)
);
create index on team_assignments (composition_id);

-- ===========================================================================
-- V2 : historique de rotation (co-participations) + résultats
-- ===========================================================================

-- Compteur symétrique : combien de fois deux joueurs ont été dans la MÊME équipe.
-- On stocke une seule ligne par paire avec user_low < user_high.
create table pair_history (
  user_low       uuid not null references profiles (id) on delete cascade,
  user_high      uuid not null references profiles (id) on delete cascade,
  played_together int not null default 0,
  played_against  int not null default 0,
  primary key (user_low, user_high),
  check (user_low < user_high)
);

create table match_results (
  match_id      uuid primary key references matches (id) on delete cascade,
  score_a       smallint not null default 0,
  score_b       smallint not null default 0,
  recorded_at   timestamptz not null default now()
);

-- ===========================================================================
-- Helper : l'utilisateur courant est-il admin ?
-- ===========================================================================
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table profiles          enable row level security;
alter table matches           enable row level security;
alter table participations    enable row level security;
alter table team_compositions enable row level security;
alter table team_assignments  enable row level security;
alter table pair_history      enable row level security;
alter table match_results     enable row level security;

-- profiles : lecture ouverte à TOUT utilisateur connecté (y compris les comptes
-- anonymes). Indispensable pour que l'app fonctionne : sans ça un joueur ne voit
-- que sa propre ligne, donc l'effectif affiche « 0/12 », « Qui vient » ne liste
-- que lui, et les autres apparaissent en « Joueur » dans les équipes publiées.
--
-- ATTENTION (niveau privé) : la colonne `level` est aujourd'hui inutilisée côté
-- produit (aucun niveau n'est affiché ni saisi). Le jour où elle sera réintroduite,
-- elle devra être DÉPLACÉE dans une table séparée admin-only (ex. `player_ratings`,
-- RLS `is_admin()`), car cette policy rend toutes les colonnes de `profiles`
-- lisibles par n'importe quel utilisateur connecté.
create policy "profiles: read all authenticated" on profiles
  for select using (auth.uid() is not null);
create policy "profiles: update own basics" on profiles
  for update using (id = auth.uid());
create policy "profiles: admin all" on profiles
  for all using (is_admin()) with check (is_admin());

-- matches : tout le monde (authentifié) lit ; seul l'admin crée/modifie.
create policy "matches: read" on matches
  for select using (auth.uid() is not null);
create policy "matches: admin write" on matches
  for all using (is_admin()) with check (is_admin());

-- participations : un joueur gère SA participation ; l'admin voit tout.
-- (Avant génération, personne ne voit les futures équipes : elles n'existent pas encore.)
create policy "participations: read" on participations
  for select using (auth.uid() is not null);
create policy "participations: write own" on participations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "participations: admin" on participations
  for all using (is_admin()) with check (is_admin());

-- compositions : lisibles seulement une fois PUBLIÉES (sinon admin only).
-- => empêche les joueurs de voir la compo avant la publication officielle.
create policy "compositions: read when published" on team_compositions
  for select using (
    is_admin() or exists (
      select 1 from matches m
      where m.id = team_compositions.match_id and m.status = 'published'
    )
  );
create policy "compositions: admin write" on team_compositions
  for all using (is_admin()) with check (is_admin());

create policy "assignments: read when published" on team_assignments
  for select using (
    is_admin() or exists (
      select 1 from team_compositions c
      join matches m on m.id = c.match_id
      where c.id = team_assignments.composition_id and m.status = 'published'
    )
  );
create policy "assignments: admin write" on team_assignments
  for all using (is_admin()) with check (is_admin());

-- historique & résultats : lecture authentifiée, écriture admin.
create policy "pair_history: read" on pair_history
  for select using (auth.uid() is not null);
create policy "pair_history: admin write" on pair_history
  for all using (is_admin()) with check (is_admin());
create policy "results: read" on match_results
  for select using (auth.uid() is not null);
create policy "results: admin write" on match_results
  for all using (is_admin()) with check (is_admin());

-- ===========================================================================
-- Auto-création du profil à l'inscription (trigger sur auth.users)
--
-- Les comptes ANONYMES (Authentication > Anonymous sign-ins) n'ont ni email ni
-- full_name : sans le fallback ci-dessous, l'insert violerait `full_name not null`
-- et la connexion anonyme échouerait. Le joueur choisit ensuite son nom dans l'app
-- (écran « Ton prénom / nom »), ce qui remplace 'Nouveau joueur'.
-- ===========================================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name',''), new.email, 'Nouveau joueur'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ===========================================================================
-- Temps réel : publier les tables suivies par l'app (dispo + compositions).
-- Sans ça, les souscriptions realtime côté client ne reçoivent rien.
-- ===========================================================================
alter publication supabase_realtime add table participations;
alter publication supabase_realtime add table team_compositions;
alter publication supabase_realtime add table team_assignments;
alter publication supabase_realtime add table matches;
