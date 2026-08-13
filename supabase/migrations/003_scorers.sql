-- ===========================================================================
-- TeamMix — V2 étape 2 : buteurs d'un match + classement des meilleurs buteurs
--
-- À exécuter dans Supabase Studio > SQL Editor sur une base déjà créée.
-- Idempotente : elle peut être rejouée sans risque. Tout son contenu est aussi
-- inclus dans `schema.sql` pour une base neuve.
--
-- Le classement PRINCIPAL (V/N/D/points, vue `player_standings`) n'est PAS
-- touché : il reste basé sur le résultat d'équipe. Les buts alimentent un
-- classement SÉPARÉ, purement individuel.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Les buts d'un match, par joueur
--
-- Une ligne par (match, joueur) : le nombre de buts qu'il a marqués ce jour-là.
-- La saisie est OPTIONNELLE et la somme des buts n'est pas forcée d'égaler le
-- score (csc, oublis…) : le score de `match_results` reste la seule source de
-- vérité des victoires/nuls/défaites.
-- ---------------------------------------------------------------------------
create table if not exists match_goals (
  match_id uuid not null references matches (id) on delete cascade,
  user_id  uuid not null references profiles (id) on delete cascade,
  goals    int  not null default 0 check (goals >= 0),
  primary key (match_id, user_id)
);

alter table match_goals enable row level security;

-- Lecture ouverte aux connectés (les buteurs sont affichés à tout le monde),
-- écriture réservée à l'organisateur — comme `match_results`.
drop policy if exists "match_goals: read" on match_goals;
create policy "match_goals: read" on match_goals
  for select using (auth.uid() is not null);

drop policy if exists "match_goals: admin write" on match_goals;
create policy "match_goals: admin write" on match_goals
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- 2. Classement des buteurs : total de buts sur les matchs TERMINÉS
--
-- Même règle que `player_standings` : un match rouvert (statut ramené à
-- 'published') sort du classement tant qu'il n'est pas re-terminé, alors que
-- ses buts restent stockés.
--
-- NOTE RLS : vue laissée en `security_definer` (défaut Postgres), comme
-- `player_standings`. Elle n'expose que des AGRÉGATS par joueur (aucun match
-- individuel) — ne pas la passer en `security_invoker`.
-- ---------------------------------------------------------------------------
create or replace view top_scorers as
select
  g.user_id,
  sum(g.goals)               as goals,
  count(distinct g.match_id) as matches
from match_goals g
join matches m on m.id = g.match_id and m.status = 'finished'
where g.goals > 0
group by g.user_id;

grant select on top_scorers to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 3. Temps réel : les buteurs doivent arriver en direct chez les joueurs
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table match_goals;
exception
  when duplicate_object then null; -- déjà publiée
end $$;
