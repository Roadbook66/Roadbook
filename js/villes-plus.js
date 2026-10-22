/* =========================================================================
   Roadbook — les pays ajoutés : Andorre, Liechtenstein, Saint-Marin, Vatican,
   Kosovo, Moldavie. Ukraine, Biélorussie et Russie ne font pas partie de Roadbook.
   ========================================================================= */
RB.pays.AD = "Andorre"; RB.pays.LI = "Liechtenstein"; RB.pays.SM = "Saint-Marin";
RB.pays.VA = "Vatican"; RB.pays.XK = "Kosovo"; RB.pays.MD = "Moldavie";

RB.regles.AD = "Andorre : pas de péage ni de vignette. Douane à la sortie : quantités limitées pour le tabac, l’alcool et le carburant.";
RB.regles.LI = "Liechtenstein : on y arrive presque toujours par la Suisse, donc vignette suisse si tu prends l’autoroute.";
RB.regles.SM = "Saint-Marin : pas de frontière à passer depuis l’Italie. Le centre historique est fermé aux véhicules : gare-toi aux parkings du bas.";
RB.regles.VA = "Vatican : on n’y entre pas en véhicule. Laisse ton van dans un parking-relais à l’extérieur de Rome et viens en transports.";
RB.regles.XK = "Kosovo : la carte verte n’y est pas valable, l’assurance s’achète à la frontière. Si tu entres au Kosovo par l’Albanie, la Macédoine du Nord ou le Monténégro, la Serbie peut te refuser l’entrée depuis le Kosovo : ressors par où tu es entré.";
RB.regles.MD = "Moldavie : vignette (rovinietă) obligatoire, en ligne ou à la frontière ; la carte verte est valable. La Transnistrie n’est pas proposée.";

// Le Kosovo et la Moldavie ont leur propre zone : on n’y entre que par les frontières listées plus bas
RB.zonePays.XK = "XK"; RB.zonePays.MD = "MD";
RB.zonePays.SM = "IT"; RB.zonePays.VA = "IT";

RB.villes = RB.villes.concat([
  // Andorre et ses portes
  ["Andorre-la-Vieille","AD",42.507,1.522,0],["Pas de la Case","AD",42.543,1.733,0],
  ["Ax-les-Thermes","FR",42.72,1.838,0],["La Seu d’Urgell","ES",42.358,1.461,0],
  // Liechtenstein
  ["Vaduz","LI",47.141,9.521,0],["Feldkirch","AT",47.237,9.598,0],
  // Saint-Marin et le Vatican
  ["Saint-Marin","SM",43.936,12.447,0],["Cité du Vatican","VA",41.903,12.453,0],
  // Kosovo
  ["Pristina","XK",42.663,21.165,1],["Prizren","XK",42.214,20.741,0],["Peja","XK",42.659,20.288,0],
  ["Mitrovica","XK",42.891,20.866,0],["Gjakova","XK",42.381,20.43,0],["Gjilan","XK",42.464,21.47,0],
  ["Ferizaj","XK",42.37,21.155,0],
  ["Kukës","AL",42.077,20.422,0],["Rožaje","ME",42.84,20.167,0],
  // Moldavie
  ["Chișinău","MD",47.011,28.863,1],["Bălți","MD",47.762,27.929,0],["Orhei","MD",47.385,28.824,0],
  ["Soroca","MD",48.157,28.296,0],["Ungheni","MD",47.211,27.8,0],["Hîncești","MD",46.828,28.59,0],
  ["Comrat","MD",46.298,28.656,0],["Cahul","MD",45.904,28.194,0],["Edineț","MD",48.168,27.305,0],
  ["Galați","RO",45.435,28.008,0],["Huși","RO",46.674,28.06,0]
]);

RB.liens = RB.liens.concat([
  ["Kukës", "Prizren", "route", 0, "Frontière Albanie → Kosovo (Morinë)"],
  ["Skopje", "Ferizaj", "route", 0, "Frontière Macédoine du Nord → Kosovo (Blace)"],
  ["Rožaje", "Peja", "route", 0, "Frontière Monténégro → Kosovo (Kulla)"],
  ["Iași", "Ungheni", "route", 0, "Frontière Roumanie → Moldavie (Sculeni)"],
  ["Huși", "Hîncești", "route", 0, "Frontière Roumanie → Moldavie (Albița – Leușeni)"],
  ["Galați", "Cahul", "route", 0, "Frontière Roumanie → Moldavie (Giurgiulești)"]
]);

(function () {
  var hors = "ne fait pas partie de Roadbook.";
  ["russie", "moscou", "saint petersbourg", "kaliningrad", "bielorussie", "minsk",
   "ukraine", "kiev", "kyiv", "lviv", "odessa", "kharkiv", "crimee"].forEach(function (k) { RB.horsRoute[k] = hors; });
  RB.horsRoute.transnistrie = "n’est pas proposée : Roadbook s’arrête à la Moldavie reconnue.";
  RB.horsRoute.tiraspol = "est en Transnistrie, qui n’est pas proposée.";
  RB.horsRoute.abkhazie = "n’est pas proposée.";
  RB.horsRoute["ossetie du sud"] = "n’est pas proposée.";
  delete RB.horsRoute.moldavie;
})();

/* Toutes les villes : une liste compacte par pays, « Nom lat lon | Nom lat lon | … ».
   Ces villes servent de départ ou de destination ; la route passe par les grands axes
   et elles sont des « culs-de-sac » du réseau (on y va, on n’y passe pas). */
RB.ajouterVilles = function (code, texte, dejaVerifie) {
  function case_(v) { return v[1] + ":" + Math.round(v[2] * 50) + ":" + Math.round(v[3] * 50); }
  if (!RB._nomsVilles) {
    RB._nomsVilles = {}; RB._grille = {};
    RB.villes.forEach(function (v) { RB._nomsVilles[v[0]] = v; (RB._grille[case_(v)] = RB._grille[case_(v)] || []).push(v); });
  }
  var noms = RB._nomsVilles, grille = RB._grille;
  // Le même lieu sous un autre nom (à moins d’un kilomètre, dans le même pays) n’est pas ajouté deux fois
  function dejaLa(v) {
    var la = Math.round(v[2] * 50), lo = Math.round(v[3] * 50);
    for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) {
      var l = grille[v[1] + ":" + (la + i) + ":" + (lo + j)];
      if (l && l.some(function (w) { return km(w, v) < 1; })) return true;
    }
    return false;
  }
  function km(a, b) {
    var r = Math.PI / 180, x = (b[3] - a[3]) * r * Math.cos((a[2] + b[2]) / 2 * r), y = (b[2] - a[2]) * r;
    return 6371 * Math.sqrt(x * x + y * y);
  }
  texte.split("|").forEach(function (morceau) {
    var t = morceau.trim().split(/\s+/);
    if (t.length < 3) return;
    var lon = parseFloat(t.pop()), lat = parseFloat(t.pop()), nom = t.join(" ");
    if (isNaN(lat) || isNaN(lon)) return;
    var v = [nom, code, lat, lon, 0, 1];
    if (!dejaVerifie && dejaLa(v)) return; // la liste GeoNames est déjà dédoublonnée
    var deja = noms[nom];
    if (deja) {
      if (km(deja, v) < 25) return;                   // la même ville, déjà connue
      nom = nom + " (" + RB.pays[code] + ")";          // un homonyme dans un autre pays
      if (noms[nom]) return;
      v[0] = nom;
    }
    noms[nom] = v;
    // Seeland, Lolland, Falster et Møn : la zone de Copenhague (reliée par le pont du Grand Belt)
    if (code === "DK" && lon > 10.95 && lat < 56.2) RB.zoneVille[nom] = "DKZ";
    RB.villes.push(v);
    (grille[case_(v)] = grille[case_(v)] || []).push(v);
  });
};
