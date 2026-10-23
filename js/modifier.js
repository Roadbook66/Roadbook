/* =========================================================================
   Roadbook — modifier sa route
   · Rester un jour de plus quelque part (une journée sur place s’ajoute)
   · Retirer une journée sur place, ou sauter une étape
   Les jours sont renumérotés, les dates et les kilomètres recalculés.
   ========================================================================= */
(function () {
  function km(a, b) {
    var r = Math.PI / 180, x = (b.lon - a.lon) * r * Math.cos((a.lat + b.lat) / 2 * r), y = (b.lat - a.lat) * r;
    return 6371 * Math.sqrt(x * x + y * y);
  }
  function simple(t) { return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s*\(.*\)\s*/g, "").trim(); }
  function copie(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }

  // Numéros, dates et total après une modification
  function recalculer(v) {
    v.jours.forEach(function (j, i) { j.n = i + 1; });
    var a = v.reponses || {};
    if (a.date) {
      var d0 = new Date(a.date + "T12:00:00"), N = v.jours.length;
      var opts = { weekday: "short", day: "numeric", month: "short" };
      if (N > 1 && new Date(d0.getTime() + (N - 1) * 86400000).getFullYear() !== d0.getFullYear()) opts.year = "numeric";
      var f = new Intl.DateTimeFormat("fr-FR", opts);
      v.jours.forEach(function (j, i) { j.date = f.format(new Date(d0.getTime() + i * 86400000)); });
    }
    v.totalKm = v.jours.reduce(function (t, j) { return t + (j.km || 0); }, 0);
    v.modifie = true;
  }

  RB.modifier = {};

  // On peut rester un jour de plus partout où l’on dort (pas en mer, pas le jour du retour)
  RB.modifier.peutRester = function (v, j) { return !!j.dormir && j.type !== "mer" && j.type !== "retour"; };
  // Une journée sur place se retire ; une étape se saute si elle n’est ni la première ni la dernière
  // Les journées sur place qui suivent une étape, au même endroit
  function surPlace(v, j) {
    var k = 0;
    while (v.jours[j.n + k] && v.jours[j.n + k].type === "pause" && v.jours[j.n + k].lieuId === j.lieuId) k++;
    return k;
  }
  RB.modifier.joursSautes = function (v, j) { return j.type === "pause" ? 1 : 1 + surPlace(v, j); };
  RB.modifier.peutRetirer = function (v, j) {
    if (j.type === "pause") return v.jours.length > 1;
    if (j.type !== "etape" && j.type !== "arrivee") return false;
    var suiv = v.jours[j.n + surPlace(v, j)];
    return j.n > 1 && !!suiv && suiv.type !== "mer";
  };

  // Changer une étape : d’autres étapes proches, ou une ville au choix
  RB.modifier.peutChanger = function (v, j) {
    return (j.type === "etape" || j.type === "arrivee") && !!j.dormir && !!RB.etapesPossibles;
  };
  function avant(v, n) { var p = v.jours[n - 2]; return p ? { lat: p.lat, lon: p.lon, nom: p.vers } : { lat: v.maison.lat, lon: v.maison.lon, nom: v.maison.nom }; }
  function apres(v, n) { var j = v.jours[n - 1]; return v.jours[n - 1 + 1 + surPlace(v, j)] || null; }
  RB.modifier.propositions = function (v, n) {
    var j = v.jours[n - 1], suiv = apres(v, n);
    var deja = v.jours.map(function (x) { return x.lieuId; });
    // Pas une étape déjà au programme, ni presque au même endroit (moins de 10 km), ni deux fois la même
    var pris = v.jours.filter(function (x) { return typeof x.lat === "number" && x.type !== "retour"; });
    var nomsPris = v.jours.map(function (x) { return simple(x.vers); });
    var l = [];
    RB.etapesPossibles(avant(v, n), suiv && suiv.type !== "retour" ? suiv : null, { lat: j.lat, lon: j.lon }, deja).forEach(function (x) {
      if (l.length >= 8) return;
      if (pris.some(function (p) { return km(p, x.s) < 10; })) return;
      if (l.some(function (y) { return km(y.s, x.s) < 10; })) return;
      if (nomsPris.some(function (nm) { var a = simple(x.s.nom); return nm && (nm.indexOf(a) >= 0 || a.indexOf(nm) >= 0); })) return;
      l.push(x);
    });
    return l;
  };
  RB.modifier.changerEtape = function (v, n, choix) {
    var j = v.jours[n - 1];
    if (!j || !RB.modifier.peutChanger(v, j)) return false;
    var a = v.reponses || {}, k = 1 + surPlace(v, j), prec = avant(v, n);
    var nouveaux = [RB.jourVers(a, choix, j.type, prec.nom, prec)];
    for (var i = 1; i < k; i++) nouveaux.push(RB.jourVers(a, choix, "pause", choix.s.nom, null));
    nouveaux.forEach(function (x) { x.region = j.region || x.region; x.paysDepuis = x === nouveaux[0] ? (v.jours[n - 2] || {}).pays || (v.maison && v.maison.pays) : x.pays; });
    // Une ville au choix : la photo de l’étape préparée la plus proche (moins de 20 km), s’il y en a une
    if (/^ville-/.test(choix.s.id)) {
      var proche = null, dp = 20;
      RB.circuits.forEach(function (c) { c.stages.forEach(function (s) { var d = km(s, choix.s); if (d < dp) { dp = d; proche = s; } }); });
      nouveaux.forEach(function (x) { if (proche) x.photoLieu = proche.id; });
    }
    var suiv = v.jours[n - 1 + k];
    v.jours.splice.apply(v.jours, [n - 1, k].concat(nouveaux));
    if (suiv && suiv.type !== "mer") {
      var t = RB.trajetEstime(a, choix.s, suiv);
      suiv.depuis = choix.s.nom; suiv.paysDepuis = nouveaux[0].pays;
      suiv.km = t.km; suiv.min = t.min; suiv.estime = true;
      delete suiv.planning;
    }
    v.lieuxFaits = false;
    recalculer(v);
    return true;
  };

  RB.modifier.resterUnJour = function (v, n) {
    var j = v.jours[n - 1];
    if (!j || !RB.modifier.peutRester(v, j)) return false;
    // La journée d’étape d’origine garde ses idées de visite ; une liaison propose le centre de la ville
    var p = {
      type: "pause", depuis: j.vers, vers: j.vers, lieuId: j.lieuId, lat: j.lat, lon: j.lon,
      km: 0, min: 0, ferryMin: 0, photo: j.photo, photoLieu: j.photoLieu, route: null,
      reperes: copie(j.type === "liaison" ? (j.reperes || []).filter(function (r) { return !/^En chemin/.test(r.nom) && r.nom !== "Avant de repartir"; }) : j.reperes),
      dormir: copie(j.dormir), lieux: copie(j.lieux), choixNuit: j.choixNuit,
      pays: j.pays, paysDepuis: j.pays, region: j.region, statut: j.statut, aConfirmer: j.aConfirmer, ajoute: true
    };
    v.jours.splice(n, 0, p);
    recalculer(v);
    return true;
  };

  RB.modifier.retirer = function (v, n) {
    var j = v.jours[n - 1];
    if (!j || !RB.modifier.peutRetirer(v, j)) return false;
    var combien = 1;
    if (j.type !== "pause") {
      // Sauter l’étape (et ses journées sur place) : le jour suivant part de la veille, avec une distance estimée
      combien = 1 + surPlace(v, j);
      var prec = v.jours[n - 2], suiv = v.jours[n - 1 + combien];
      var d = km({ lat: prec.lat, lon: prec.lon }, { lat: suiv.lat, lon: suiv.lon }) * 1.3;
      suiv.depuis = prec.vers; suiv.paysDepuis = prec.pays;
      suiv.km = Math.round(d / 5) * 5;
      suiv.min = Math.round(d / 70 * 60 / 5) * 5;
      suiv.estime = true;
      delete suiv.planning;
    }
    v.jours.splice(n - 1, combien);
    recalculer(v);
    return true;
  };
})();
