// Service worker minimal : la PWA reste installable ET reçoit les mises à jour.
//
// Règle : réseau d'abord pour les pages, cache d'abord pour les assets.
// Un cache-first sur la page « / » servirait indéfiniment l'ancien HTML, qui
// référence les anciens chunks JS : un déploiement n'arriverait jamais jusqu'au
// navigateur.
const CACHE = "teammix-v3";
const SHELL = ["/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Le nom du cache change à chaque évolution du SW : les anciens sont purgés ici.
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Supabase (auth, données, temps réel) : jamais intercepté.
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages : réseau d'abord, cache en secours (hors-ligne).
  // Chaque page est cachée sous SA propre URL : l'app a plusieurs routes
  // (« / » et « /m/{id} »), les stocker toutes sous « / » servirait la mauvaise
  // page hors-ligne. En dernier recours on retombe sur l'accueil.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((c) => c || caches.match("/")))
    );
    return;
  }

  // Assets : cache d'abord. Les chunks Next sont hashés, donc un nouveau
  // déploiement produit de nouvelles URLs — aucun risque de servir du périmé.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      });
    })
  );
});
