# TeamMix

Plateforme d'équilibrage automatique des matchs de foot internes.
Next.js (PWA) + Supabase, design « Sport dark néon ».

## Structure du repo

```
teammix/
├── app/                 # Next.js App Router (layout, page, styles)
├── components/          # UI (écrans joueur/admin, tirage, équipes…)
├── lib/                 # Logique + données
│   ├── balance.ts       # Moteur d'équilibrage (source de vérité)
│   ├── balance.test.ts  # Tests du moteur (Vitest)
│   ├── types.ts         # Types partagés
│   ├── supabase.ts      # Client Supabase
│   ├── auth.tsx         # Session + rôle
│   ├── repo.ts          # Requêtes (matchs, participations, compositions)
│   ├── store.tsx        # Store unifié démo/live + temps réel
│   └── mock.ts          # Données de démo
├── supabase/
│   ├── schema.sql       # Tables + RLS + realtime + trigger (à exécuter en 1er)
│   ├── migrations/      # Correctifs à appliquer sur une base déjà créée
│   └── seed.sql         # Promotion admin / match de test
└── public/              # PWA (manifest, service worker, icônes)
```

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # tests du moteur (Vitest)
npm run build    # build de production
```

## Le parcours de démo
1. **Vue Joueur** — réponds au match (Je joue / Peut-être / Absent), choisis 2 postes max.
2. Bascule sur **Vue Admin** (en haut à droite).
3. Choisis un mode (Équilibré / Rapide) et **Génère les équipes** → animation de tirage.
4. **Publie** : la composition se verrouille. Reviens en Vue Joueur → les équipes sont visibles par tous.

## Ce qui est branché
- Le **moteur d'équilibrage** (`lib/balance.ts`, couvert par `lib/balance.test.ts`) tourne côté client.
- Pas de niveau affiché (choix produit), mais le champ reste présent pour une évolution future.
- Un mélange aléatoire des joueurs avant chaque tirage donne de la variété au « re-tirage ».

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind · framer-motion · polices auto-hébergées (@fontsource).
PWA : `manifest.webmanifest` + service worker minimal (`public/sw.js`).

## Supabase (mode « live »)

L'app détecte automatiquement le mode :
- **Sans** `.env.local` → **mode démo** (données en mémoire, sélecteur Joueur/Admin, aucune connexion requise).
- **Avec** les clés Supabase → **mode live** : authentification, données réelles, temps réel.

### Mise en route (une seule fois)
1. **Appliquer le schéma** : dans Supabase Studio > SQL Editor, colle et exécute
   `supabase/schema.sql` (tables, RLS, temps réel, trigger d'inscription).
2. **Activer l'auth anonyme** : Authentication > Sign In / Providers → active
   **Anonymous sign-ins**. C'est ce qui permet aux joueurs de rejoindre par
   lien / QR sans mot de passe. Sans ça, « Rejoindre le match » renvoie une erreur.
3. **Faciliter les tests** : Authentication > Providers > Email → désactive
   « Confirm email » (sinon chaque inscription doit valider un email).
4. **Clés** : `.env.local` est déjà rempli avec ton `NEXT_PUBLIC_SUPABASE_URL` et ta clé anon.
5. **Lancer** : `npm install && npm run dev`, puis **crée ton compte organisateur**
   via « Tu es l'organisateur ? Se connecter » sur l'écran d'accueil.
6. **Te promouvoir admin** : exécute `supabase/seed.sql` (met ton email en `role = 'admin'`).
   Recharge : tu vois l'onglet **Organiser** pour créer le match et générer les équipes.

> **Base déjà créée avant cette version ?** Exécute aussi
> `supabase/migrations/001_profiles_read_and_anon.sql` dans le SQL Editor. Elle
> ouvre la lecture des profils à tous les utilisateurs connectés (sinon un joueur
> voit « 0/12 », « Qui vient » ne liste que lui et les coéquipiers s'affichent en
> « Joueur ») et rend le trigger `handle_new_user` compatible avec les comptes
> anonymes. Elle est idempotente et déjà incluse dans `schema.sql` pour une base neuve.

### Le parcours en live
- **Joueur** : l'organisateur partage le lien / QR (carte « Inviter les joueurs »,
  bouton WhatsApp). Le joueur ouvre le lien → **Rejoindre le match** → il saisit son
  nom **une seule fois** (la session Supabase est persistée sur l'appareil) → il répond.
- **Organisateur** : compte email/mot de passe classique. Il crée le match, partage
  le QR, peut **modifier** (date, lieu, effectif visé) ou **annuler** le match
  (statut `cancelled` : il disparaît de l'app), puis génère et publie les équipes.

### Comment ça marche
- `lib/supabase.ts` — client navigateur (clé anon, publique).
- `lib/auth.tsx` — session + profil + rôle (email/mot de passe **ou** anonyme via
  `joinAsPlayer()` / `setDisplayName()`).
- `lib/repo.ts` — toutes les requêtes (matchs, participations, compositions).
- `lib/store.tsx` — un seul store qui bascule démo/live et gère le **temps réel**
  (les réponses des collègues et la publication des équipes arrivent en direct).

### Sécurité
La clé **anon** est publique par conception (elle vit dans le navigateur) : la sécurité
repose sur la **Row Level Security** du schéma (un joueur ne voit pas la compo avant
publication, et seul l'admin écrit les matchs et les compositions). Ne mets **jamais**
la clé `service_role` ni le mot de passe Postgres dans un fichier `NEXT_PUBLIC_*`.

Depuis la migration 001, `profiles` est lisible par **tout utilisateur connecté**
(nécessaire pour afficher l'effectif). La colonne `level` n'est ni affichée ni saisie ;
si elle est réintroduite un jour, elle devra être déplacée dans une table séparée
admin-only pour rester privée.

## Déploiement Vercel
`vercel` (ou via le dashboard). Ajoute les deux variables d'environnement
`NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans le projet Vercel.
