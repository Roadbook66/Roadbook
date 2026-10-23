/* =========================================================================
   Roadbook — le service hors ligne
   L’application et les voyages préparés restent disponibles sans réseau.
   À chaque mise à jour de Roadbook, change VERSION : le téléphone reprend
   alors les nouveaux fichiers dès qu’il a du réseau.
   ========================================================================= */
var VERSION = "roadbook-2026-10-23-4";
var APPLI = VERSION + "-appli";
var VOYAGES = "roadbook-voyages";   // aires et photos des voyages préparés (gardé d’une version à l’autre)

var FICHIERS = [
  "./", "css/polices.css", "css/styles.css", "infos.html",
  "js/villes.js", "js/villes-plus.js", "js/data.js", "js/data-europe.js", "js/data-europe2.js", "js/data-terre.js",
  "js/regions-outils.js", "js/regions-ouest.js", "js/regions-centre.js", "js/regions-sud.js", "js/regions-nord.js",
  "js/regions-est.js", "js/regions-orient.js", "js/regions-plus.js", "js/regions-fin.js",
  "js/villes-ouest.js", "js/villes-centre.js", "js/villes-sud.js", "js/villes-nord.js", "js/villes-est.js",
  "js/villes-orient.js", "js/villes-geonames.js", "js/envies.js", "js/generator.js", "js/planning.js", "js/regles-route.js", "js/modifier.js", "js/aires.js",
  "js/photos.js", "js/mes-photos.js", "js/horsligne.js", "js/config.js", "js/vendor/supabase/supabase.js", "js/communaute.js", "js/vendor/leaflet/leaflet.js", "js/vendor/leaflet/leaflet.css", "js/fond-carte.js", "js/carte.js", "js/app.js",
  "fonts/inter-latin-400-normal.woff2", "fonts/inter-latin-500-normal.woff2", "fonts/inter-latin-600-normal.woff2", "fonts/inter-latin-ext-400-normal.woff2", "fonts/inter-latin-ext-500-normal.woff2", "fonts/inter-latin-ext-600-normal.woff2", "fonts/lato-latin-400-normal.woff2", "fonts/lato-latin-700-normal.woff2", "fonts/lato-latin-ext-400-normal.woff2", "fonts/lato-latin-ext-700-normal.woff2", "fonts/lora-latin-500-italic.woff2", "fonts/lora-latin-500-normal.woff2", "fonts/lora-latin-600-normal.woff2", "fonts/lora-latin-ext-500-italic.woff2", "fonts/lora-latin-ext-500-normal.woff2", "fonts/lora-latin-ext-600-normal.woff2",
  "images/accueil.jpg", "images/icone-192.png", "images/icone-512.png", "manifest.webmanifest"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(APPLI).then(function (c) {
    // Un fichier qui manque ne bloque pas l’installation
    return Promise.all(FICHIERS.map(function (f) {
      return fetch(f, { cache: "reload" }).then(function (r) { if (r.ok) return c.put(f, r); }).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.filter(function (k) { return k !== APPLI && k !== VOYAGES && k.indexOf("roadbook-") === 0 && k !== VERSION + "-polices"; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function dansLesCaches(req) {
  return caches.match(req, { ignoreSearch: true });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // Les polices : une fois récupérées, on les garde
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.match(req).then(function (r) {
      return r || fetch(req).then(function (rep) {
        var copie = rep.clone();
        caches.open(VERSION + "-polices").then(function (c) { c.put(req, copie); });
        return rep;
      });
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // La page : le réseau d’abord (pour avoir la dernière version), sinon celle gardée
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(function (rep) {
      var copie = rep.clone();
      caches.open(APPLI).then(function (c) { c.put("./", copie); });
      return rep;
    }).catch(function () {
      return dansLesCaches(req).then(function (r) { return r || caches.match("./"); });
    }));
    return;
  }

  // Photos et aires : ce qui est gardé d’abord, sinon le réseau (et on le garde)
  if (/\/(images|js\/aires|_blob)\//.test(url.pathname)) {
    e.respondWith(dansLesCaches(req).then(function (r) {
      return r || fetch(req).then(function (rep) {
        if (rep.ok) { var copie = rep.clone(); caches.open(VOYAGES).then(function (c) { c.put(req, copie); }); }
        return rep;
      });
    }));
    return;
  }

  // Le reste de l’application : la version gardée tout de suite, mise à jour en arrière-plan
  e.respondWith(dansLesCaches(req).then(function (r) {
    var reseau = fetch(req).then(function (rep) {
      if (rep.ok) { var copie = rep.clone(); caches.open(APPLI).then(function (c) { c.put(req, copie); }); }
      return rep;
    }).catch(function () { return r; });
    return r || reseau;
  }));
});
