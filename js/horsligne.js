/* =========================================================================
   Roadbook — le voyage disponible sans réseau
   · Le service hors ligne (sw.js) garde l’application sur le téléphone.
   · Chaque voyage composé est préparé : ses aires et ses photos sont gardées
     dans le navigateur (Cache), ses journées et ses lieux pour dormir sont déjà
     gardés avec le voyage (localStorage).
   Sans le service (ouverture depuis un fichier, navigateur ancien), les photos
   gardées sont quand même reprises quand le réseau manque.
   ========================================================================= */
(function () {
  var VOYAGES = "roadbook-voyages";
  var CLE = "roadbook.horsligne";
  var cacheOk = typeof caches !== "undefined" && window.isSecureContext;
  var etat = {}; // id du voyage → { fait, total, pret, erreur }

  function lire() { try { return JSON.parse(localStorage.getItem(CLE) || "{}"); } catch (e) { return {}; } }
  function noter(id) {
    try { var m = lire(); m[id] = Date.now(); localStorage.setItem(CLE, JSON.stringify(m)); } catch (e) {}
  }

  // Le service hors ligne (seulement sur un site en https)
  if ("serviceWorker" in navigator && window.isSecureContext && location.protocol !== "file:") {
    window.addEventListener("load", function () {
      try {
        navigator.serviceWorker.register("sw.js").catch(function () {});
      } catch (e) {}
    });
  }
  // Demande au navigateur de ne pas effacer ce qui est gardé quand le téléphone manque de place
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

  RB.horsLigne = {};
  RB.horsLigne.possible = function () { return cacheOk; };

  // Les fichiers à garder pour un voyage : les aires des pays traversés et toutes ses photos
  function fichiers(v, photos) {
    var l = {};
    (RB.aires.paysDuVoyage(v) || []).forEach(function (c) { l["js/aires/" + c + ".js"] = 1; });
    (photos || []).forEach(function (f) { if (f) l[f] = 1; });
    return Object.keys(l);
  }

  RB.horsLigne.etat = function (v) {
    if (!v) return null;
    if (etat[v.id]) return etat[v.id];
    if (lire()[v.id]) return { pret: true, fait: 1, total: 1 };
    return null;
  };

  // Prépare le voyage ; maj(e) est appelé à chaque fichier gardé
  RB.horsLigne.preparer = function (v, photos, maj) {
    if (!cacheOk || !v) return;
    var e = etat[v.id];
    if (e && !e.erreur) return;           // déjà en cours ou fait
    var liste = fichiers(v, photos);
    e = etat[v.id] = { fait: 0, total: liste.length, pret: false, manque: 0 };
    caches.open(VOYAGES).then(function (c) {
      var i = 0, actifs = 0;
      function suivant() {
        if (i >= liste.length) { if (!actifs) fin(); return; }
        var f = liste[i++]; actifs++;
        c.match(f, { ignoreSearch: true }).then(function (r) {
          if (r) return;
          return fetch(f).then(function (rep) { if (rep.ok) return c.put(f, rep); e.manque++; });
        }).catch(function () { e.manque++; }).then(function () {
          actifs--; e.fait++; if (maj) maj(e); suivant();
        });
      }
      function fin() {
        // Les photos personnelles absentes (images/etapes/…) ne comptent pas comme un manque
        e.pret = true;
        if (e.manque && !navigator.onLine) { e.pret = false; e.erreur = true; }
        else noter(v.id);
        if (maj) maj(e);
      }
      for (var k = 0; k < 4; k++) suivant();
    }).catch(function () { e.erreur = true; if (maj) maj(e); });
  };

  // Une photo qui ne vient pas (pas de réseau) : on cherche la copie gardée
  RB.horsLigne.photoGardee = function (src, ok, non) {
    if (!cacheOk) { non(); return; }
    caches.match(src, { ignoreSearch: true }).then(function (r) {
      if (!r) { non(); return; }
      return r.blob().then(function (b) { ok(URL.createObjectURL(b)); });
    }).catch(non);
  };

  // Un fichier d’aires qui ne vient pas : on lit la copie gardée
  RB.horsLigne.scriptGarde = function (src, fin) {
    if (!cacheOk) { fin(false); return; }
    caches.match(src, { ignoreSearch: true }).then(function (r) {
      if (!r) { fin(false); return; }
      return r.text().then(function (t) { try { (0, eval)(t); fin(true); } catch (e) { fin(false); } });
    }).catch(function () { fin(false); });
  };
})();
