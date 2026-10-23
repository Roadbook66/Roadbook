/* =========================================================================
   Roadbook — aires de camping-cars, campings, parkings de nuit, points d’eau et vidanges
   Données © les contributeurs d’OpenStreetMap (ODbL), un fichier par pays dans js/aires/.
   En France, complétées par DATAtourisme (offices de tourisme, Licence Ouverte 2.0) : 15e valeur « D ».
   Chaque lieu : [type, lat, lon, nom, eau, vidange, électricité, douches, chiens, payant,
                  capacité, horaires, site (« M:… » site de la mairie, « L:… » site du camping ou de l’aire, sinon vide), ville]
   type : A aire de camping-cars · C camping · P parking autorisé aux camping-cars
          V station de vidange · E point d’eau
   valeurs : 1 oui · 0 non · 2 pas d’info · 3 réservé aux clients (chiens : en laisse)
   Ces informations n’ont pas été vérifiées sur place : l’eau, la vidange et la nuit restent
   « à confirmer sur place ».
   ========================================================================= */
(function () {
  var donnees = {}, charges = {}, enCours = {};
  var grille = {};   // index des lieux par case de 0,25°
  function cle(la, lo) { return Math.round(la * 4) + ":" + Math.round(lo * 4); }
  function km(a, b, c, d) {
    var r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r;
    return 6371 * Math.sqrt(x * x + y * y);
  }

  RB.aires = {};
  RB.aires.ajouter = function (code, liste) {
    donnees[code] = liste;
    charges[code] = true;
    liste.forEach(function (l) { (grille[cle(l[1], l[2])] = grille[cle(l[1], l[2])] || []).push(l); });
  };
  RB.aires.estCharge = function (code) { return !!charges[code]; };

  // Charge les fichiers des pays demandés (une seule fois chacun), puis appelle fin()
  RB.aires.charger = function (codes, fin) {
    var aCharger = codes.filter(function (c) { return !charges[c]; });
    var reste = aCharger.length, fini = false;
    function finir() { if (!fini) { fini = true; fin(); } }
    if (!reste) { finir(); return; }
    function un() { if (--reste <= 0) finir(); }
    aCharger.forEach(function (c) {
      if (enCours[c]) { enCours[c].push(un); return; }
      enCours[c] = [un];
    });
    aCharger.forEach(function (c) {
      if (enCours[c].lance) return;
      enCours[c].lance = true;
      var s = document.createElement("script");
      s.src = "js/aires/" + c + ".js";
      var termine = function () { charges[c] = true; var l = enCours[c] || []; delete enCours[c]; l.forEach(function (f) { f(); }); };
      s.onload = termine;
      // Sans réseau : la copie gardée lors de la préparation du voyage
      s.onerror = function () { if (RB.horsLigne) RB.horsLigne.scriptGarde("js/aires/" + c + ".js", termine); else termine(); };
      document.head.appendChild(s);
    });
    setTimeout(finir, 12000); // sans réseau, on n’attend pas indéfiniment
  };

  // Les lieux autour d’un point, du plus proche au plus loin
  RB.aires.autour = function (la, lo, rayon) {
    var res = [], n = Math.ceil(rayon / 27) + 1, i0 = Math.round(la * 4), j0 = Math.round(lo * 4);
    for (var i = -n; i <= n; i++) for (var j = -n; j <= n; j++) {
      (grille[(i0 + i) + ":" + (j0 + j)] || []).forEach(function (l) {
        var d = km(la, lo, l[1], l[2]);
        if (d <= rayon) res.push({ l: l, d: d });
      });
    }
    // Les aires et campings ajoutés par Roadbook (mode administratrice)
    (RB.airesEnPlus || []).forEach(function (l) {
      var d = km(la, lo, l[1], l[2]);
      if (d <= rayon) res.push({ l: l, d: d });
    });
    return res.sort(function (a, b) { return a.d - b.d; });
  };

  // Les pays à charger pour un voyage : celui de chaque nuit, et ses voisins proches (près des frontières)
  var grilleVilles = null;
  function paysAutour(la, lo) {
    if (!grilleVilles) {
      grilleVilles = {};
      RB.villes.forEach(function (v) { var k = Math.round(v[2] * 2) + ":" + Math.round(v[3] * 2); (grilleVilles[k] = grilleVilles[k] || []).push(v); });
    }
    var res = {}, i0 = Math.round(la * 2), j0 = Math.round(lo * 2), best = null, bd = Infinity;
    for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) {
      (grilleVilles[(i0 + i) + ":" + (j0 + j)] || []).forEach(function (v) {
        var d = km(la, lo, v[2], v[3]);
        if (d < 30) res[v[1]] = 1;
        if (d < bd) { bd = d; best = v[1]; }
      });
    }
    if (best) res[best] = 1;
    return Object.keys(res);
  }
  RB.aires.paysDuVoyage = function (v) {
    var codes = {};
    v.jours.forEach(function (j) { if (j.dormir && typeof j.lat === "number") paysAutour(j.lat, j.lon).forEach(function (c) { codes[c] = 1; }); });
    return Object.keys(codes);
  };

  function lieu(x) {
    var l = x.l;
    return { type: l[0], nom: String(l[3] || "").replace(/^["«\s]+|["»\s]+$/g, ""), lat: l[1], lon: l[2], km: Math.round(x.d * 10) / 10,
      eau: l[4], vidange: l[5], elec: l[6], douche: l[7], chien: l[8], payant: l[9],
      capacite: l[10], horaires: l[11], site: l[12], ville: l[13], source: l[14] || "", ajout: l[15] || null };
  }
  function score(x, prefere) {
    var l = x.l, s = x.d;
    if (l[4] === 1 || l[4] === 3) s -= 2.5;           // eau
    if (l[5] === 1 || l[5] === 3) s -= 2.5;           // vidange
    if (l[6] === 1) s -= 1;
    if (l[3]) s -= 1;                                  // un lieu qui a un nom est plus facile à trouver
    if (prefere && l[0] !== prefere) s += 1.5;
    if (l[14] === "R") s -= 8;                         // ajouté et vérifié par Roadbook : en premier
    return s;
  }
  function meilleur(liste, types, prefere) {
    var l = liste.filter(function (x) { return types.indexOf(x.l[0]) >= 0; });
    if (!l.length) return null;
    l.sort(function (a, b) { return score(a, prefere) - score(b, prefere); });
    return l[0];
  }

  // Pour une nuit : une aire (ou un parking autorisé), un camping, et au besoin le point d’eau
  // ou la vidange la plus proche
  RB.aires.pourLaNuit = function (la, lo) {
    var proches = RB.aires.autour(la, lo, 15);
    var loin = null;
    function ou(types, prefere) {
      var m = meilleur(proches, types, prefere);
      if (!m) { loin = loin || RB.aires.autour(la, lo, 35); m = meilleur(loin, types, prefere); }
      return m;
    }
    var res = [];
    var aire = ou(["A", "P"], "A"), camping = ou(["C"]);
    if (aire) res.push(lieu(aire));
    if (camping) res.push(lieu(camping));
    var base = aire || camping;
    var manqueEau = !base || !(base.l[4] === 1 || base.l[4] === 3);
    var manqueVid = !base || !(base.l[5] === 1 || base.l[5] === 3);
    if (manqueEau || manqueVid) {
      var service = proches.filter(function (x) {
        return (x.l[0] === "V" || x.l[0] === "E" || x.l[0] === "A") && x !== aire &&
          ((manqueVid && (x.l[5] === 1 || x.l[5] === 3)) || (manqueEau && (x.l[4] === 1 || x.l[4] === 3)));
      })[0];
      if (service) res.push(lieu(service));
    }
    return res;
  };

  // Ajoute à chaque nuit du voyage les vrais lieux pour dormir
  RB.aires.enrichir = function (v, fin) {
    var codes = RB.aires.paysDuVoyage(v);
    RB.aires.charger(codes, function () {
      var memo = {};
      v.jours.forEach(function (j) {
        if (!j.dormir || typeof j.lat !== "number") return;
        var k = j.lat.toFixed(3) + "," + j.lon.toFixed(3);
        j.lieux = memo[k] || (memo[k] = RB.aires.pourLaNuit(j.lat, j.lon));
      });
      v.lieuxFaits = true;
      fin(v);
    });
  };
})();
