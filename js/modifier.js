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
