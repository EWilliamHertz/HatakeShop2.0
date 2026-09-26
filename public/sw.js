self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
});
self.addEventListener('fetch', (event) => {
  // Simple pass-through for now
});
