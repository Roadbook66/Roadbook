/* =========================================================================
   Roadbook — générateur de route jour par jour (sans service externe)
   Entrée : les réponses du questionnaire. Sortie : un voyage complet.
   Les liaisons passent par un réseau de villes européennes reliées par la
   route, et par des ponts, tunnels et ferries entre les zones (voir villes.js).
   ========================================================================= */
(function () {
  var RB = window.RB;

  var MAX_H = { tranquille: 2.5, equilibre: 4, aventureux: 5.5 };       // heures de liaison par jour
  var ETAPES = { tranquille: 0.6, equilibre: 0.8, aventureux: 1 };      // part des jours qui roulent
  var BUDGET = { serre: [40, 60], confort: [60, 120], large: [120, 200] }; // € / jour pour deux
  var FERRY_LONG = 5;          // au-delà, on passe la nuit à bord
  var FERRY_ATTENTE = 1.5;     // embarquement, en heures
  var FERRY_PENALITE = 1.5;    // on préfère la route quand c’est presque pareil

  /* ---------- Outils de distance ---------- */
  function vol(a, b) {
    var R = 6371, t = Math.PI / 180;
    var dLat = (b.lat - a.lat) * t, dLon = (b.lon - a.lon) * t;
    var h = Math.pow(Math.sin(dLat / 2), 2) +
      Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.pow(Math.sin(dLon / 2), 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function routeKm(a, b, facteur) {
    return Math.max(5, Math.round((vol(a, b) * facteur) / 5) * 5);
  }
  function minutes(km, vitesse) {
    return Math.max(10, Math.round((km / vitesse) * 60 / 5) * 5);
  }
  function texteDuree(h) {
    var m = Math.round(h * 60 / 15) * 15, hh = Math.floor(m / 60), mm = m % 60;
    if (!hh) return mm + " min";
    return hh + " h" + (mm ? " " + (mm < 10 ? "0" : "") + mm : "");
  }

  /* ---------- Contexte véhicule ---------- */
  function contexte(a) {
    var gab = { petit: 1, moyen: 2, grand: 3 }[a.taille] || 2;
    var lourd = a.taille === "grand";
    return {
      gab: gab,
      vLiaison: lourd ? 75 : 85, vCircuit: lourd ? 42 : 50,
      maxH: MAX_H[a.rythme] || 4,
      budget: a.budget || "confort", rythme: a.rythme || "equilibre"
    };
  }

  /* =====================================================================
     LE RÉSEAU
     ===================================================================== */
  var reseau = null;
  function zoneDe(nom, pays) { return RB.zoneVille[nom] || RB.zonePays[pays] || "C"; }

  function construireReseau() {
    var N = RB.villes.map(function (v, i) {
      return { i: i, nom: v[0], pays: v[1], lat: v[2], lon: v[3], zone: zoneDe(v[0], v[1]), feuille: !!v[5], aretes: [] };
    });
    var parNom = {};
    N.forEach(function (n) { parNom[n.nom] = n; });
    // Là où les grandes villes sont rares (Turquie, Grand Nord…), la ville la plus isolée
    // devient un carrefour, jusqu’à ce qu’aucune ne soit à plus de 100 km d’un carrefour
    var carrefours = N.filter(function (n) { return !n.feuille; });
    var isoles = N.filter(function (n) { return n.feuille; }).map(function (n) {
      var d2 = Infinity, cl = Math.cos(n.lat * Math.PI / 180), best = null;
      carrefours.forEach(function (c) {
        if (c.zone !== n.zone) return;
        var dx = (c.lon - n.lon) * cl, dy = c.lat - n.lat, e = dx * dx + dy * dy;
        if (e < d2) { d2 = e; best = c; }
      });
      return { n: n, d: best ? vol(n, best) : Infinity };
    });
    while (true) {
      var pire = null;
      isoles.forEach(function (x) { if (x.n.feuille && x.d > 100 && (!pire || x.d > pire.d)) pire = x; });
      if (!pire) break;
      pire.n.feuille = false;
      isoles.forEach(function (x) { if (x.n.feuille && x.n.zone === pire.n.zone) x.d = Math.min(x.d, vol(x.n, pire.n)); });
    }

    function relier(a, b, type, h, libelle) {
      if (a === b || a.aretes.some(function (e) { return e.vers === b.i && e.type === type; })) return;
      var km = type === "route" ? routeKm(a, b, 1.15) : 0;
      var inverse = libelle ? libelle.replace(a.nom + " → " + b.nom, b.nom + " → " + a.nom) : "";
      a.aretes.push({ vers: b.i, type: type, km: km, h: h, libelle: libelle || "" });
      b.aretes.push({ vers: a.i, type: type, km: km, h: h, libelle: inverse });
    }

    // Routes : chaque ville est reliée à ses voisines de la même zone
    // (les étapes ajoutées pour les régions sont des « culs-de-sac » : on y va, on n’y passe pas)
    var parZone = {};
    N.forEach(function (n) { if (!n.feuille) (parZone[n.zone] = parZone[n.zone] || []).push(n); });
    // les 5 plus proches, sans trier toute la liste (le réseau compte des milliers de villes)
    function cinqPlusProches(a, liste) {
      var top = [], cl = Math.cos(a.lat * Math.PI / 180);
      for (var i = 0; i < liste.length; i++) {
        var b = liste[i];
        if (b === a) continue;
        var dx = (b.lon - a.lon) * cl, dy = b.lat - a.lat, d2 = dx * dx + dy * dy;
        if (top.length < 5 || d2 < top[top.length - 1].d2) {
          var j = top.length < 5 ? top.length : 4;
          while (j > 0 && top[j - 1].d2 > d2) { top[j] = top[j - 1]; j--; }
          top[j] = { b: b, d2: d2 };
        }
      }
      return top.map(function (x) { return { b: x.b, d: vol(a, x.b) }; });
    }
    N.forEach(function (a) {
      var proches = cinqPlusProches(a, parZone[a.zone] || []);
      proches.forEach(function (p, k) {
        if (a.feuille ? k < 3 : (k < 2 || (k < 5 && p.d < 320))) relier(a, p.b, "route", 0, "");
      });
    });
    // Ponts, tunnels et ferries entre les zones
    RB.liens.forEach(function (l) {
      var a = parNom[l[0]], b = parNom[l[1]];
      if (a && b) relier(a, b, l[2], l[3], l[4]);
    });
    reseau = { noeuds: N, parNom: parNom, feuilles: N.map(function (n) { return n.feuille; }) };
    cacheProche = {};
  }

  var cacheProche = {};
  function noeudProche(pt, zone) {
    var cle = pt.lat + "," + pt.lon + "," + (zone || "");
    if (cacheProche[cle]) return cacheProche[cle];
    var best = null, bd = Infinity, cl = Math.cos(pt.lat * Math.PI / 180), ns = reseau.noeuds;
    for (var i = 0; i < ns.length; i++) {
      var n = ns[i];
      if (zone && n.zone !== zone) continue;
      var dx = (n.lon - pt.lon) * cl, dy = n.lat - pt.lat, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = n; }
    }
    cacheProche[cle] = best;
    return best;
  }

  // Plus courts chemins (en heures) depuis un nœud
  function dijkstra(depart, v) {
    // Tas binaire : le réseau compte des milliers de villes
    var n = reseau.noeuds.length, dist = new Float64Array(n).fill(Infinity), de = new Int32Array(n).fill(-1),
      parArete = new Array(n), vu = new Uint8Array(n);
    dist[depart.i] = 0;
    var tas = [[0, depart.i]];
    var feuilles = reseau.feuilles;
    function pousser(x) {
      tas.push(x); var k = tas.length - 1;
      while (k > 0) { var p = (k - 1) >> 1; if (tas[p][0] <= tas[k][0]) break; var t = tas[p]; tas[p] = tas[k]; tas[k] = t; k = p; }
    }
    function sortir() {
      var haut = tas[0], dernier = tas.pop();
      if (tas.length) {
        tas[0] = dernier; var k = 0;
        while (true) {
          var g = 2 * k + 1, d = g + 1, m = k;
          if (g < tas.length && tas[g][0] < tas[m][0]) m = g;
          if (d < tas.length && tas[d][0] < tas[m][0]) m = d;
          if (m === k) break;
          var t = tas[m]; tas[m] = tas[k]; tas[k] = t; k = m;
        }
      }
      return haut;
    }
    while (tas.length) {
      var h = sortir(), u = h[1], du = h[0];
      if (vu[u]) continue;
      vu[u] = 1;
      if (reseau.noeuds[u].feuille && u !== depart.i) continue;
      var ar = reseau.noeuds[u].aretes;
      for (var a = 0; a < ar.length; a++) {
        var e = ar[a];
        var cout = e.type === "route" ? e.km / v : e.h + FERRY_ATTENTE + FERRY_PENALITE;
        if (du + cout < dist[e.vers]) {
          dist[e.vers] = du + cout; de[e.vers] = u; parArete[e.vers] = e;
          // une petite ville est un cul-de-sac : inutile de la mettre dans le tas
          if (!feuilles[e.vers]) pousser([dist[e.vers], e.vers]);
        }
      }
    }
    return { dist: dist, de: de, arete: parArete };
  }

  // Liste des tronçons depuis la source jusqu’à un nœud
  function chemin(arbre, cible) {
    var segs = [], cur = cible.i;
    while (arbre.de[cur] >= 0) {
      var p = arbre.de[cur], e = arbre.arete[cur];
      segs.push({ de: reseau.noeuds[p], vers: reseau.noeuds[cur], type: e.type, km: e.km, h: e.h, libelle: e.libelle });
      cur = p;
    }
    return segs.reverse();
  }
  function inverser(segs) {
    return segs.slice().reverse().map(function (s) {
      var lib = s.libelle ? s.libelle.replace(s.de.nom + " → " + s.vers.nom, s.vers.nom + " → " + s.de.nom) : "";
      return { de: s.vers, vers: s.de, type: s.type, km: s.km, h: s.h, libelle: lib };
    });
  }
  function tronconRoute(a, b) { return { de: a, vers: b, type: "route", km: routeKm(a, b, 1.3), h: 0, libelle: "" }; }

  // Découpe une liaison en journées
  function decouper(segs, maxH, v) {
    var jours = [], cur = { segs: [], h: 0 };
    function fermer(fin, mode) {
      if (!cur.segs.length) return;
      jours.push({ segs: cur.segs, fin: fin, mode: mode });
      cur = { segs: [], h: 0 };
    }
    segs.forEach(function (s) {
      if (s.type === "ferry" && s.h > FERRY_LONG) {
        cur.segs.push(s);
        fermer(s.vers, "ferry");               // on embarque, nuit à bord
        for (var k = 0; k < Math.floor(s.h / 24); k++) jours.push({ segs: [], fin: s.vers, mode: "mer" });
        return;
      }
      var h = s.type === "route" ? s.km / v : s.h;
      // Une courte traversée peut allonger un peu la journée plutôt que d’en occuper une entière
      var limite = s.type === "ferry" ? maxH * 1.6 : maxH;
      // (un petit bout de route en fin de journée ne justifie pas une nuit de plus)
      if (cur.h > 0 && cur.h + h > limite && h > 0.5) fermer(s.de, "etape");
      cur.segs.push(s); cur.h += h;
    });
    fermer(segs.length ? segs[segs.length - 1].vers : null, "fin");
    if (jours.length && jours[jours.length - 1].mode !== "fin") {
      jours.push({ segs: [], fin: jours[jours.length - 1].fin, mode: "fin" });
    }
    if (!jours.length) jours.push({ segs: [], fin: null, mode: "fin" });
    return jours;
  }

  // Ce qu’on affiche pour une journée de liaison
  function resumeLiaison(j, v) {
    var km = 0, ferryH = 0, notes = [], pays = [];
    j.segs.forEach(function (s) {
      if (s.type === "route") km += s.km; else ferryH += s.h;
      if (s.libelle) {
        var t = s.type === "ferry"
          ? s.libelle + " (environ " + texteDuree(s.h) + "), à réserver."
          : s.libelle + ".";
        if (notes.indexOf(t) < 0) notes.push(t);
      }
      [s.de, s.vers].forEach(function (n) { if (n && n.pays && pays.indexOf(n.pays) < 0) pays.push(n.pays); });
    });
    pays.forEach(function (p) { if (RB.regles[p] && notes.indexOf(RB.regles[p]) < 0) notes.push(RB.regles[p]); });
    return { km: km, min: km ? minutes(km, v) : 0, ferryMin: Math.round(ferryH * 60), notes: notes, ferry: ferryH > 0 };
  }

  /* ---------- Statuts ---------- */
  // Une info critique non vérifiée est TOUJOURS "à confirmer sur place".
  function critique(s) { return s === "r" ? "r" : "c"; }

  function nomAire(pays) {
    return {
      es: "Área de autocaravanas", it: "Area sosta camper", pt: "Área de autocaravanas",
      de: "Stellplatz (aire)", at: "Stellplatz (aire)"
    }[pays] || "Aire de camping-cars";
  }
  function lieu(arr, type, pays) {
    if (!arr) return null;
    return {
      type: type,
      nom: (type === "aire" ? nomAire(pays) : "Camping") + " " + arr[0],
      statut: arr[1], eau: arr[2], vidange: arr[3], elec: arr[4]
    };
  }

  var REPLI = {
    eau: "Demande à la mairie ou à l’office de tourisme le point d’eau le plus proche. Garde toujours un bidon de 10 litres plein.",
    vidange: "Les campings voisins acceptent parfois la vidange pour quelques euros : demande à l’accueil.",
    dormir: "Un camping du secteur, ou une aire de service pour te reposer une nuit. Ne t’installe jamais là où un panneau l’interdit.",
    route: "Si un panneau limite la largeur, la hauteur ou le poids, fais demi-tour et reprends l’axe principal : c’est un détour, pas un problème."
  };

  function service(nom, cle, principal, repli, estCritique, repliCommun) {
    var v = principal[cle];
    var statut = (principal.statut === "r" && v !== null && v !== undefined) ? "r" : (estCritique ? "c" : "p");
    var valeur = v === 1 ? (statut === "r" ? "Oui" : "Annoncée") : v === 0 ? (statut === "r" ? "Non" : "Non annoncée") : "Non renseigné";
    var secours = "";
    if (estCritique && (statut !== "r" || v === 0)) {
      secours = (repli && repli[cle] === 1)
        ? (repliCommun ? "" : repli.nom + " : " + nom.toLowerCase() + " annoncée.")
        : REPLI[cle];
    }
    return { nom: nom, cle: cle, valeur: valeur, present: v, statut: statut, repli: secours };
  }

  function dormir(stage, ctx, pays) {
    var aire = lieu(stage.aire, "aire", pays), camp = lieu(stage.camp, "camping", pays);
    var preferCamp = ctx.budget === "large" || (ctx.budget === "confort" && stage.pause);
    var principal = preferCamp ? (camp || aire) : (aire || camp);
    var autre = principal === aire ? camp : aire;
    // Si l’autre lieu a été roulé et pas celui-ci, on préfère le lieu vérifié
    if (autre && principal.statut !== "r" && autre.statut === "r") {
      var tmp = principal; principal = autre; autre = tmp;
    }
    var statut = critique(principal.statut);
    var commun = statut !== "r" && !!autre;
    var offre = [];
    if (autre) {
      if (autre.eau === 1) offre.push("eau");
      if (autre.vidange === 1) offre.push("vidange");
      if (autre.elec === 1) offre.push("électricité");
    }
    var repliTexte = statut === "r" ? "" : autre
      ? autre.nom + (offre.length ? " (" + offre.join(", ") + " annoncées)" : "") + "."
      : REPLI.dormir;
    return {
      nom: principal.nom, type: principal.type, statut: statut,
      legal: statut === "r" ? "Stationnement de nuit autorisé." : "Stationnement de nuit à confirmer sur place (panneaux, mairie, accueil).",
      note: "",
      repli: repliTexte,
      services: [
        service("Eau", "eau", principal, autre, true, commun),
        service("Vidange", "vidange", principal, autre, true, commun),
        service("Électricité", "elec", principal, autre, false, commun)
      ]
    };
  }

  function dormirLiaison(ville) {
    var principal = { nom: "Aire de camping-cars près de " + ville, statut: "c", eau: null, vidange: null, elec: null };
    return {
      nom: principal.nom, type: "aire", statut: "c",
      legal: "Stationnement de nuit à confirmer sur place (panneaux, mairie, accueil).",
      note: "", repli: REPLI.dormir,
      services: [
        service("Eau", "eau", principal, null, true),
        service("Vidange", "vidange", principal, null, true),
        service("Électricité", "elec", principal, null, false)
      ]
    };
  }

  // Les routes : autoroutes et grands axes sont ouverts à tous les vans, fourgons et camping-cars.
  // On ne garde « à confirmer sur place » que pour une difficulté connue (gabarit, centre fermé…).
  var ROUTE_OK = "Routes ouvertes à tous les vans, fourgons et camping-cars.";
  function routeEtape(stage, ctx) {
    var r = stage.route || ["p", 3, "", ""];
    var passe = ctx.gab <= r[1];
    if (r[0] === "r" && passe) {
      return { statut: "r", texte: r[2] || "Route sans difficulté pour ton gabarit.", alerte: "", repli: "" };
    }
    if (!passe) {
      return { statut: "c", texte: r[2] || ROUTE_OK, alerte: "Signalée délicate pour ton gabarit.", repli: r[3] || REPLI.route };
    }
    if (r[2] && r[3]) { // une contrainte précise (zone à trafic limité, route étroite…)
      return { statut: "c", texte: r[2], alerte: "", repli: r[3] };
    }
    return { statut: "p", texte: r[2] || ROUTE_OK, alerte: "", repli: "" };
  }

  function routeLiaison(res) {
    return {
      statut: "p",
      texte: "Autoroutes et grands axes, ouverts à tous les vans, fourgons et camping-cars." + (res && res.notes.length ? " " + res.notes.join(" ") : ""),
      alerte: "", repli: ""
    };
  }

  function dormirFerry() {
    return {
      nom: "À bord du ferry", type: "ferry", statut: "c",
      legal: "Cabine ou fauteuil à réserver avec ta traversée.",
      note: "", repli: "S’il n’y a plus de cabine : un fauteuil, ou une traversée de jour.",
      services: []
    };
  }

  function statutJour(j) {
    var crit = [];
    if (j.route) crit.push(j.route.statut);
    if (j.dormir) {
      crit.push(j.dormir.statut);
      j.dormir.services.slice(0, 2).forEach(function (s) { crit.push(s.statut); });
    }
    var aConfirmer = crit.filter(function (s) { return s === "c"; }).length;
    j.aConfirmer = aConfirmer;
    j.statut = (crit.length && crit.every(function (x) { return x === "r"; })) ? "r" : "p";
  }

  /* =====================================================================
     CHOIX DE LA RÉGION
     ===================================================================== */
  // Une boucle composée autour d’une ville choisie librement (sans repérages : tout est « proposé »)
  var grilleEtapes = null;
  function etapesAutour(la, lo, rayon) {
    if (!grilleEtapes) {
      grilleEtapes = {};
      RB.circuits.forEach(function (c) {
        c.stages.forEach(function (st) {
          if (!st.rep || !st.rep.length) return;
          var k = Math.round(st.lat * 2) + ":" + Math.round(st.lon * 2);
          (grilleEtapes[k] = grilleEtapes[k] || []).push(st);
        });
      });
    }
    var res = [], i0 = Math.round(la * 2), j0 = Math.round(lo * 2), n = Math.ceil(rayon / 50) + 1;
    for (var i = -n; i <= n; i++) for (var j = -n; j <= n; j++) {
      (grilleEtapes[(i0 + i) + ":" + (j0 + j)] || []).forEach(function (st) {
        var d = vol({ lat: la, lon: lo }, st);
        if (d <= rayon) res.push({ s: st, d: d });
      });
    }
    // une étape qui a été roulée passe devant, puis la plus proche
    return res.sort(function (x, y) {
      var rx = x.s.rep.some(function (r) { return r[2] === "r"; }) ? 1 : 0, ry = y.s.rep.some(function (r) { return r[2] === "r"; }) ? 1 : 0;
      return (ry - rx) || (x.d - y.d);
    });
  }

  function circuitLibre(dest) {
    var zone = zoneDe(dest.proche || dest.nom, dest.pays);
    var centre = { nom: dest.nom, lat: dest.lat, lon: dest.lon };
    var voisins = reseau.noeuds.filter(function (n) { return n.zone === zone && n.nom !== dest.nom; })
      .map(function (n) { return { n: n, d: vol(centre, n) }; })
      .filter(function (x) { return x.d > 25 && x.d < 170 && x.n.nom !== dest.proche; })
      .sort(function (x, y) { return x.d - y.d; })
      .reduce(function (pris, x) {
        // des étapes bien réparties : au moins 35 km entre deux villes de la boucle
        if (pris.length < 6 && pris.every(function (y) { return vol(x.n, y) > 35; })) pris.push(x.n);
        return pris;
      }, [])
      .sort(function (p, q) { return Math.atan2(p.lat - centre.lat, p.lon - centre.lon) - Math.atan2(q.lat - centre.lat, q.lon - centre.lon); });
    var lieux = [centre].concat(voisins);
    return {
      id: "libre", dest: dest.nom, titre: "Autour " + (/^[aeiouyhàâéèêîïôûAEIOUYHÉÈÎÔÂ]/.test(dest.nom) ? "d’" : "de ") + dest.nom, pays: (dest.pays || "").toLowerCase(), zone: zone,
      tags: ["nature", "visites", "gastronomie", "detente"], aventure: 1, libre: true,
      stages: lieux.map(function (l, i) {
        return {
          id: "libre-" + i, nom: l.nom, lat: l.lat, lon: l.lon, pause: i === 0 ? 1 : 0,
          rep: [["Le cœur de " + l.nom, "Une balade à pied pour découvrir " + l.nom + ".", "p"],
                ["Les environs", "Demande à l’office de tourisme ses coins préférés.", "p"]],
          route: ["c", 3, "", ""],
          aire: ["près de " + l.nom, "c", null, null, null],
          camp: ["près de " + l.nom, "c", null, null, null]
        };
      })
    };
  }

  /* ---------- Ce que la personne aime ---------- */
  function sansAccents(t) {
    return " " + String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, " ") + " ";
  }
  function enviesChoisies(a) {
    var liste = [];
    (a.aime || []).forEach(function (id) {
      (RB.enviesAnciennes[id] || [id]).forEach(function (x) { if (liste.indexOf(x) < 0) liste.push(x); });
    });
    return (RB.envies || []).filter(function (e) { return liste.indexOf(e.id) >= 0; });
  }
  // Un mot-clé compte seulement en début de mot (« lac » ne doit pas attraper « lacets »… ni « mer », « américain »)
  function contient(texte, m) {
    var i = texte.indexOf(m);
    while (i >= 0) {
      if (i === 0 || !/[a-z0-9]/.test(texte.charAt(i - 1))) return true;
      i = texte.indexOf(m, i + 1);
    }
    return false;
  }
  function correspond(e, texte) {
    var ok = e.mots.some(function (m) { return contient(texte, m); });
    if (ok && e.eviter && e.eviter.some(function (m) { return contient(texte, m); })) return false;
    return ok;
  }
  var memoTexte = {};
  function texteEtape(st) {
    if (memoTexte[st.id] === undefined || st.id.indexOf("libre") === 0) {
      memoTexte[st.id] = sansAccents(st.nom + " " + st.rep.map(function (r) { return r[0] + " " + r[1]; }).join(" ") + " " + ((st.route && st.route[2]) || ""));
    }
    return memoTexte[st.id];
  }
  // 0 à 1 : à quel point une région répond aux envies cochées
  var memoAffinite = {};
  function affinite(c, envies) {
    if (!envies.length) return 0.5;
    var cle = c.id + "|" + envies.map(function (e) { return e.id; }).join(",");
    if (c.id !== "libre" && memoAffinite[cle] !== undefined) return memoAffinite[cle];
    var total = 0;
    envies.forEach(function (e) {
      var n = c.stages.filter(function (st) { return correspond(e, texteEtape(st)); }).length;
      total += Math.min(1, n / 3);
    });
    return (memoAffinite[cle] = total / envies.length);
  }
  function enviesEtape(st, envies) {
    var t = texteEtape(st);
    return envies.filter(function (e) { return correspond(e, t); }).length;
  }
  function pourToi(rep, envies) {
    var t = sansAccents(rep[0] + " " + rep[1]);
    return envies.filter(function (e) { return correspond(e, t); }).slice(0, 2).map(function (e) { return e.nom; });
  }

  function resumeRegions(regions) {
    var noms = [];
    regions.forEach(function (rg) { if (noms.indexOf(rg.c.dest) < 0) noms.push(rg.c.dest); });
    if (noms.length <= 3) return noms.join(", ");
    return noms.slice(0, 2).join(", ") + " et " + (noms.length - 2) + " autres régions";
  }

  /* ---------- Saisons ---------- */
  var SAISON = {
    nord: ["norvege", "suede", "finlande", "baltes"],
    montagne: ["dolomites", "suisse", "alpes", "pyrenees", "transylvanie", "georgie", "armenie"],
    sud: ["andalousie", "portugal", "grece", "pouilles", "balkans"]
  };
  function saisonDe(c) {
    if (c.saison) return c.saison;
    for (var k in SAISON) if (SAISON[k].indexOf(c.id) >= 0) return k;
    return "tempere";
  }
  function mois(dateIso, plusJours) {
    var d = new Date(dateIso + "T12:00:00"); d.setDate(d.getDate() + plusJours);
    return d.getMonth() + 1;
  }
  function scoreSaison(c, m) {
    var sa = saisonDe(c);
    if (sa === "nord") return m >= 5 && m <= 9 ? 2 : (m === 4 || m === 10) ? 0 : -6;
    if (sa === "montagne") return m >= 6 && m <= 9 ? 2 : (m === 5 || m === 10) ? 0 : -4;
    if (sa === "sud") return (m >= 11 || m <= 3) ? 2 : (m >= 6 && m <= 8) ? 0 : 1;
    return m >= 4 && m <= 10 ? 1 : -1;
  }
  function noteSaison(c, m) {
    var sa = saisonDe(c);
    if (sa === "nord" && (m <= 3 || m >= 11)) return "Hors saison dans le Nord : jours très courts, routes parfois enneigées, beaucoup de campings fermés.";
    if (sa === "montagne" && (m <= 4 || m >= 11)) return "En hiver, les cols peuvent être fermés et certains campings aussi.";
    return "";
  }

  var circuitsEnPlus = []; // la boucle composée autour d’une destination libre
  function evaluer(maison, noeudMaison, arbre, a, ctx, N, souplesse) {
    var envies = enviesChoisies(a);
    var maxH = ctx.maxH * souplesse;
    return RB.circuits.concat(circuitsEnPlus).map(function (c) {
      var st = c.stages.slice();
      var zone = c.zone || noeudProche(st[0]).zone;
      var n0 = noeudProche(st[0], zone), n1 = noeudProche(st[st.length - 1], zone);
      if (!n0 || !n1 || arbre.dist[n0.i] === Infinity) return null;
      if (arbre.dist[n1.i] < arbre.dist[n0.i]) { st.reverse(); var t = n0; n0 = n1; n1 = t; }
      var segAller = chemin(arbre, n0).concat([tronconRoute(n0, st[0])]);
      var segRetour = [tronconRoute(st[st.length - 1], n1)].concat(inverser(chemin(arbre, n1)));
      var aller = decouper(segAller, maxH, ctx.vLiaison);
      var retour = decouper(segRetour, maxH, ctx.vLiaison);
      var reste = N - aller.length - retour.length;
      var commun = affinite(c, envies) * (envies.length ? 3 : 1);
      // Jours utiles sur place : au-delà de ce que la région peut offrir, ils comptent moins
      var ideal = Math.max(2, st.length / (ETAPES[ctx.rythme] || 0.8));
      var utile = Math.max(0, Math.min(reste, ideal));
      var score = commun * 4 + (utile / ideal) * 6 - ((aller.length + retour.length) / N) * 6;
      if (!c.officielle) score += 1.5; // les itinéraires repérés passent devant, à intérêt égal
      if (ctx.rythme === "aventureux" && c.aventure >= 1) score += 1 + c.aventure * 0.5;
      if (ctx.rythme === "tranquille" && c.aventure === 0) score += 0.8;
      if (ctx.rythme === "tranquille" && c.aventure === 2) score -= 0.3;
      if (ctx.gab === 3 && c.aventure === 2) score -= 1;
      if (a.date) score += scoreSaison(c, mois(a.date, aller.length));
      return { c: c, stages: st, aller: aller, retour: retour, reste: reste, score: score, souplesse: souplesse };
    }).filter(Boolean);
  }

  /* =====================================================================
     GÉNÉRATION
     ===================================================================== */
  RB.generer = function (a, options) {
    options = options || {};
    if (!reseau) construireReseau();
    var d = a.depart || {};
    var maison = { nom: d.nom || "Paris", pays: d.pays || "FR", lat: d.lat || 48.857, lon: d.lon || 2.352 };
    var N = parseInt(a.duree, 10) || 7;
    var ctx = contexte(a);
    var noeudMaison = reseau.parNom[d.proche || d.nom] || noeudProche(maison);
    var arbre = dijkstra(noeudMaison, ctx.vLiaison);

    // Ce que la personne a demandé : une région précise, une partie de l’Europe, ou rien
    var partieDe = {};
    (RB.parties || []).forEach(function (p) { p.circuits.forEach(function (id) { partieDe[id] = p; }); });
    var dest = options.circuit ? null : (a.destination || null);
    var voulu = options.circuit || a.region || "";
    var partie = null, etapeVoulue = "", libre = null;
    circuitsEnPlus = [];
    if (dest && (dest.type === "region" || dest.type === "etape")) {
      voulu = dest.circuit; etapeVoulue = dest.etape || "";
    } else if (dest && dest.type === "pays" && dest.circuits && dest.circuits.length) {
      voulu = ""; partie = { id: "pays-" + dest.pays, nom: dest.nom, circuits: dest.circuits };
    } else if (dest && typeof dest.lat === "number") {
      libre = circuitLibre(dest);
      circuitsEnPlus = [libre];
      voulu = libre.id;
    }
    if (!partie) partie = voulu ? partieDe[voulu] : (RB.parties || []).filter(function (p) { return p.id === a.partie; })[0];
    // Un pays choisi dans « laisse-toi guider », sans région précise
    if (!voulu && !dest && partie && a.paysGuide) {
      var dansPays = partie.circuits.filter(function (id) {
        var c = RB.circuits.filter(function (x) { return x.id === id; })[0];
        return c && RB.paysCircuit && RB.paysCircuit(c) === a.paysGuide;
      });
      if (dansPays.length) partie = { id: "pays-" + a.paysGuide, nom: RB.pays[a.paysGuide] || partie.nom, circuits: dansPays };
    }
    if (!partie && libre) partie = { id: "libre", nom: libre.dest, circuits: [] };
    var avertissement = "";
    var dansPartie = function (x) { return !!partie && partie.circuits.indexOf(x.c.id) >= 0; };
    var tout = function () { return true; };

    // On accepte des journées de liaison plus longues seulement si c’est nécessaire
    var essais = [1, 1.5, 2, 3];
    // Pour une envie précise, on ne dépasse jamais 7 heures de route par jour
    function chercher(filtre, exigeant, sansPlafond) {
      for (var e = 0; e < essais.length; e++) {
        if (!sansPlafond && ctx.maxH * essais[e] > 7) continue;
        var l = evaluer(maison, noeudMaison, arbre, a, ctx, N, essais[e]);
        var ok = l.filter(function (x) { return x.reste >= 1; }).sort(function (x, y) { return y.score - x.score; });
        var p = ok.filter(filtre);
        if (p.length && (!exigeant || essais[e] >= 2 || p[0].aller.length + p[0].retour.length <= Math.ceil(N * 0.7))) {
          return { choix: p[0], liste: ok };
        }
      }
      return null;
    }
    function joursMin(filtre) {
      var sMax = essais.filter(function (e) { return ctx.maxH * e <= 7; }).pop() || 1;
      var l = evaluer(maison, noeudMaison, arbre, a, ctx, N, sMax).filter(filtre);
      return l.length ? Math.min.apply(null, l.map(function (x) { return x.aller.length + x.retour.length + 2; })) : 0;
    }

    var r = null;
    if (voulu) {
      var regionVoulue = RB.circuits.concat(circuitsEnPlus).filter(function (c) { return c.id === voulu; })[0];
      r = chercher(function (x) { return x.c.id === voulu; }, false);
      if (!r && regionVoulue) {
        var min = joursMin(function (x) { return x.c.id === voulu; });
        avertissement = "La destination « " + regionVoulue.dest + " » demande au moins " + min + " jours depuis " + maison.nom +
          ". Voici la plus belle route possible en " + N + " jours";
        r = chercher(dansPartie, true);
        avertissement += r ? ", dans la même partie de l’Europe." : ", plus près de chez toi.";
        avertissement += " Pour y aller, choisis une durée d’au moins " + min + " jours.";
      }
    } else if (partie) {
      r = chercher(dansPartie, true) || chercher(dansPartie, false);
      if (!r) {
        avertissement = "« " + partie.nom + " » demande au moins " + joursMin(dansPartie) + " jours depuis " + maison.nom +
          ". Voici une belle route plus proche, en " + N + " jours. Pour y aller, choisis une durée plus longue.";
      }
    }
    if (!r) r = chercher(tout, true, true);
    var choix, liste;
    if (r) { choix = r.choix; liste = r.liste; }
    else { // très peu de jours : la région la plus proche
      liste = evaluer(maison, noeudMaison, arbre, a, ctx, N, 3).sort(function (x, y) {
        return y.reste - x.reste || (x.aller.length + x.retour.length) - (y.aller.length + y.retour.length) ||
          distHeures(x) - distHeures(y) || y.score - x.score;
      });
      choix = liste[0];
      liste = liste.filter(function (x) { return x.reste >= 1; });
    }
    function distHeures(x) {
      var z = x.c.zone || noeudProche(x.stages[0]).zone;
      return arbre.dist[noeudProche(x.stages[0], z).i];
    }
    var circuit = choix.c;

    // D’autres régions possibles pour ce départ (pour « Envie d’ailleurs ? »)
    // Quelques idées proches, puis quelques idées plus lointaines, sans doublon de pays
    var autres = [], pays = {};
    var tri = liste.slice().sort(function (x, y) {
      var px = dansPartie(x) ? 1 : 0, py = dansPartie(y) ? 1 : 0;
      return py - px || y.score - x.score;
    });
    function prendre(filtre, max) {
      var n = 0;
      tri.forEach(function (x) {
        if (n >= max || x.c.id === circuit.id || pays[x.c.pays] || !filtre(x)) return;
        pays[x.c.pays] = 1; n++;
        autres.push({ id: x.c.id, dest: x.c.dest, loin: x.aller.length > 1 });
      });
    }
    if (partie) prendre(dansPartie, 4);
    prendre(function (x) { return x.aller.length <= Math.max(1, choix.aller.length); }, 3);
    prendre(function (x) { return x.aller.length > Math.max(1, choix.aller.length); }, 3);
    prendre(function () { return true; }, 6 - autres.length);
    autres = autres.slice(0, 6);

    /* ---------- Les régions du voyage (plusieurs pour un long voyage) ---------- */
    var maxHL = ctx.maxH * choix.souplesse;
    var envies = enviesChoisies(a);
    // Sur un très long voyage, on prend plus de temps dans chaque région
    var lenteur = N > 180 ? 1.7 : N > 90 ? 1.3 : 1;
    function ideal(st) { return Math.max(2, Math.round(lenteur * st.length / (ETAPES[ctx.rythme] || 0.8))); }
    function zoneCircuit(c, st) { return c.zone || noeudProche(st[0]).zone; }
    function retourDepuis(stage, zone) {
      var n = noeudProche(stage, zone);
      return decouper([tronconRoute(stage, n)].concat(inverser(chemin(arbre, n))), maxHL, ctx.vLiaison);
    }
    var regions = [{ c: choix.c, st: choix.stages, aller: choix.aller }];
    var utilises = {}; utilises[choix.c.id] = 1;  // nombre de passages par région
    function centre(st) {
      var la = 0, lo = 0;
      st.forEach(function (x) { la += x.lat; lo += x.lon; });
      return { lat: la / st.length, lon: lo / st.length };
    }
    var paysVus = {};
    function noterPays(c) { var k = RB.paysCircuit ? RB.paysCircuit(c) : c.pays; paysVus[k] = (paysVus[k] || 0) + 1; }
    noterPays(choix.c);
    var restants = N - choix.aller.length;  // jours après l’arrivée dans la première région
    while (true) {
      var cur = regions[regions.length - 1];
      var zc = zoneCircuit(cur.c, cur.st);
      var fin = cur.st[cur.st.length - 1];
      var retCur = retourDepuis(fin, zc);
      var dispo = restants - retCur.length;
      var id = ideal(cur.st);
      var suivante = null;
      if (regions.length < 80 && dispo > id + 5) {
        var nFin = noeudProche(fin, zc);
        var arbre2 = dijkstra(nFin, ctx.vLiaison);
        var dejaFait = N - restants; // jours déjà passés à l’arrivée dans la région en cours
        var recents = regions.slice(-4).map(function (rg) { return rg.c.id; });
        var chercherSuivante = function (reutiliser) {
        RB.circuits.concat(circuitsEnPlus).forEach(function (c) {
          if (utilises[c.id] && !(reutiliser && recents.indexOf(c.id) < 0)) return;
          var st2 = c.stages.slice(), z2 = zoneCircuit(c, st2);
          var m0 = noeudProche(st2[0], z2), m1 = noeudProche(st2[st2.length - 1], z2);
          if (!m0 || !m1 || arbre2.dist[m0.i] === Infinity) return;
          if (arbre2.dist[m1.i] < arbre2.dist[m0.i]) { st2.reverse(); var tm = m0; m0 = m1; m1 = tm; }
          var al = decouper(chemin(arbre2, m0).concat([tronconRoute(m0, st2[0])]), maxHL, ctx.vLiaison);
          var re = retourDepuis(st2[st2.length - 1], z2);
          if (id + al.length + 2 + re.length > restants) return;
          var commun = affinite(c, envies) * (envies.length ? 2 : 1);
          // Plus le voyage avance, plus on se rapproche de la maison
          var avancement = dejaFait / N;
          // Sur un long voyage, on varie les pays plutôt que d’enchaîner les petites régions voisines
          var dejaPays = paysVus[RB.paysCircuit ? RB.paysCircuit(c) : c.pays] || 0;
          // … et on évite de revenir tourner dans un coin déjà visité
          var dejaVu = 0;
          if (N > 60) {
            var ctr = centre(st2);
            regions.slice(0, -1).forEach(function (rg) { if (vol(ctr, rg.ctr || (rg.ctr = centre(rg.st))) < 220) dejaVu++; });
          }
          var sc = commun * 3 - dejaVu * 1.4 + (N > 60 ? Math.min(st2.length, 7) * 0.35 : 0) - al.length * (N > 120 ? 0.9 : 1.5) - dejaPays * (N > 60 ? 1.6 : 0.6) - re.length * (0.3 + avancement * avancement * 3) + (dansPartie({ c: c }) ? 3 : 0);
          if (a.date) sc += scoreSaison(c, mois(a.date, dejaFait + id + al.length)) * 1.5;
          if (!suivante || sc > suivante.sc) suivante = { c: c, st: st2, aller: al, sc: sc };
        });
        };
        chercherSuivante(false);
        if (!suivante) chercherSuivante(true); // très long voyage : on peut revenir dans une région déjà vue
      }
      if (suivante) {
        cur.jours = id;
        restants -= id + suivante.aller.length;
        regions.push({ c: suivante.c, st: suivante.st, aller: suivante.aller, retourDansRegion: utilises[suivante.c.id] > 1 });
        utilises[suivante.c.id] = (utilises[suivante.c.id] || 0) + 1;
        noterPays(suivante.c);
      } else {
        cur.jours = Math.max(0, dispo);
        cur.retour = retCur;
        break;
      }
    }

    function interet(x) {
      var n = (x.id === etapeVoulue ? 100 : 0) + (x.pause ? 3 : 0) + (x.route && x.route[0] === "r" ? 1 : 0) + enviesEtape(x, envies) * 2;
      x.rep.forEach(function (r) { if (r[2] === "r") n += 1; });
      if (x.aire && x.aire[1] === "r") n += 1;
      if (x.camp && x.camp[1] === "r") n += 1;
      return n;
    }
    // Choisit les étapes et les journées sur place d’une région
    function planRegion(rg, estDerniere) {
      var st = rg.st, D = rg.jours;
      var k = Math.min(st.length, 1 + Math.round(D * (ETAPES[ctx.rythme] || 0.8)));
      k = Math.max(1, Math.min(k, D + 1));
      if (!estDerniere) k = Math.max(2, k);
      var sel;
      var etapeObj = st.filter(function (x) { return x.id === etapeVoulue; })[0];
      if (k === 1) sel = [etapeObj || st[0]];
      else if (k >= st.length) sel = st.slice();
      else {
        var milieu = [];
        for (var i = 1; i < st.length - 1; i++) milieu.push(i);
        milieu.sort(function (x, y) { return interet(st[y]) - interet(st[x]) || x - y; });
        var garde = milieu.slice(0, k - 2).sort(function (x, y) { return x - y; });
        sel = [st[0]].concat(garde.map(function (i) { return st[i]; }), [st[st.length - 1]]);
      }
      if (etapeObj && sel.indexOf(etapeObj) < 0) {
        if (sel.length === 2 && estDerniere) sel = [sel[0], etapeObj];
        else if (sel.length > 2) sel[sel.length - 2] = etapeObj;
      }
      // Dernière région : si l’on ne finit pas par la dernière étape prévue, le retour part de la dernière gardée
      if (estDerniere && sel[sel.length - 1] !== st[st.length - 1]) {
        rg.retour = retourDepuis(sel[sel.length - 1], zoneCircuit(rg.c, st));
        D = Math.max(0, restants - rg.retour.length);
      }
      var pauses = Math.max(0, D - (sel.length - 1));
      var nbPause = sel.map(function () { return 0; });
      var ordre = sel.map(function (x, idx) { return idx; })
        .sort(function (x, y) { return (sel[y].pause ? 1 : 0) - (sel[x].pause ? 1 : 0); });
      var t = 0;
      while (pauses > 0 && ordre.length) { nbPause[ordre[t % ordre.length]]++; pauses--; t++; }
      rg.sel = sel; rg.nbPause = nbPause;
    }
    regions.forEach(function (rg, i) { planRegion(rg, i === regions.length - 1); });

    var dormirMemo = {};
    function dormirStage(s, c) { return dormirMemo[s.id] || (dormirMemo[s.id] = dormir(s, ctx, c.pays)); }

    // Une journée de liaison : un vrai arrêt en chemin et quelque chose à voir là où l’on dort
    function reperesLiaison(jc, env) {
      var fin = jc.fin, l = [], photo = "";
      var pts = [];
      jc.segs.forEach(function (sg) { if (sg.de) pts.push(sg.de); });
      pts = pts.slice(1); // pas le point de départ
      // 1. En chemin : une étape repérée à moins de 15 km de la route
      var chemin = null;
      for (var i = 0; i < pts.length && !chemin; i++) {
        var p = pts[i];
        if (fin && vol(p, fin) < 30) continue;
        var e = etapesAutour(p.lat, p.lon, 15)[0];
        if (e) chemin = e;
      }
      if (chemin) {
        var r0 = chemin.s.rep[0];
        l.push({ nom: "En chemin : " + chemin.s.nom, texte: r0[0] + ". " + r0[1] + (chemin.d >= 3 ? " (petit détour d’environ " + Math.round(chemin.d) + " km)" : ""),
          statut: r0[2] === "r" ? "r" : "p", pourToi: pourToi(r0, env) });
        photo = chemin.s.id;
      }
      // 2. Ce soir : ce qu’il y a à voir là où l’on dort (ou tout près)
      if (fin) {
        var soir = etapesAutour(fin.lat, fin.lon, 45).filter(function (x) { return !chemin || x.s.id !== chemin.s.id; })[0];
        if (soir) {
          var pres = soir.d < 8;
          soir.s.rep.slice(0, pres ? 2 : 1).forEach(function (r) {
            l.push({ nom: (pres ? "Ce soir à " + fin.nom + " : " : "À " + Math.round(soir.d) + " km, " + soir.s.nom + " : ") + r[0], texte: r[1],
              statut: r[2] === "r" ? "r" : "p", pourToi: pourToi(r, env) });
          });
          photo = photo || soir.s.id;
        }
      }
      if (!l.length && fin) {
        l.push({ nom: "Le centre de " + fin.nom, texte: "Gare-toi à l’aire ou au camping, puis une balade à pied dans le centre et un dîner dans un restaurant du coin.", statut: "p" });
      }
      if (fin) l.push({ nom: "Avant de repartir", texte: "Plein d’eau et vidange à l’aire du soir si elle le permet, et courses pour la route du lendemain.", statut: "p" });
      return { reperes: l, photo: photo };
    }
    var jours = [];
    function ajouter(j) { j.n = jours.length + 1; statutJour(j); jours.push(j); }

    function jourStage(type, depuis, s, km, min, c) {
      return {
        type: type, depuis: depuis, vers: s.nom, lieuId: s.id, lat: s.lat, lon: s.lon,
        km: km, min: min, ferryMin: 0, photo: "images/etapes/" + s.id + ".jpg",
        route: type === "pause" ? null : routeEtape(s, ctx),
        reperes: s.rep.map(function (r) { return { nom: r[0], texte: r[1], statut: r[2] === "r" ? "r" : "p", pourToi: pourToi(r, envies) }; }),
        dormir: dormirStage(s, c),
        region: c.dest
      };
    }
    function jourLiaison(depuis, jc) {
      var res = resumeLiaison(jc, ctx.vLiaison);
      var concret = jc.mode === "mer" || jc.mode === "ferry" ? null : reperesLiaison(jc, envies);
      if (jc.mode === "mer") {
        return {
          type: "mer", depuis: "À bord", vers: "En mer, vers " + jc.fin.nom, lieuId: "ferry", lat: jc.fin.lat, lon: jc.fin.lon,
          km: 0, min: 0, ferryMin: 0, photo: "images/etapes/ferry.jpg",
          route: { statut: "c", texte: "Journée de traversée, à bord.", alerte: "", repli: "Garde à portée de main ce qu’il te faut pour la journée : tu n’auras pas accès au véhicule pendant la traversée." },
          reperes: [{ nom: "Le pont du ferry", texte: "Profite du large : lecture, sieste, horizon.", statut: "p" }],
          dormir: dormirFerry()
        };
      }
      var aBord = jc.mode === "ferry";
      return {
        type: "liaison", depuis: depuis, vers: aBord ? "Ferry pour " + jc.fin.nom : jc.fin.nom,
        lieuId: aBord ? "ferry" : "liaison", lat: jc.fin.lat, lon: jc.fin.lon,
        km: res.km, min: res.min, ferryMin: res.ferryMin, photo: aBord ? "images/etapes/ferry.jpg" : "images/etapes/liaison.jpg",
        route: routeLiaison(res),
        reperes: aBord
          ? [{ nom: "La traversée", texte: "Embarque tranquillement, dîne à bord, et réveille-toi de l’autre côté.", statut: "p" }]
          : concret.reperes,
        photoLieu: concret ? concret.photo : "",
        dormir: aBord ? dormirFerry() : dormirLiaison(jc.fin.nom)
      };
    }

    var precedent = maison.nom;
    regions.forEach(function (rg) {
      var regleRegion = RB.regles[(rg.c.pays || "").toUpperCase()] || "";
      // 1. L’arrivée dans la région
      rg.aller.forEach(function (jc, idx) {
        if (idx < rg.aller.length - 1) {
          ajouter(jourLiaison(precedent, jc));
          precedent = jc.fin.nom;
        } else {
          var res = resumeLiaison(jc, ctx.vLiaison);
          var ja = jourStage("arrivee", precedent, rg.sel[0], res.km, res.min, rg.c);
          ja.ferryMin = res.ferryMin;
          var notes = res.notes.slice();
          if (regleRegion && notes.indexOf(regleRegion) < 0) notes.push(regleRegion);
          if (a.date) { var ns = noteSaison(rg.c, mois(a.date, jours.length)); if (ns) notes.push(ns); }
          if (notes.length) { // vignettes, assurance, saison : à savoir, sans rien à confirmer sur la route
            ja.route.texte = notes.join(" ") + (ja.route.texte ? " Sur place : " + ja.route.texte.charAt(0).toLowerCase() + ja.route.texte.slice(1) : "");
          }
          ajouter(ja);
        }
      });
      // 2. La boucle sur place
      var sel = rg.sel;
      for (var s = 0; s < sel.length; s++) {
        if (s > 0) {
          var km2 = routeKm(sel[s - 1], sel[s], 1.35);
          ajouter(jourStage("etape", sel[s - 1].nom, sel[s], km2, minutes(km2, ctx.vCircuit), rg.c));
        }
        for (var p = 0; p < rg.nbPause[s]; p++) {
          var jp = jourStage("pause", sel[s].nom, sel[s], 0, 0, rg.c);
          jp.texte = "Aujourd’hui, pas de route : tu restes à " + sel[s].nom + ". Prends le temps.";
          ajouter(jp);
        }
      }
      precedent = sel[sel.length - 1].nom;
    });
    // 3. Le retour
    var retourJours = regions[regions.length - 1].retour;
    retourJours.forEach(function (jc, idx) {
      if (idx < retourJours.length - 1) {
        ajouter(jourLiaison(precedent, jc));
        precedent = jc.fin.nom;
      } else {
        var res = resumeLiaison(jc, ctx.vLiaison);
        ajouter({
          type: "retour", depuis: precedent, vers: maison.nom, lieuId: "maison", lat: maison.lat, lon: maison.lon,
          km: res.km, min: res.min, ferryMin: res.ferryMin, photo: "images/etapes/maison.jpg", route: routeLiaison(res),
          reperes: [{ nom: "La maison", texte: "Range le van, ouvre les fenêtres, et commence déjà à rêver au prochain départ.", statut: "p" }],
          dormir: null
        });
      }
    });

    // Dates
    if (a.date) {
      var d0 = new Date(a.date + "T12:00:00");
      var opts = { weekday: "short", day: "numeric", month: "short" };
      if (N > 1 && new Date(d0.getTime() + (N - 1) * 86400000).getFullYear() !== d0.getFullYear()) opts.year = "numeric";
      var format = new Intl.DateTimeFormat("fr-FR", opts); // un seul format pour tous les jours (bien plus rapide)
      jours.forEach(function (j, idx) {
        j.date = format.format(new Date(d0.getTime() + idx * 86400000));
      });
    }

    var total = jours.reduce(function (acc, j) { return acc + j.km; }, 0);
    var b = BUDGET[ctx.budget] || BUDGET.confort;
    return {
      id: "v" + Date.now(),
      creeLe: new Date().toISOString(),
      reponses: JSON.parse(JSON.stringify(a)),
      maison: maison,
      circuit: {
        id: circuit.id,
        dest: resumeRegions(regions),
        titre: N >= 600 ? Math.round(N / 365) + " ans sur les routes d’Europe"
          : N >= 300 ? "Une année sur les routes d’Europe"
          : N >= 60 ? Math.round(N / 30) + " mois sur les routes d’Europe"
          : regions.length > 1 ? "Grand voyage : " + regions.map(function (rg) { return rg.c.dest; }).join(", puis ")
          : circuit.titre
      },
      regions: regions.map(function (rg) { return rg.c.dest; }),
      autres: autres,
      avertissement: (circuit.libre
        ? "Je n’ai pas encore de repérages autour " + (/^[aeiouyhàâéèêîïôûAEIOUYHÉÈÎÔÂ]/.test(circuit.dest) ? "d’" : "de ") + circuit.dest + " : les étapes sont des propositions, à vérifier sur place. "
        : "") + avertissement,
      partie: partieDe[circuit.id] ? partieDe[circuit.id].nom : "",
      jours: jours,
      totalKm: total,
      budget: [b[0] * jours.length, b[1] * jours.length]
    };
  };

  // Pour les tests : vérifier que le réseau est bien relié
  RB._reseau = function () { if (!reseau) construireReseau(); return reseau; };
  RB._dijkstra = function (n, v) { if (!reseau) construireReseau(); return dijkstra(n, v || 85); };
})();
