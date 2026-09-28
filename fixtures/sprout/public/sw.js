const CACHE = "sprout";
const SHELL = ["/", "/index.html", "/assets/app.js", "/assets/app.css"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
});
