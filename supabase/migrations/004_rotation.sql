-- ===========================================================================
-- TeamMix — V2 étape 3 : rotation des coéquipiers
--
-- À exécuter dans Supabase Studio > SQL Editor sur une base déjà créée.
-- Idempotente (`create or replace view`). Tout son contenu est aussi inclus
-- dans `schema.sql` pour une base neuve.
--
-- Objectif : éviter que les mêmes joueurs se retrouvent systématiquement dans
-- la même équipe. Le moteur (`lib/balance.ts`) sait déjà pénaliser une paire
-- via `rotationHistory` ; il ne manquait que la source de cet historique.
--
-- Il est CALCULÉ à la volée depuis les compositions des matchs terminés, comme
-- le classement et les buteurs — et non incrémenté dans un compteur, qui
-- dériverait à chaque republication ou réouverture d'un match.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Combien de fois chaque paire de joueurs a été DANS LA MÊME équipe
-- sur des matchs terminés.
--
-- L'auto-jointure ne garde que les paires (low, high) distinctes : la condition
-- `a1.user_id < a2.user_id` exclut à la fois le doublon symétrique et le joueur
-- avec lui-même. Le côté app reconstruit la clé avec `pairKey()`.
--
-- La table `pair_history` du schéma initial reste INUTILISÉE : elle supposait un
-- compteur incrémental, abandonné au profit de ce calcul à la volée.
--
-- NOTE RLS : vue laissée en `security_definer` (défaut Postgres), comme
-- `player_standings` et `top_scorers`. Elle n'expose que des agrégats par paire
-- (aucun match individuel) — ne pas la passer en `security_invoker`.
-- ---------------------------------------------------------------------------
create or replace view pair_together_counts as
select
  a1.user_id as user_low,
  a2.user_id as user_high,
  count(*)   as times
from team_assignments a1
join team_assignments a2
  on a1.composition_id = a2.composition_id
 and a1.team           = a2.team
 and a1.user_id        < a2.user_id
join team_compositions c on c.id = a1.composition_id
join matches m on m.id = c.match_id and m.status = 'finished'
group by a1.user_id, a2.user_id;

grant select on pair_together_counts to authenticated, anon;
