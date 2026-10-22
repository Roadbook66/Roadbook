/* =========================================================================
   Roadbook — construction des régions officielles
   Chaque région s’écrit en une ligne compacte :
     [nom de la région, titre, saison ("" | "nord" | "montagne" | "sud"), étapes]
   et chaque étape :
     [nom, latitude, longitude, repère 1, texte 1, repère 2, texte 2]
   Ces régions n’ont pas encore de repérages : tout est « proposé »,
   et les nuits, l’eau et la vidange sont « à confirmer sur place ».
   ========================================================================= */
(function () {
  function slug(t) {
    return String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  var dejaPris = {};
  function idUnique(base) {
    var id = base, n = 2;
    while (dejaPris[id]) id = base + "-" + (n++);
    dejaPris[id] = 1;
    return id;
  }
  // Les identifiants des étapes déjà écrites à la main ne doivent pas être repris
  function reserverExistants() {
    (RB.circuits || []).forEach(function (c) { c.stages.forEach(function (s) { dejaPris[s.id] = 1; }); });
  }

  RB.ajouterRegions = function (code, partie, liste) {
    reserverExistants();
    // On saute une région seulement si le même pays a déjà un itinéraire détaillé du même nom
    var existantes = {};
    RB.circuits.forEach(function (c) { existantes[(c.paysCode || String(c.pays).toUpperCase()) + ":" + slug(c.dest)] = 1; });
    liste.forEach(function (r) {
      var nom = r[0], titre = r[1], saison = r[2] || "", etapes = r[3];
      if (existantes[code + ":" + slug(nom)]) return; // déjà un itinéraire détaillé du même nom
      var c = {
        id: idUnique(code.toLowerCase() + "-" + slug(nom)),
        dest: nom, titre: titre, pays: code.toLowerCase(), paysCode: code, partie: partie,
        saison: saison, officielle: true, tags: [], aventure: saison === "montagne" ? 2 : 1,
        stages: etapes.map(function (e, i) {
          return {
            id: idUnique(code.toLowerCase() + "-" + slug(e[0])),
            nom: e[0], lat: e[1], lon: e[2], pause: i % 3 === 1 ? 1 : 0,
            rep: [[e[3], e[4], "p"], [e[5], e[6], "p"]],
            route: ["c", 3, "", ""],
            aire: ["près de " + e[0], "c", null, null, null],
            camp: ["près de " + e[0], "c", null, null, null]
          };
        })
      };
      RB.circuits.push(c);
    });
  };
})();
