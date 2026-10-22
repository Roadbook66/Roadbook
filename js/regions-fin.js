/* =========================================================================
   Roadbook — après les régions officielles
   1. Les étapes loin de toute ville connue deviennent des points du réseau
      routier, pour que la route y mène vraiment.
   2. Chaque région rejoint sa partie de l’Europe (et la Turquie a la sienne).
   ========================================================================= */
(function () {
  function km(a, b) {
    var R = 6371, r = Math.PI / 180;
    var dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // 1. Nouveaux points du réseau
  var noms = {};
  RB.villes.forEach(function (v) { noms[v[0]] = 1; });
  RB.circuits.forEach(function (c) {
    if (!c.officielle) return;
    c.stages.forEach(function (s) {
      if (noms[s.nom]) return;
      var proche = RB.villes.some(function (v) { return km([v[2], v[3]], [s.lat, s.lon]) < 22; });
      if (proche) return;
      RB.villes.push([s.nom, c.paysCode, s.lat, s.lon, 0, 1]);
      noms[s.nom] = 1;
    });
  });

  // 2. Les parties de l’Europe
  if (!RB.parties.some(function (p) { return p.id === "turquie"; })) {
    var iCaucase = RB.parties.map(function (p) { return p.id; }).indexOf("caucase");
    RB.parties.splice(iCaucase < 0 ? RB.parties.length : iCaucase, 0,
      { id: "turquie", nom: "La Turquie", sous: "Istanbul, la Cappadoce, la côte turquoise", circuits: [] });
  }
  var parId = {};
  RB.parties.forEach(function (p) { parId[p.id] = p; });
  RB.circuits.forEach(function (c) {
    if (!c.officielle) return;
    var p = parId[c.partie];
    if (p && p.circuits.indexOf(c.id) < 0) p.circuits.push(c.id);
  });
  var nomsParties = { balkans: "Balkans, Grèce, Roumanie et Moldavie" };
  RB.parties.forEach(function (p) { if (nomsParties[p.id]) p.nom = nomsParties[p.id]; });
  var sous = {
    france: "Toutes les régions de France continentale",
    iberie: "Toutes les régions d’Espagne, du Portugal et d’Andorre",
    italie: "De la vallée d’Aoste à la Calabre, avec Saint-Marin et le Vatican",
    centre: "Allemagne, Benelux, Suisse, Liechtenstein, Autriche, Pologne, Tchéquie, Slovaquie, Hongrie",
    nord: "Danemark, Norvège, Suède, Finlande, pays baltes",
    balkans: "Slovénie, Croatie, Bosnie, Serbie, Monténégro, Kosovo, Albanie, Macédoine, Grèce, Bulgarie, Roumanie, Moldavie",
    turquie: "Les sept régions, d’Istanbul au mont Ararat",
    caucase: "Toutes les régions de Géorgie et d’Arménie"
  };
  RB.parties.forEach(function (p) { if (sous[p.id]) p.sous = sous[p.id]; });

  // Le pays de chaque itinéraire, pour choisir « pays puis région »
  RB.paysCircuit = function (c) { return c.paysCode || String(c.pays || "").toUpperCase(); };
})();
