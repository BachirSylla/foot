-- ===========================================================================
-- TeamMix — V2 étape 1 : résultat d'un match + classement interne
--
-- À exécuter dans Supabase Studio > SQL Editor sur une base déjà créée.
-- Idempotente : elle peut être rejouée sans risque. Tout son contenu est aussi
-- inclus dans `schema.sql` pour une base neuve.
--
-- Rien à créer pour le score : la table `match_results` existe depuis la V1.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Les compos restent lisibles une fois le match TERMINÉ
--
-- Les policies d'origine n'ouvraient la lecture que sur `status = 'published'`.
-- Un match qui passe en 'finished' (dès qu'un score est saisi) faisait donc
-- disparaître les équipes de l'écran des joueurs — alors qu'elles étaient déjà
-- publiques la seconde d'avant. On ajoute 'finished' : aucune information
-- nouvelle n'est exposée, c'est la même compo qui reste visible.
-- ---------------------------------------------------------------------------
drop policy if exists "compositions: read when published" on team_compositions;
create policy "compositions: read when published" on team_compositions
  for select using (
    is_admin() or exists (
      select 1 from matches m
      where m.id = team_compositions.match_id
        and m.status in ('published', 'finished')
    )
  );

drop policy if exists "assignments: read when published" on team_assignments;
create policy "assignments: read when published" on team_assignments
  for select using (
    is_admin() or exists (
      select 1 from team_compositions c
      join matches m on m.id = c.match_id
      where c.id = team_assignments.composition_id
        and m.status in ('published', 'finished')
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Vue de classement
--
-- Un joueur compte pour un match s'il a été RÉELLEMENT placé dans une équipe
-- (team_assignments), pas seulement présent. Seuls les matchs 'finished' avec
-- un résultat sont pris en compte. Barème : victoire 3, nul 1, défaite 0
-- (miroir de POINTS dans lib/standings.ts — changer les deux ensemble).
--
-- NOTE RLS : la vue est volontairement laissée en `security_definer` (défaut
-- Postgres), donc elle lit les tables sous-jacentes avec les droits de son
-- propriétaire. Mettre `security_invoker = on` viderait le classement pour les
-- joueurs : la policy de `team_assignments` ne les autorise que sur les matchs
-- 'published'/'finished', et surtout la vue n'expose que des AGRÉGATS par
-- joueur (aucune compo, aucun match individuel) — rien de confidentiel.
-- ---------------------------------------------------------------------------
create or replace view player_standings as
select
  a.user_id,
  count(*)                                                                   as played,
  count(*) filter (where (a.team = 'A' and r.score_a > r.score_b)
                      or (a.team = 'B' and r.score_b > r.score_a))           as wins,
  count(*) filter (where r.score_a = r.score_b)                              as draws,
  count(*) filter (where (a.team = 'A' and r.score_a < r.score_b)
                      or (a.team = 'B' and r.score_b < r.score_a))           as losses,
  count(*) filter (where (a.team = 'A' and r.score_a > r.score_b)
                      or (a.team = 'B' and r.score_b > r.score_a)) * 3
    + count(*) filter (where r.score_a = r.score_b)                          as points
from team_assignments a
join team_compositions c on c.id = a.composition_id
join matches m           on m.id = c.match_id and m.status = 'finished'
join match_results r     on r.match_id = m.id
group by a.user_id;

grant select on player_standings to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 3. Temps réel : le score doit arriver en direct chez les joueurs
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table match_results;
exception
  when duplicate_object then null; -- déjà publiée
end $$;
