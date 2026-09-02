// Service Worker compartido para mesa.html y brigada.html.
// Se registra por separado desde cada página con un scope limitado a esa
// misma página (ver el registerServiceWorker() al final de cada HTML), así
// que NUNCA controla admin-codigos.html ni index-bypass-v2.html -esas
// siempre requieren red, tal como antes.
//
// Estrategia: red primero, y si falla (sin señal) sirve la última copia
// guardada en caché. Esto es lo que hace posible: 1) instalar la app y
// abrirla sin conexión, y 2) que SIEMPRE se vea la versión más nueva
// cuando SÍ hay señal (nunca queda una versión vieja "pegada").
const CACHE_NAME = "padron339-shell-v1";

function shellFilesFor(scope) {
  const FIREBASE = [
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js",
  ];
  if (scope.endsWith("mesa.html")) {
    return ["./mesa.html", "./manifest-mesa.json", "./icon-mesa-192.png", "./icon-mesa-512.png", ...FIREBASE];
  }
  if (scope.endsWith("brigada.html")) {
    return ["./brigada.html", "./manifest-brigada.json", "./icon-brigada-192.png", "./icon-brigada-512.png", ...FIREBASE];
  }
  return FIREBASE;
}

self.addEventListener("install", (e) => {
  const files = shellFilesFor(self.registration.scope);
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((c) => Promise.all(files.map((u) => c.add(u).catch(() => {})))) // un CDN caído no debe romper la instalación
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return; // no tocar nada que no sea GET (los datos van por WebSocket de Firebase, esto no los toca)

  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
