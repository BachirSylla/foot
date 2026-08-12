# TeamMix

Plateforme d'équilibrage automatique des matchs de foot internes.
Next.js (PWA) + Supabase, design « Sport dark néon ».

## Structure du repo

```
teammix/
├── app/
│   ├── layout.tsx       # AuthProvider + AuthGate (garde globale)
│   ├── page.tsx         # Accueil : la liste de tous les matchs
│   └── m/[id]/page.tsx  # Un match : StoreProvider(matchId) + MatchDetail
├── components/          # UI (liste, écrans joueur/admin, tirage, équipes…)
│   ├── MatchList.tsx    # Accueil : à venir / passés + « Nouveau match » (admin)
│   ├── MatchCard.tsx    # Une carte de match (lien vers /m/{id})
│   ├── MatchDetail.tsx  # Contenu d'un match (joueur ↔ organisateur)
│   ├── AuthGate.tsx     # Garde d'auth, indépendante des données
│   └── Header.tsx       # Logo (retour accueil) + nom + déconnexion
├── lib/                 # Logique + données
│   ├── balance.ts       # Moteur d'équilibrage (source de vérité)
│   ├── balance.test.ts  # Tests du moteur (Vitest)
│   ├── types.ts         # Types partagés
│   ├── supabase.ts      # Client Supabase
│   ├── auth.tsx         # Session + rôle
│   ├── repo.ts          # Requêtes (matchs, participations, compositions)
│   ├── store.tsx        # Store d'UN match (démo/live) + temps réel
│   ├── demoStore.ts     # Base en mémoire du mode démo (multi-matchs)
│   ├── matchDisplay.ts  # Libellés de statut + format de date
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

## Les routes
- `/` — **accueil** : tous les matchs, « À venir » puis « Passés » (repliable). Chaque
  carte montre le statut et le nombre de présents ; l'admin y crée un match.
- `/m/{id}` — **un match** : la réponse du joueur, qui vient, et côté organisateur le
  QR **de ce match**, le tirage, la publication, la modification / l'annulation.

Plusieurs matchs peuvent être ouverts en même temps (mardi **et** vendredi) : les
réponses, la composition et le QR sont scopés par match.

## Le parcours de démo
1. **Accueil** — la liste des matchs. Ouvre-en un.
2. **Vue Joueur** — réponds au match (Je joue / Peut-être / Absent), choisis 2 postes max.
3. Bascule sur **Vue Admin** (en haut à droite).
4. Choisis un mode (Équilibré / Rapide) et **Génère les équipes** → animation de tirage.
5. **Publie** : la composition se verrouille. Reviens en Vue Joueur → les équipes sont visibles par tous.
6. Depuis l'accueil, **➕ Nouveau match** en crée un second, indépendant du premier.

> Le mode démo garde tout en mémoire (`lib/demoStore.ts`) : recharger la page
> remet la démo à son état initial.

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
- **Joueur** : l'organisateur partage le lien / QR **d'un match** (carte « Inviter les
  joueurs », bouton WhatsApp) — il pointe sur `/m/{id}`. Le joueur ouvre le lien →
  **Rejoindre le match** → il saisit son nom **une seule fois** (la session Supabase
  est persistée sur l'appareil) → il répond, sur ce match précis. L'URL d'arrivée est
  conservée pendant l'inscription : il atterrit bien sur le match scanné.
- **Organisateur** : compte email/mot de passe classique. Depuis l'accueil il crée
  autant de matchs qu'il veut. Sur la page d'un match, il partage le QR, peut
  **modifier** (date, lieu, effectif visé) ou **annuler** le match (statut `cancelled` :
  il bascule dans les matchs passés), puis génère et publie les équipes — et peut
  **déverrouiller** une publication (la compo est conservée, mais redevient invisible
  pour les joueurs jusqu'à republication).

### Comment ça marche
- `lib/supabase.ts` — client navigateur (clé anon, publique).
- `lib/auth.tsx` — session + profil + rôle (email/mot de passe **ou** anonyme via
  `joinAsPlayer()` / `setDisplayName()`).
- `lib/repo.ts` — toutes les requêtes (liste des matchs, un match, participations,
  compositions).
- `lib/store.tsx` — le store d'**un** match (`<StoreProvider matchId>`), démo ou live,
  avec le **temps réel** scopé sur ce match (les réponses des collègues et la
  publication des équipes arrivent en direct). L'accueil, lui, s'abonne à la table
  `matches` pour voir apparaître les matchs créés par d'autres.

> Aucune migration n'est nécessaire pour le multi-matchs : la table `matches`
> acceptait déjà plusieurs lignes et la RLS existante (matchs et participations
> lisibles par tout utilisateur connecté) suffit.

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
