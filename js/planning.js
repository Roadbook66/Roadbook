/* =========================================================================
   Roadbook — le planning proposé pour chaque journée
   Une suite de moments avec leur heure : départ, route et pauses, visites,
   déjeuner, installation pour la nuit, soirée. C’est une proposition :
   le voyageur peut la modifier (app.js garde sa version avec le voyage).
   ========================================================================= */
(function () {
  var DEPART = { tranquille: 9 * 60 + 30, equilibre: 9 * 60, aventureux: 8 * 60 + 30 };
  var TYPE_NUIT = { A: "l’aire", C: "le camping", P: "le parking" };

  function arrondi(m) { return Math.round(m / 15) * 15; }
  function heure(m) {
    m = Math.max(0, Math.min(23 * 60 + 45, Math.round(m)));
    var h = Math.floor(m / 60), mn = m % 60;
    return (h < 10 ? "0" : "") + h + ":" + (mn < 10 ? "0" : "") + mn;
  }
  function duree(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return h ? h + " h" + (m ? " " + (m < 10 ? "0" : "") + m : "") : m + " min";
  }
  function nuitDe(j) {
    var l = (j.lieux || []).filter(function (x) { return x.type === "A" || x.type === "C" || x.type === "P"; })[0];
    if (l) return { nom: l.nom || ((l.type === "C" ? "Camping" : "Aire") + " près de " + j.vers), quoi: TYPE_NUIT[l.type] || "l’aire" };
    if (j.dormir) return { nom: j.dormir.nom, quoi: j.dormir.type === "camping" ? "le camping" : "l’aire" };
    return null;
  }
  function sansPrefixe(n) { return n.replace(/^(En chemin|Ce soir à [^:]+|À \d+ km, [^:]+)\s*:\s*/, ""); }

  // La route, découpée avec une pause toutes les deux heures et le déjeuner s’il tombe pendant
  function rouler(l, t, min, vers, dejeunerFait, enChemin) {
    var reste = min, depuisPause = 0, cheminFait = !enChemin;
    l.push({ h: heure(t), titre: "Départ vers " + vers, texte: "Environ " + duree(min) + " de route.", type: "route" });
    while (reste > 0) {
      var morceau = Math.min(reste, Math.max(15, 120 - depuisPause));
      // Le déjeuner, s’il tombe pendant la route
      if (!dejeunerFait.fait && t + morceau > 12 * 60 + 30 && reste > 20) {
        var avant = Math.max(0, 12 * 60 + 30 - t);
        t += avant; reste -= avant;
        if (!cheminFait) {
          l.push({ h: heure(t), titre: sansPrefixe(enChemin.nom), texte: enChemin.texte + " Et le déjeuner sur place.", type: "visite" });
          t += 105; cheminFait = true;
        } else {
          l.push({ h: heure(t), titre: "Pause déjeuner", texte: "Pique-nique sur une aire ou petit restaurant en chemin.", type: "repas" });
          t += 60;
        }
        dejeunerFait.fait = true; depuisPause = 0; continue;
      }
      t += morceau; reste -= morceau; depuisPause += morceau;
      if (reste > 15 && depuisPause >= 120) {
        if (!cheminFait && reste < min * 0.7) {
          l.push({ h: heure(t), titre: sansPrefixe(enChemin.nom), texte: enChemin.texte, type: "visite" });
          t += 60; cheminFait = true;
        } else {
          l.push({ h: heure(t), titre: "Pause café", texte: "On se dégourdit les jambes, 20 minutes.", type: "pause" });
          t += 20;
        }
        depuisPause = 0;
      } else if (depuisPause >= 120) depuisPause = 0;
    }
    if (!cheminFait) {
      l.push({ h: heure(t), titre: sansPrefixe(enChemin.nom), texte: enChemin.texte, type: "visite" });
      t += 60;
    }
    return t;
  }

  function installer(l, t, j, soir) {
    var n = nuitDe(j);
    if (!n) return t;
    var h = Math.max(t, soir ? t : 0);
    l.push({ h: heure(h), titre: "Installation pour la nuit", texte: n.nom + ". Arrive avant 18 h : les places partent vite en saison.", type: "nuit" });
    return h + 30;
  }

  RB.planning = {};
  RB.planning.proposer = function (j, v) {
    var l = proposer(j, v);
    return l.map(function (x, i) { x.i = i; return x; })
      .sort(function (a, b) { return a.h < b.h ? -1 : a.h > b.h ? 1 : a.i - b.i; })
      .map(function (x) { delete x.i; return x; });
  };
  function proposer(j, v) {
    var rythme = (v && v.reponses && v.reponses.rythme) || "equilibre";
    var t = DEPART[rythme] || DEPART.equilibre;
    var l = [], dej = { fait: false };
    var reps = (j.reperes || []).slice();

    if (j.type === "mer") {
      l.push({ h: "08:30", titre: "Petit-déjeuner à bord", texte: "", type: "repas" });
      l.push({ h: "10:00", titre: "Le pont du ferry", texte: "Lecture, sieste, horizon.", type: "libre" });
      l.push({ h: "12:30", titre: "Déjeuner à bord", texte: "", type: "repas" });
      l.push({ h: "15:00", titre: "Temps libre", texte: "Prépare l’arrivée : papiers, itinéraire du lendemain.", type: "libre" });
      l.push({ h: "19:30", titre: "Dîner à bord", texte: "", type: "repas" });
      return l;
    }

    // Petit-déjeuner et rangement
    l.push({ h: heure(t - 60), titre: "Petit-déjeuner", texte: j.type === "pause" ? "Sans se presser : aujourd’hui, pas de route." : "Puis on range le van.", type: "repas" });

    if (j.type === "pause") {
      t = arrondi(t + 30);
      var a = reps[1] || reps[0], b = reps[1] ? reps[0] : null;
      if (a) { l.push({ h: heure(t), titre: a.nom, texte: a.texte, type: "visite" }); }
      l.push({ h: "12:30", titre: "Déjeuner", texte: "Au van ou dans une petite adresse du coin.", type: "repas" });
      if (b) l.push({ h: "14:30", titre: b.nom, texte: "Pour y retourner tranquillement, ou découvrir ce que tu n’as pas eu le temps de voir.", type: "visite" });
      else l.push({ h: "14:30", titre: "Après-midi libre", texte: "Balade, sieste, lecture.", type: "libre" });
      l.push({ h: "17:00", titre: "Courses et plein d’eau", texte: "Pour être prêt à repartir demain.", type: "pause" });
      l.push({ h: "19:30", titre: "Dîner", texte: "", type: "repas" });
      return l;
    }

    if (j.type === "liaison" || j.type === "retour") {
      var chemin = null, soir = [], conseil = null;
      reps.forEach(function (r) {
        if (/^En chemin/.test(r.nom)) chemin = r;
        else if (r.nom === "Avant de repartir") conseil = r;
        else if (j.type !== "retour") soir.push(r);
      });
      var ferry = /^Ferry pour /.test(j.vers || "");
      var min = Math.max(0, (j.min || 0) - (j.ferryMin || 0));
      t = rouler(l, t, min, ferry ? "le port" : j.vers, dej, chemin);
      if (ferry) {
        l.push({ h: heure(t), titre: "Arrivée au port", texte: "Présente-toi à l’embarquement au moins 1 h avant le départ.", type: "route" });
        l.push({ h: heure(t + 60), titre: "Embarquement", texte: "Traversée d’environ " + duree(j.ferryMin || 0) + ".", type: "route" });
        return l;
      }
      if (j.type === "retour") {
        l.push({ h: heure(t), titre: "Arrivée à la maison", texte: "Range le van, ouvre les fenêtres, et commence déjà à rêver au prochain départ.", type: "nuit" });
        return l;
      }
      l.push({ h: heure(t), titre: "Arrivée à " + j.vers, texte: "", type: "route" });
      t += 15;
      if (!dej.fait && t <= 14 * 60) { t = Math.max(t, 12 * 60 + 30); l.push({ h: heure(t), titre: "Déjeuner", texte: "", type: "repas" }); t += 75; dej.fait = true; }
      if (soir.length && t <= 16 * 60 + 30) {
        l.push({ h: heure(arrondi(Math.max(t, 14 * 60 + 30))), titre: sansPrefixe(soir[0].nom), texte: soir[0].texte, type: "visite" });
        t = Math.max(t, 14 * 60 + 30) + 120; soir.shift();
      }
      t = installer(l, Math.min(Math.max(arrondi(t), 17 * 60), 18 * 60), j);
      if (soir.length) l.push({ h: heure(Math.max(t, 18 * 60)), titre: sansPrefixe(soir[0].nom), texte: soir[0].texte + " En fin de journée, si tu as encore de l’énergie.", type: "visite" });
      if (conseil) l.push({ h: "19:00", titre: "Avant de repartir", texte: conseil.texte, type: "pause" });
      l.push({ h: "19:30", titre: "Dîner", texte: "", type: "repas" });
      return l;
    }

    // Jour d’étape (ou d’arrivée) : un peu de route, puis la visite
    t = rouler(l, t, j.min || 0, j.vers, dej, null);
    l.push({ h: heure(t), titre: "Arrivée à " + j.vers, texte: "", type: "route" });
    t = arrondi(t + 15);
    var r1 = reps[0], r2 = reps[1];
    if (r1 && (dej.fait || t + 90 <= 12 * 60 + 45)) { l.push({ h: heure(t), titre: r1.nom, texte: r1.texte, type: "visite" }); t += 120; r1 = null; }
    if (!dej.fait && t < 12 * 60 + 15) l.push({ h: heure(t), titre: "Premiers pas à " + j.vers, texte: "Une balade pour prendre ses repères avant le déjeuner.", type: "libre" });
    if (!dej.fait) { t = Math.max(t, 12 * 60 + 30); l.push({ h: heure(t), titre: "Déjeuner", texte: "", type: "repas" }); t += 75; dej.fait = true; }
    if (r1) { l.push({ h: heure(arrondi(t)), titre: r1.nom, texte: r1.texte, type: "visite" }); t += 120; }
    if (t > 17 * 60 + 30) {
      t = installer(l, 17 * 60 + 30, j);
      if (r2) l.push({ h: heure(Math.max(t, 18 * 60)), titre: r2.nom, texte: r2.texte + " En fin de journée, si tu as encore de l’énergie.", type: "visite" });
    } else {
      if (r2 && t <= 16 * 60 + 30) { l.push({ h: heure(arrondi(t)), titre: r2.nom, texte: r2.texte, type: "visite" }); t += 90; r2 = null; }
      t = installer(l, Math.max(arrondi(t), 17 * 60), j);
      if (r2) l.push({ h: heure(Math.max(t, 18 * 60)), titre: r2.nom, texte: r2.texte, type: "visite" });
    }
    l.push({ h: "19:30", titre: "Dîner", texte: "", type: "repas" });
    return l;
  }
  RB.planning.heure = heure;
})();
