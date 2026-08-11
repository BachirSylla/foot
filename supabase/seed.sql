-- ===========================================================================
-- TeamMix — Seed & mise en route (à exécuter APRÈS schema.sql)
-- ===========================================================================
-- Ces commandes se lancent dans Supabase Studio > SQL Editor.
-- Elles supposent que des comptes ont déjà été créés via l'app (écran d'inscription).

-- 1) Promouvoir un utilisateur en ADMIN (organisateur).
--    Remplace l'email par le tien.
update profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@yopmail.com');

-- 2) (Optionnel) Créer un premier match manuellement.
--    Normalement l'admin le fait depuis l'app (onglet "Organiser").
--    Décommente si tu veux un match de test tout de suite :
--
-- insert into matches (title, starts_at, location, max_players, type, status, created_by)
-- values (
--   'Match du vendredi',
--   (date_trunc('week', now()) + interval '4 days 18 hours'), -- vendredi 18h de la semaine en cours
--   'Terrain de l''entreprise',
--   12,
--   'internal',
--   'open',
--   (select id from auth.users where email = 'bachirsylla889@gmail.com')
-- );

-- 3) Vérifs utiles
-- select id, full_name, role from profiles order by created_at;
-- select id, title, starts_at, status from matches order by starts_at;
