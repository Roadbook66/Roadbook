/* =========================================================================
   Roadbook — les cartes (Leaflet)
   Le fond de carte est inclus dans l’application (js/fond-carte.js : côtes et
   frontières, Natural Earth, domaine public) : il marche partout, même sans réseau.
   · Ma route : le tracé du voyage, nuit après nuit (à vol d’oiseau entre les étapes).
   · Ma journée : d’où l’on vient, la ville du soir, et les aires et campings autour.
   ========================================================================= */
(function () {
  var TYPE = { A: "Aire de camping-cars", C: "Camping", P: "Parking autorisé", V: "Station de vidange", E: "Point d’eau" };
  var cartes = [];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function point(cls, texte) {
    return L.divIcon({ className: "", html: '<span class="carte-point ' + cls + '">' + esc(texte) + "</span>", iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -12] });
  }

  // Les noms des villes, selon le zoom : les grandes d’abord, les autres en s’approchant
  function nomsDesVilles(carte, eviter) {
    var calque = L.layerGroup().addTo(carte);
    function maj() {
      calque.clearLayers();
      var z = carte.getZoom(), b = carte.getBounds().pad(-0.04), n = 0, max = z >= 10 ? 40 : 26;
      var deja = [];
      (RB.villes || []).forEach(function (v) {
        if (n >= max) return;
        var grande = v[4] === 1;
        if (!grande && z < 9) return;
        if (!b.contains([v[2], v[3]])) return;
        var p = carte.latLngToContainerPoint([v[2], v[3]]);
        if (p.x < 70 && p.y < 100) return; // sous les boutons + et −
        if (deja.some(function (q) { return Math.abs(q.x - p.x) < 90 && Math.abs(q.y - p.y) < 22; })) return;
        if (eviter.some(function (e, i) { var q = carte.latLngToContainerPoint(e); return Math.abs(q.x - p.x) < (i === 0 ? 150 : 40) && Math.abs(q.y - p.y) < 30; })) return;
        deja.push(p); n++;
        L.marker([v[2], v[3]], { interactive: false, keyboard: false,
          icon: L.divIcon({ className: "", html: '<span class="carte-ville' + (grande ? " carte-ville--grande" : "") + '">' + esc(v[0].replace(/ \([^)]*\)$/, "")) + "</span>", iconSize: [0, 0] }) }).addTo(calque);
      });
    }
    carte.on("zoomend moveend", maj);
    carte.whenReady(maj);
  }

  function creer(boite, secours) {
    cartes.forEach(function (c) { try { c.remove(); } catch (e) {} });
    cartes = [];
    if (typeof L === "undefined" || !boite) return null;
    var carte = L.map(boite, { zoomControl: true, scrollWheelZoom: false, attributionControl: true, preferCanvas: true, minZoom: 3, maxZoom: 15 });
    carte.attributionControl.setPrefix(false);
    carte.attributionControl.addAttribution("Fond : Natural Earth");
    var terre = { color: "#C7BCA9", weight: 1, fillColor: "#F7F3EA", fillOpacity: 1, interactive: false };
    (RB.fondCarte || []).forEach(function (poly) { L.polygon(poly, terre).addTo(carte); });
    boite.classList.add("carte--prete");
    if (secours) secours.hidden = true;
    cartes.push(carte);
    return carte;
  }

  RB.carte = {};

  // Les nuits du voyage, sans répéter un même lieu sur plusieurs jours de suite
  function etapes(v) {
    var l = [];
    v.jours.forEach(function (j) {
      if (typeof j.lat !== "number" || j.type === "mer") return;
      var der = l[l.length - 1];
      if (der && Math.abs(der.lat - j.lat) < 1e-4 && Math.abs(der.lon - j.lon) < 1e-4) { der.fin = j.n; return; }
      l.push({ lat: j.lat, lon: j.lon, nom: j.type === "retour" ? v.maison.nom : j.vers, debut: j.n, fin: j.n, retour: j.type === "retour" });
    });
    return l;
  }

  RB.carte.route = function (boite, v, secours) {
    var carte = creer(boite, secours);
    if (!carte) return;
    var et = etapes(v), maison = [v.maison.lat, v.maison.lon];
    var trace = [maison].concat(et.map(function (e) { return [e.lat, e.lon]; }));
    L.polyline(trace, { color: "#6E8E86", weight: 3, opacity: .9, dashArray: "6 6" }).addTo(carte);
    L.marker(maison, { icon: point("carte-point--maison", "⌂"), keyboard: false })
      .bindPopup("<strong>Départ</strong><br>" + esc(v.maison.nom)).addTo(carte);
    var n = 0;
    et.forEach(function (e) {
      if (e.retour) return;
      n++;
      var jours = e.debut === e.fin ? "Jour " + e.debut : "Jours " + e.debut + " à " + e.fin;
      L.marker([e.lat, e.lon], { icon: point("", n), title: e.nom })
        .bindPopup("<strong>" + esc(e.nom) + "</strong><br>" + jours + '<br><a href="#/jour/' + e.debut + '">Voir la journée</a>').addTo(carte);
    });
    carte.fitBounds(L.latLngBounds(trace), { padding: [24, 24], maxZoom: 11 });
    nomsDesVilles(carte, trace);
  };

  RB.carte.jour = function (boite, v, j) {
    if (typeof j.lat !== "number") return;
    var carte = creer(boite, null);
    if (!carte) return;
    var ici = [j.lat, j.lon], pts = [ici];
    var prec = v.jours[j.n - 2];
    var depuis = prec && typeof prec.lat === "number" ? [prec.lat, prec.lon] : (j.n === 1 ? [v.maison.lat, v.maison.lon] : null);
    if (depuis && j.km > 0 && (depuis[0] !== ici[0] || depuis[1] !== ici[1])) {
      L.polyline([depuis, ici], { color: "#6E8E86", weight: 3, opacity: .9, dashArray: "6 6" }).addTo(carte);
      L.marker(depuis, { icon: point("carte-point--depuis", "•"), keyboard: false })
        .bindPopup("<strong>Ce matin</strong><br>" + esc(j.depuis)).addTo(carte);
      pts.push(depuis);
    }
    L.marker(ici, { icon: point("carte-point--soir", "★"), zIndexOffset: 1000 }).bindPopup("<strong>" + esc(j.vers) + "</strong>").addTo(carte);
    // Le nom de la ville, écrit à côté de l’étoile
    L.marker(ici, { interactive: false, keyboard: false, zIndexOffset: 900,
      icon: L.divIcon({ className: "", html: '<span class="carte-nom-soir">' + esc(j.vers) + "</span>", iconSize: [0, 0] }) }).addTo(carte);
    (j.lieux || []).forEach(function (l) {
      if (typeof l.lat !== "number") return;
      var nom = l.nom || TYPE[l.type] || "";
      L.marker([l.lat, l.lon], { icon: point("carte-point--lieu carte-point--" + l.type, l.type), title: nom })
        .bindPopup("<strong>" + esc(nom) + "</strong><br>" + esc(TYPE[l.type] || "") +
          (typeof l.km === "number" ? " · " + String(l.km).replace(".", ",") + " km" : "") +
          '<br><a href="https://www.openstreetmap.org/?mlat=' + l.lat + "&mlon=" + l.lon + '#map=17/' + l.lat + "/" + l.lon + '" target="_blank" rel="noopener">Voir sur la carte</a>')
        .addTo(carte);
      pts.push([l.lat, l.lon]);
    });
    if (pts.length > 1) carte.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [36, 32], paddingBottomRight: [16 + Math.min(150, 9 * String(j.vers).length + 30), 32], maxZoom: 12 });
    else carte.setView(ici, 11).panBy([Math.min(70, 4 * String(j.vers).length), 0], { animate: false });
    nomsDesVilles(carte, pts);
  };
})();
