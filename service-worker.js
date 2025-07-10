const CACHE_NAME = 'gym-tracker-cache-v1'; // Version de votre cache
const urlsToCache = [
  './', // Cache la page d'accueil (index.html)
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192x192.png', // Assurez-vous que ces chemins sont corrects
  './icons/icon-512x512.png'
  // Ajoutez ici toutes les autres ressources statiques (images, polices, etc.)
];

// Installation du Service Worker : mise en cache des ressources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activation du Service Worker : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression ancien cache :', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interception des requêtes : servir depuis le cache si disponible
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si la ressource est dans le cache, la servir
        if (response) {
          return response;
        }
        // Sinon, faire une requête réseau
        return fetch(event.request);
      })
  );
});