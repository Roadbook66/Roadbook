/* =========================================================================
   Roadbook — l’application (écrans, navigation, sauvegarde)
   ========================================================================= */
(function () {
  var RB = window.RB;

  /* ---------- Mémoire du navigateur (localStorage, protégé) ---------- */
  var memoire = {
    lire: function (cle, defaut) {
      try { var v = localStorage.getItem(cle); return v ? JSON.parse(v) : defaut; } catch (e) { return defaut; }
    },
    ecrire: function (cle, valeur) {
      try { localStorage.setItem(cle, JSON.stringify(valeur)); return true; } catch (e) { return false; /* navigation privée ou mémoire pleine */ }
    }
  };
  var CLE = { reponses: "roadbook.reponses", route: "roadbook.route", voyages: "roadbook.voyages", acces: "roadbook.acces" };

  var reponses = memoire.lire(CLE.reponses, null) || { rythme: "equilibre", budget: "confort", aime: [] };
  if (reponses.partie === undefined) reponses.partie = "";
  if (reponses.paysGuide === undefined) reponses.paysGuide = "";
  if (reponses.vehicule === "caravane") reponses.vehicule = ""; // Roadbook est pour les vans, fourgons et camping-cars
  if (reponses.aime && RB.enviesAnciennes) { // anciennes envies (nature, visites…) → nouvelles
    var nouvelles = [];
    reponses.aime.forEach(function (id) { (RB.enviesAnciennes[id] || [id]).forEach(function (x) { if (nouvelles.indexOf(x) < 0) nouvelles.push(x); }); });
    reponses.aime = nouvelles;
  }
  if (reponses.region === undefined) reponses.region = "";
  if (reponses.depart && typeof reponses.depart !== "object") reponses.depart = null; // ancien format
  var voyage = memoire.lire(CLE.route, null);

  /* ---------- Petits outils ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function nombre(n) { return Number(n).toLocaleString("fr-FR").replace(/\s/g, "\u00a0"); }
  function duree(min) {
    var h = Math.floor(min / 60), m = min % 60;
    if (!h) return m + "\u00a0min";
    return h + "\u00a0h" + (m ? "\u00a0" + (m < 10 ? "0" : "") + m : "");
  }

  var ICONES = {
    r: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    p: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="currentColor"/></svg>',
    c: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 6.2a2 2 0 1 1 2.8 1.8c-.6.3-.8.7-.8 1.3v.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="12.3" r="1" fill="currentColor"/></svg>'
  };
  var LIBELLE = { r: "Roulée", p: "Proposée", c: "À confirmer sur place" };
  // « Proposée » n’est plus affichée : seuls les aires, campings et parkings portent la mention « Proposé »
  function statut(s) {
    if (s === "p") return "";
    return '<span class="statut statut--' + s + '">' + ICONES[s] + "<span>" + LIBELLE[s] + "</span></span>";
  }
  function statutLieu() {
    return '<span class="statut statut--p">' + ICONES.p + "<span>Proposé</span></span>";
  }
  /* ---------- Vérifié par Roadbook (mode administratrice) ---------- */
  function verifDe(cle) { return RB.verifs ? RB.verifs.de(cle) : null; }
  function adminOn() { return !!(RB.verifs && RB.verifs.estAdmin()); }
  function statutVerifie() { return '<span class="statut statut--r">' + ICONES.r + "<span>Vérifié</span></span>"; }
  function ligneVerif(vf) {
    return '<p class="verif-ligne">' + ICONES.r + "<span>" + (vf.ajoute ? "Ajouté et vérifié sur place par Roadbook" : "Vérifié sur place par Roadbook") + (vf.visite_le ? ", " + esc(moisAnnee(vf.visite_le)) : "") + "</span></p>" +
      (vf.note ? '<p class="verif-note">« ' + esc(vf.note) + " »</p>" : "");
  }
  function moisAnnee(d) { try { return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); } catch (e) { return ""; } }
  // Les constatations de Roadbook remplacent les données d’OpenStreetMap
  function avecVerif(l) {
    var vf = RB.verifs && RB.communaute ? verifDe(RB.verifs.cleLieu(l)) : null;
    if (!vf && l.source === "R" && RB.ajouts) {
      var aj = RB.ajouts.de(l.ajout);
      if (aj) { var y = {}; Object.keys(l).forEach(function (k) { y[k] = l[k]; }); y.verif = { visite_le: aj.visite_le, note: aj.texte, prix: aj.prix, ajoute: true, eau: aj.eau, vidange: aj.vidange, elec: aj.elec, douche: aj.douche, chiens: aj.chiens }; return y; }
    }
    if (!vf) return l;
    var x = {}; Object.keys(l).forEach(function (k) { x[k] = l[k]; });
    [["eau", "eau"], ["vidange", "vidange"], ["elec", "elec"], ["douche", "douche"], ["chien", "chiens"]].forEach(function (c) {
      if (vf[c[1]] === "oui") x[c[0]] = 1; else if (vf[c[1]] === "non") x[c[0]] = 0;
    });
    if (vf.payant === "gratuit") x.payant = 0; else if (vf.payant === "payant") x.payant = 1;
    x.verif = vf;
    return x;
  }
  function barreAdmin() {
    return adminOn() ? '<p class="admin-barre"><strong>Mode administratrice</strong><span>Tes vérifications sont visibles par tous les voyageurs.</span>' +
      '<a href="moderation.html">Modération</a><button type="button" class="lien-discret" data-admin-sortir>Quitter</button></p>' : "";
  }

  /* Paysage dessiné : remplace la photo tant qu’elle n’est pas fournie */
  var PAYSAGE =
    '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
    '<defs><linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9D9CC"/><stop offset=".65" stop-color="#F1E3D6"/><stop offset="1" stop-color="#F4F1EA"/></linearGradient></defs>' +
    '<rect width="400" height="300" fill="url(#ciel)"/>' +
    '<circle cx="290" cy="118" r="34" fill="#C98E7E" opacity=".55"/>' +
    '<path d="M0 190 L70 130 L120 165 L190 95 L260 160 L310 125 L400 175 V300 H0Z" fill="#6E8E86" opacity=".45"/>' +
    '<path d="M0 215 Q90 175 180 205 T400 195 V300 H0Z" fill="#6E8E86" opacity=".75"/>' +
    '<path d="M0 250 Q120 220 230 245 T400 235 V300 H0Z" fill="#4F6C65"/>' +
    '<path d="M150 300 C190 270 205 250 238 232" fill="none" stroke="#F4F1EA" stroke-width="10" stroke-linecap="round" opacity=".85"/>' +
    '<path d="M150 300 C190 270 205 250 238 232" fill="none" stroke="#C98E7E" stroke-width="1.6" stroke-dasharray="6 7"/>' +
    "</svg>";
  function photo(src, alt, secours, perso) {
    // secours : la photo de la région (Wikimedia Commons) si ta propre photo n’est pas fournie
    if (perso) src = perso.f;
    return '<div class="photo-repli">' + PAYSAGE + '</div><img src="' + esc(src) + '" alt="' + esc(alt || "") + '"' +
      (secours ? ' data-secours="' + esc(secours.f) + '"' : "") + ">" +
      (perso ? '<p class="photo-credit photo-credit--perso">Photo © Déborah' + (perso.lieu ? " · " + esc(perso.lieu) : "") + "</p>" : "") +
      (secours ? creditPhoto(secours, true) : "");
  }
  // Nos propres photos d’une journée (pas les jours de route ou de ferry)
  function persoDe(j) {
    if (!j || !RB.mesPhotos || j.type === "liaison" || j.type === "retour" || j.type === "mer") return null;
    return RB.mesPhotos[j.lieuId] || null;
  }
  function galerie(perso) {
    if (!perso || !perso.galerie || !perso.galerie.length) return "";
    return '<div class="galerie" aria-label="Nos photos">' + perso.galerie.map(function (g) {
      return '<figure><img src="' + esc(g.f) + '" alt="' + esc(g.lieu || "") + '" loading="lazy"><figcaption>' + esc(g.lieu || "") + "</figcaption></figure>";
    }).join("") + "</div>";
  }
  function creditPhoto(ph, cache) {
    return '<p class="photo-credit"' + (cache ? " hidden" : "") + ">Photo : " + esc(ph.lieu ? ph.lieu + " · " : "") +
      '<a href="' + esc(ph.page) + '" target="_blank" rel="noopener">' + esc(ph.auteur) + "</a>" +
      (ph.licence ? ", " + esc(ph.licence) : "") + " · Wikimedia Commons</p>";
  }
  /* ---------- La photo de chaque région (ou du pays) ---------- */
  var regionDeLieu = null;
  function photoDe(lieuId, pays) {
    var P = RB.photos || { regions: {}, pays: {} };
    if (!regionDeLieu) {
      regionDeLieu = {};
      RB.circuits.forEach(function (c) { c.stages.forEach(function (st) { regionDeLieu[st.id] = c.id; }); });
    }
    var rid = regionDeLieu[lieuId];
    return (rid && P.regions[rid]) || (pays && P.pays[pays] && P.regions[P.pays[pays]]) || null;
  }
  document.querySelectorAll("[data-paysage]").forEach(function (el) { el.innerHTML = PAYSAGE; });
  // Une photo pas encore fournie : on la retire et le paysage dessiné reste visible
  document.addEventListener("error", function (e) {
    var img = e.target;
    if (!img || img.tagName !== "IMG") return;
    // Sans réseau : la copie gardée lors de la préparation du voyage
    if (RB.horsLigne && !img.hasAttribute("data-essai") && img.getAttribute("src").indexOf("blob:") !== 0) {
      img.setAttribute("data-essai", "1");
      RB.horsLigne.photoGardee(img.getAttribute("src"), function (u) { img.src = u; }, function () { photoManquante(img); });
      return;
    }
    photoManquante(img);
  }, true);
  function photoManquante(img) {
    var sec = img.getAttribute("data-secours");
    if (sec) { // ta photo manque : on prend celle de la région, et on affiche son auteur
      img.removeAttribute("data-secours"); img.removeAttribute("data-essai"); img.src = sec;
      var cr = img.parentNode && img.parentNode.querySelector(".photo-credit:not(.photo-credit--perso)");
      if (cr) cr.hidden = false;
      var cp = img.parentNode && img.parentNode.querySelector(".photo-credit--perso");
      if (cp) cp.hidden = true;
      return;
    }
    var fig = img.closest && img.closest(".galerie figure");
    if (fig) { fig.remove(); return; }
    if (img.parentNode) img.remove();
  }
  document.querySelectorAll("img").forEach(function (img) { if (img.complete && !img.naturalWidth) img.remove(); });

  /* =====================================================================
     ÉCRAN 2 — LE QUESTIONNAIRE
     ===================================================================== */
  var Q = {
    durees: [
      { v: 4, l: "4 jours", s: "un long week-end" }, { v: 7, l: "1 semaine" }, { v: 14, l: "2 semaines" },
      { v: 21, l: "3 semaines" }, { v: 30, l: "1 mois" }, { v: 90, l: "3 mois" },
      { v: 180, l: "6 mois" }, { v: 365, l: "1 an", s: "la grande aventure" }
    ],
    vehicules: [
      { v: "van", l: "Van" }, { v: "fourgon", l: "Fourgon aménagé" },
      { v: "campingcar", l: "Camping-car" }
    ],
    tailles: [
      { v: "petit", l: "Moins de 6 m" }, { v: "moyen", l: "6 à 7 m" }, { v: "grand", l: "Plus de 7 m" }
    ],
    poids: [
      { v: "leger", l: "3,5 t ou moins" }, { v: "lourd", l: "Plus de 3,5 t" }
    ],
    critair: [
      { v: "1", l: "Crit’Air 1" }, { v: "2", l: "Crit’Air 2" }, { v: "3", l: "Crit’Air 3" }, { v: "4", l: "4, 5 ou sans" }
    ],
    rythmes: [
      { v: "tranquille", l: "Tranquille", s: "Peu de route, des journées sur place. On prend le temps." },
      { v: "equilibre", l: "Équilibré", s: "Un peu de route chaque jour, et de vraies pauses." },
      { v: "aventureux", l: "Aventureux", s: "Plus de route, plus de découvertes. On en voit un maximum." }
    ],
    budgets: [
      { v: "serre", l: "Serré", s: "moins de 60 € par jour" },
      { v: "confort", l: "Confortable", s: "60 à 120 € par jour" },
      { v: "large", l: "Large", s: "plus de 120 € par jour" }
    ],
    aime: [
      { v: "nature", l: "Nature" }, { v: "visites", l: "Visites" },
      { v: "gastronomie", l: "Gastronomie" }, { v: "detente", l: "Détente" }
    ]
  };

  function choix(q, liste, opts) {
    opts = opts || {};
    return '<div class="choix-groupe' + (opts.cartes ? " choix-groupe--cartes" : "") + (opts.grille ? " choix-groupe--grille" : "") + '">' +
      liste.map(function (o) {
        return '<button type="button" class="choix' + (opts.cartes ? " choix--carte" : "") + '" data-q="' + q + '" data-v="' + o.v + '"' +
          (opts.multi ? " data-multi" : "") + ' aria-pressed="false">' +
          '<span class="choix-l">' + o.l + "</span>" + (o.s ? '<span class="choix-s">' + o.s + "</span>" : "") + "</button>";
      }).join("") + "</div>";
  }

  function construireQuestionnaire() {
    var raccourcis = RB.raccourcis.map(function (nom) {
      var i = indexVille(nom);
      return '<button type="button" class="choix choix--ville" data-ville="' + i + '" aria-pressed="false"><span class="choix-l">' + esc(nom) + "</span></button>";
    }).join("");
    var html =
      '<fieldset class="question" data-question="depart"><legend><span class="question-n">1</span>D’où pars-tu ?</legend>' +
        '<div class="depart-choisi" id="depart-choisi" hidden></div>' +
        '<div id="depart-saisie">' +
          '<label class="champ champ--recherche"><span id="depart-label">Tape ta ville</span>' +
            '<input type="text" id="depart-recherche" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Par exemple : Angers, Gand, Turin…" role="combobox" aria-autocomplete="list" aria-controls="suggestions" aria-expanded="false"></label>' +
          '<ul class="suggestions" id="suggestions" role="listbox"></ul>' +
          '<div class="depart-inconnu" id="depart-inconnu" hidden></div>' +
          '<p class="question-aide" id="aide-raccourcis">Ou en un geste :</p>' +
          '<div class="choix-groupe" id="raccourcis">' + raccourcis + "</div>" +
        "</div></fieldset>" +

      '<fieldset class="question" data-question="envie"><legend><span class="question-n">2</span>Où as-tu envie d’aller ?</legend>' +
        '<div class="depart-choisi" id="dest-choisie" hidden></div>' +
        '<div id="dest-saisie">' +
          '<label class="champ champ--recherche"><span id="dest-label">Tape ta destination</span>' +
            '<input type="text" id="dest-recherche" autocomplete="off" spellcheck="false" placeholder="Un pays, une région, une ville : Toscane, Norvège, Budapest…" role="combobox" aria-autocomplete="list" aria-controls="dest-suggestions" aria-expanded="false"></label>' +
          '<ul class="suggestions" id="dest-suggestions" role="listbox"></ul>' +
          '<div class="depart-inconnu" id="dest-inconnue" hidden></div>' +
          '<p class="question-aide">Ou laisse-toi guider :</p>' +
        "</div>" +
        '<div id="dest-guide">' +
        choix("partie", [{ v: "", l: "Surprends-moi", s: "je choisis pour toi" }].concat(RB.parties.map(function (p) { return { v: p.id, l: p.nom, s: p.sous }; })), { grille: true }) +
        '<div class="question-plus" id="bloc-region" hidden>' +
          '<p class="question-aide" id="aide-pays-guide"></p>' +
          '<div id="choix-pays-guide"></div>' +
          '<p class="question-aide" id="aide-region"></p>' +
          '<div id="choix-region"></div>' +
        "</div></div></fieldset>" +

      '<fieldset class="question" data-question="duree"><legend><span class="question-n">3</span>Combien de temps pars-tu ?</legend>' +
        choix("duree", Q.durees) +
        '<p class="question-aide">Ou choisis le nombre exact de jours :</p>' +
        '<div class="compteur">' +
          '<button type="button" class="compteur-btn" data-pas="-1" aria-label="Moins">−</button>' +
          '<label class="compteur-valeur"><input type="number" id="duree-nombre" inputmode="numeric" min="2" max="730" aria-label="Nombre de jours"><span id="duree-unite">jours</span></label>' +
          '<button type="button" class="compteur-btn" data-pas="1" aria-label="Plus">+</button>' +
        "</div>" +
        '<div class="champs-dates">' +
          '<label class="champ champ--date"><span>Départ le <em>(facultatif)</em></span><input type="date" id="date-depart"></label>' +
          '<label class="champ champ--date"><span>Retour le <em>(facultatif)</em></span><input type="date" id="date-retour"></label>' +
        "</div>" +
        '<p class="question-aide duree-resume" id="duree-resume"></p>' +
      "</fieldset>" +

      '<fieldset class="question" data-question="vehicule"><legend><span class="question-n">4</span>Ton véhicule</legend>' +
        choix("vehicule", Q.vehicules) +
        '<p class="question-aide" id="aide-taille">Et sa longueur :</p>' +
        choix("taille", Q.tailles) +
        '<p class="question-aide">Son poids total autorisé (PTAC, sur la carte grise) <em>· facultatif</em> :</p>' +
        choix("poids", Q.poids) +
        '<p class="question-aide">Sa vignette Crit’Air <em>· facultatif</em> :</p>' +
        choix("critair", Q.critair) +
        '<p class="question-aide question-aide--petit">Ça me sert à t’avertir des péages au-delà de 3,5 t et des zones à faibles émissions.</p>' +
      "</fieldset>" +

      '<fieldset class="question" data-question="rythme"><legend><span class="question-n">5</span>Ton rythme</legend>' +
        choix("rythme", Q.rythmes, { cartes: true }) + "</fieldset>" +

      '<fieldset class="question" data-question="budget"><legend><span class="question-n">6</span>Ton budget sur place, pour deux</legend>' +
        choix("budget", Q.budgets, { cartes: true }) + "</fieldset>" +

      '<fieldset class="question" data-question="aime"><legend><span class="question-n">7</span>Ce que tu aimes</legend>' +
        '<p class="question-aide">Coche tout ce qui te fait envie : plus tu en dis, plus ta route te ressemble.</p>' +
        RB.familles.map(function (f) {
          return '<div class="famille"><p class="famille-nom">' + f.nom + "</p>" +
            choix("aime", RB.envies.filter(function (e) { return e.famille === f.id; }).map(function (e) { return { v: e.id, l: e.nom }; }), { multi: true }) +
            "</div>";
        }).join("") +
        '<p class="question-aide" id="aime-compte"></p>' +
        "</fieldset>";

    var form = $("#questionnaire");
    form.innerHTML = html;
    form.addEventListener("click", function (e) {
      var pas = e.target.closest("[data-pas]");
      if (pas) {
        // Au jour près pour un court voyage, à la semaine puis au mois pour un long
        var n0 = parseInt(reponses.duree, 10) || 7, sens = parseInt(pas.dataset.pas, 10);
        var ref = sens < 0 ? n0 - 1 : n0;
        var cran = ref >= 120 ? 30 : ref >= 30 ? 7 : 1;
        fixerDuree(n0 + sens * cran);
        return;
      }
      var db = e.target.closest("[data-dest]");
      if (db) { choisirDestination(+db.dataset.dest); return; }
      if (e.target.closest("#btn-dest-inconnue")) { modeProcheDest = $("#dest-recherche").value.trim(); $("#dest-recherche").value = ""; proposerDestinations(""); $("#dest-recherche").focus(); return; }
      if (e.target.closest("#btn-annuler-dest")) { modeProcheDest = null; proposerDestinations(""); $("#dest-recherche").focus(); return; }
      if (e.target.closest("#btn-changer-dest")) { reponses.destination = null; enregistrerReponses(); majQuestionnaire(); $("#dest-recherche").focus(); return; }
      var vb = e.target.closest("[data-ville]");
      if (vb) { choisirVille(+vb.dataset.ville); return; }
      if (e.target.closest("#btn-changer-depart")) { reponses.depart = null; modeProche = null; enregistrerReponses(); majQuestionnaire(); $("#depart-recherche").focus(); return; }
      if (e.target.closest("#btn-depart-inconnu")) { passerEnModeProche(); return; }
      if (e.target.closest("#btn-annuler-proche")) { modeProche = null; $("#depart-recherche").value = ""; majQuestionnaire(); $("#depart-recherche").focus(); return; }
      var b = e.target.closest(".choix");
      if (!b) return;
      var q = b.dataset.q, v = b.dataset.v;
      if (q === "duree") v = parseInt(v, 10);
      if (b.hasAttribute("data-multi")) {
        var l = reponses[q] || [];
        var i = l.indexOf(v);
        if (i >= 0) l.splice(i, 1); else l.push(v);
        reponses[q] = l;
      } else {
        reponses[q] = v;
        if (q === "duree" && reponses.date) reponses.dateRetour = ajouterJours(reponses.date, v - 1);
        if (q === "partie") { reponses.region = ""; reponses.paysGuide = ""; }
        if (q === "paysGuide") reponses.region = "";
        if (q === "partie" || q === "region" || q === "paysGuide") reponses.destination = null;
      }
      enregistrerReponses();
      majQuestionnaire();
    });
    var champDest = $("#dest-recherche");
    champDest.addEventListener("input", function () { proposerDestinations(this.value); });
    champDest.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        var premier = $("#dest-suggestions [data-dest]");
        if (premier) choisirDestination(+premier.dataset.dest);
      }
    });
    var champ = $("#depart-recherche");
    champ.addEventListener("input", function () { proposer(this.value); });
    champ.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        var premier = $("#suggestions [data-ville]");
        if (premier) choisirVille(+premier.dataset.ville);
        else if ($("#btn-depart-inconnu")) passerEnModeProche();
      }
    });
    $("#date-depart").addEventListener("change", function () {
      reponses.date = this.value;
      if (reponses.date && reponses.duree) reponses.dateRetour = ajouterJours(reponses.date, reponses.duree - 1);
      else if (!reponses.date) reponses.dateRetour = "";
      enregistrerReponses(); majQuestionnaire();
    });
    $("#date-retour").addEventListener("change", function () {
      reponses.dateRetour = this.value;
      if (reponses.date && reponses.dateRetour) {
        var n = ecartJours(reponses.date, reponses.dateRetour) + 1;
        if (n < 2) { reponses.dateRetour = ajouterJours(reponses.date, 1); n = 2; }
        if (n > 730) { reponses.dateRetour = ajouterJours(reponses.date, 729); n = 730; }
        reponses.duree = n;
      }
      enregistrerReponses(); majQuestionnaire();
    });
    $("#duree-nombre").addEventListener("change", function () { fixerDuree(parseInt(this.value, 10)); });
    $("#duree-nombre").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); this.blur(); } });
  }

  function enregistrerReponses() { memoire.ecrire(CLE.reponses, reponses); }

  /* ---------- Durée et dates ---------- */
  function ajouterJours(iso, n) {
    var d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n);
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function ecartJours(a, b) { return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000); }
  function fixerDuree(n) {
    if (isNaN(n)) n = 7;
    n = Math.max(2, Math.min(730, n));
    reponses.duree = n;
    if (reponses.date) reponses.dateRetour = ajouterJours(reponses.date, n - 1);
    enregistrerReponses(); majQuestionnaire();
  }
  function dateLisible(iso, avecAnnee) {
    var o = { weekday: "long", day: "numeric", month: "long" };
    if (avecAnnee) o.year = "numeric";
    return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", o);
  }

  /* ---------- Recherche de la ville de départ ---------- */
  var modeProche = null; // nom tapé par l’utilisateur quand la ville n’est pas dans la liste
  function normaliser(t) {
    return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[’'\-\.\(\)]/g, " ").replace(/\bste\b/g, "sainte").replace(/\bst\b/g, "saint")
      .replace(/\s+/g, " ").trim();
  }
  var INDEX = RB.villes.map(function (v) { return normaliser(v[0]); });
  function indexVille(nom) { return INDEX.indexOf(normaliser(nom)); }

  function chercher(q) {
    q = normaliser(q);
    if (!q) return [];
    var res = [];
    INDEX.forEach(function (n, i) {
      var score = n === q ? 0 : n.indexOf(q) === 0 ? 1 : (" " + n).indexOf(" " + q) >= 0 ? 2 : -1;
      if (score >= 0) res.push({ i: i, s: score - RB.villes[i][4] * 0.5 });
    });
    res.sort(function (a, b) { return a.s - b.s || INDEX[a.i].localeCompare(INDEX[b.i]); });
    return res.slice(0, 6).map(function (r) { return r.i; });
  }

  function proposer(texte) {
    var liste = $("#suggestions"), inconnu = $("#depart-inconnu"), champ = $("#depart-recherche");
    var res = chercher(texte);
    liste.innerHTML = res.map(function (i) {
      var v = RB.villes[i];
      return '<li><button type="button" role="option" data-ville="' + i + '"><strong>' + esc(v[0]) + "</strong><span>" + esc(RB.pays[v[1]]) + "</span></button></li>";
    }).join("");
    champ.setAttribute("aria-expanded", res.length ? "true" : "false");
    var t = String(texte || "").trim();
    var raisonDep = RB.horsRoute && RB.horsRoute[normaliser(t)];
    if (raisonDep && !res.length) {
      inconnu.hidden = false;
      inconnu.innerHTML = "<p>« " + esc(t) + " » " + esc(raisonDep) + " Pour partir de là-bas, choisis la ville du continent où tu commences ton road trip.</p>";
    } else if (!res.length && t.length >= 3 && !modeProche) {
      inconnu.hidden = false;
      inconnu.innerHTML = "<p>Je ne connais pas encore « " + esc(t) + " ».</p>" +
        '<button type="button" class="btn btn--secondaire btn--petit" id="btn-depart-inconnu">Partir de « ' + esc(t) + " » quand même</button>";
    } else if (!res.length && t.length >= 3 && modeProche) {
      inconnu.hidden = false;
      inconnu.innerHTML = "<p>Je ne trouve pas cette ville non plus. Essaie une ville plus grande, à une heure de route environ.</p>";
    } else {
      inconnu.hidden = true; inconnu.innerHTML = "";
    }
  }

  /* ---------- Recherche de la destination ---------- */
  var GRANDES = RB.villes.filter(function (v) { return !v[5]; }); // sans les milliers de petites villes
  var DESTS = (function () {
    var liste = [], etapes = {};
    // Pays de chaque région, d’après la ville la plus proche de chacune de ses étapes
    var paysRegions = {};
    RB.circuits.forEach(function (c) {
      if (c.officielle) { // une région officielle appartient à un seul pays
        (paysRegions[c.paysCode] = paysRegions[c.paysCode] || []).push(c.id);
        return;
      }
      var compte = {};
      c.stages.forEach(function (st) {
        var best = null, bd = Infinity;
        GRANDES.forEach(function (v) {
          var d = Math.pow(v[2] - st.lat, 2) + Math.pow((v[3] - st.lon) * Math.cos(st.lat * Math.PI / 180), 2);
          if (d < bd) { bd = d; best = v[1]; }
        });
        compte[best] = (compte[best] || 0) + 1;
      });
      // Un pays compte pour une région s’il y a au moins deux étapes
      Object.keys(compte).forEach(function (code) {
        if (compte[code] < 2) return;
        paysRegions[code] = paysRegions[code] || [];
        paysRegions[code].push(c.id);
      });
    });
    var nomsRegions = {};
    RB.circuits.forEach(function (c) { nomsRegions[normaliser(c.dest)] = 1; });
    RB.circuits.forEach(function (c) {
      liste.push({ type: "region", circuit: c.id, nom: c.dest, sous: c.titre, cle: normaliser(c.dest + " " + c.titre), rang: 0 });
      c.stages.forEach(function (st) {
        etapes[normaliser(st.nom)] = 1;
        liste.push({ type: "etape", circuit: c.id, etape: st.id, nom: st.nom, sous: c.dest, cle: normaliser(st.nom), rang: 1 });
      });
    });
    Object.keys(RB.pays).forEach(function (code) {
      var cs = paysRegions[code] || [];
      if (nomsRegions[normaliser(RB.pays[code])] && cs.length <= 1) return; // déjà proposé comme région
      var capitale = RB.villes.filter(function (v) { return v[1] === code; }).sort(function (x, y) { return y[4] - x[4]; })[0];
      liste.push({
        type: "pays", pays: code, nom: RB.pays[code], circuits: cs, cle: normaliser(RB.pays[code]), rang: 0.5,
        sous: cs.length ? (cs.length > 1 ? cs.length + " régions à découvrir" : "1 région à découvrir") : "Une boucle autour " + (capitale && /^[aeiouyhàâéèêîïôûAEIOUYHÉÈÎÔÂ]/.test(capitale[0]) ? "d’" : "de ") + (capitale ? capitale[0] : ""),
        lat: capitale ? capitale[2] : null, lon: capitale ? capitale[3] : null, villeNom: capitale ? capitale[0] : ""
      });
    });
    RB.villes.forEach(function (v) {
      if (etapes[normaliser(v[0])]) return;
      liste.push({ type: "ville", nom: v[0], pays: v[1], lat: v[2], lon: v[3], sous: RB.pays[v[1]], cle: normaliser(v[0]), rang: 1.5 });
    });
    return liste;
  })();

  var modeProcheDest = null; // destination tapée qui n’est pas dans la liste
  function chercherDestinations(q) {
    q = normaliser(q);
    if (!q) return [];
    var res = [];
    DESTS.forEach(function (d, i) {
      if (modeProcheDest && d.type !== "ville") return;
      var n = d.cle;
      var score = n === q ? 0 : n.indexOf(q) === 0 ? 1 : (" " + n).indexOf(" " + q) >= 0 ? 2 : -1;
      if (score >= 0) res.push({ i: i, s: score * 2 + d.rang });
    });
    res.sort(function (a, b) { return a.s - b.s || DESTS[a.i].cle.localeCompare(DESTS[b.i].cle); });
    return res.slice(0, 6).map(function (r) { return r.i; });
  }

  var ETIQUETTE = { region: "Région", etape: "Étape", pays: "Pays", ville: "Ville" };
  function proposerDestinations(texte) {
    var liste = $("#dest-suggestions"), inconnu = $("#dest-inconnue");
    var res = chercherDestinations(texte);
    liste.innerHTML = res.map(function (i) {
      var d = DESTS[i];
      return '<li><button type="button" role="option" data-dest="' + i + '"><span class="sugg-texte"><strong>' + esc(d.nom) + "</strong><span>" + esc(d.sous || "") + "</span></span>" +
        '<span class="sugg-type">' + ETIQUETTE[d.type] + "</span></button></li>";
    }).join("");
    $("#dest-recherche").setAttribute("aria-expanded", res.length ? "true" : "false");
    var t = String(texte || "").trim();
    if (modeProcheDest) {
      inconnu.hidden = false;
      inconnu.innerHTML = "<p>Je garde « " + esc(modeProcheDest) + " » comme destination. Tape une ville connue juste à côté, pour que je trace la route.</p>" +
        '<button type="button" class="lien-discret" id="btn-annuler-dest">Annuler</button>';
      $("#dest-label").textContent = "Une ville connue près de « " + modeProcheDest + " »";
      return;
    }
    $("#dest-label").textContent = "Tape ta destination";
    var raison = RB.horsRoute && RB.horsRoute[normaliser(t)];
    inconnu.hidden = !(t.length >= 3 && (!res.length || raison));
    if (raison) {
      liste.innerHTML = "";
      inconnu.innerHTML = "<p>« " + esc(t) + " » " + esc(raison) + " Choisis une autre destination, ou laisse-toi guider juste en dessous.</p>";
    } else {
      inconnu.innerHTML = inconnu.hidden ? "" : "<p>Je ne connais pas encore « " + esc(t) + " ».</p>" +
        '<button type="button" class="btn btn--secondaire btn--petit" id="btn-dest-inconnue">Partir vers « ' + esc(t) + " » quand même</button>";
    }
  }

  function choisirDestination(i) {
    var d = DESTS[i];
    var dest = { type: d.type, nom: d.nom, sous: d.sous };
    if (d.type === "region" || d.type === "etape") { dest.circuit = d.circuit; dest.etape = d.etape || ""; }
    if (d.type === "pays") {
      dest.pays = d.pays; dest.circuits = d.circuits;
      if (!d.circuits.length) { dest.type = "ville"; dest.nom = d.villeNom; dest.lat = d.lat; dest.lon = d.lon; dest.sous = d.nom; }
    }
    if (d.type === "ville") { dest.pays = d.pays; dest.lat = d.lat; dest.lon = d.lon; }
    if (modeProcheDest && d.type === "ville") {
      dest = { type: "ville", nom: modeProcheDest, sous: "près de " + d.nom, pays: d.pays, lat: d.lat, lon: d.lon, proche: d.nom };
      modeProcheDest = null;
    }
    reponses.destination = dest;
    reponses.partie = ""; reponses.region = ""; reponses.paysGuide = "";
    $("#dest-recherche").value = "";
    proposerDestinations("");
    enregistrerReponses();
    majQuestionnaire();
  }

  function passerEnModeProche() {
    modeProche = $("#depart-recherche").value.trim();
    $("#depart-recherche").value = "";
    majQuestionnaire();
    $("#depart-recherche").focus();
  }

  function choisirVille(i) {
    var v = RB.villes[i];
    reponses.depart = { nom: modeProche || v[0], pays: v[1], lat: v[2], lon: v[3], proche: modeProche ? v[0] : "" };
    modeProche = null;
    $("#depart-recherche").value = "";
    proposer("");
    enregistrerReponses();
    majQuestionnaire();
  }

  function majRegions() {
    var p = RB.parties.filter(function (x) { return x.id === reponses.partie; })[0];
    $("#bloc-region").hidden = !p;
    if (!p) { $("#choix-region").innerHTML = ""; $("#choix-pays-guide").innerHTML = ""; return; }
    var circuits = p.circuits.map(function (id) { return RB.circuits.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
    // D’abord le pays, puis la région : sinon, il y aurait trop de choix d’un coup
    var codes = [];
    circuits.forEach(function (c) { var k = RB.paysCircuit(c); if (codes.indexOf(k) < 0) codes.push(k); });
    codes.sort(function (x, y) { return (RB.pays[x] || x).localeCompare(RB.pays[y] || y, "fr"); });
    var plusieurs = codes.length > 1;
    if (!plusieurs) reponses.paysGuide = codes[0] || "";
    if (reponses.paysGuide && codes.indexOf(reponses.paysGuide) < 0) reponses.paysGuide = "";
    $("#aide-pays-guide").hidden = !plusieurs;
    $("#aide-pays-guide").textContent = "Un pays en particulier ?";
    $("#choix-pays-guide").innerHTML = plusieurs ? choix("paysGuide", [{ v: "", l: "Peu importe", s: "je choisis le meilleur" }].concat(codes.map(function (k) {
      var n = circuits.filter(function (c) { return RB.paysCircuit(c) === k; }).length;
      return { v: k, l: RB.pays[k] || k, s: n + (n > 1 ? " régions" : " région") };
    })), { grille: true }) : "";
    var pc = reponses.paysGuide;
    $("#aide-region").hidden = !pc;
    if (!pc) { $("#choix-region").innerHTML = ""; return; }
    $("#aide-region").textContent = "Une région en tête ? Sinon, je choisis la meilleure pour toi.";
    // Les itinéraires repérés en premier, puis les régions officielles par ordre alphabétique
    var regions = circuits.filter(function (c) { return RB.paysCircuit(c) === pc; })
      .sort(function (x, y) { return (x.officielle ? 1 : 0) - (y.officielle ? 1 : 0) || x.dest.localeCompare(y.dest, "fr"); })
      .map(function (c) { return { v: c.id, l: c.dest, s: c.titre }; });
    $("#choix-region").innerHTML = choix("region", [{ v: "", l: "Ce que tu me conseilles", s: "la meilleure région pour ton voyage" }].concat(regions), { grille: true });
  }

  function majQuestionnaire() {
    majRegions();
    var dd = reponses.destination, dc = $("#dest-choisie");
    dc.hidden = !dd;
    $("#dest-saisie").hidden = !!dd;
    $("#dest-guide").hidden = !!dd;
    if (dd) {
      dc.innerHTML = '<span class="depart-coche" aria-hidden="true">' + ICONES.r + "</span>" +
        '<span class="depart-texte"><strong>' + esc(dd.nom) + "</strong><span>" + esc(dd.sous || "") + "</span></span>" +
        '<button type="button" class="lien-discret" id="btn-changer-dest">Changer</button>';
    }
    document.querySelectorAll("#questionnaire .choix").forEach(function (b) {
      var q = b.dataset.q, v = b.dataset.v, val = reponses[q];
      var actif = Array.isArray(val) ? val.indexOf(v) >= 0 : String(val) === v;
      b.setAttribute("aria-pressed", actif ? "true" : "false");
    });
    var d = reponses.depart, choisi = $("#depart-choisi");
    choisi.hidden = !d;
    $("#depart-saisie").hidden = !!d;
    if (d) {
      choisi.innerHTML = '<span class="depart-coche" aria-hidden="true">' + ICONES.r + "</span>" +
        '<span class="depart-texte"><strong>' + esc(d.nom) + "</strong><span>" +
        (d.proche ? "Route calculée depuis " + esc(d.proche) : esc(RB.pays[d.pays] || "")) + "</span></span>" +
        '<button type="button" class="lien-discret" id="btn-changer-depart">Changer</button>';
    }
    $("#depart-label").textContent = modeProche ? "La grande ville la plus proche de « " + modeProche + " »" : "Tape ta ville";
    $("#aide-raccourcis").hidden = !!modeProche;
    $("#raccourcis").hidden = !!modeProche;
    var inc = $("#depart-inconnu");
    if (modeProche) {
      inc.hidden = false;
      inc.innerHTML = "<p>Je garde « " + esc(modeProche) + " » comme point de départ. Il me faut juste une ville connue à côté pour calculer la route.</p>" +
        '<button type="button" class="lien-discret" id="btn-annuler-proche">Annuler</button>';
    } else if (!$("#depart-recherche").value) { inc.hidden = true; inc.innerHTML = ""; }
    $("#date-depart").value = reponses.date || "";
    $("#date-depart").min = new Date().toISOString().slice(0, 10);
    $("#date-retour").value = reponses.dateRetour || "";
    $("#date-retour").min = reponses.date ? ajouterJours(reponses.date, 1) : new Date().toISOString().slice(0, 10);
    $("#duree-nombre").value = reponses.duree || "";
    $("#duree-unite").textContent = reponses.duree === 1 ? "jour" : "jours";
    var resume = "", nn = reponses.duree;
    if (nn) {
      var approx = nn >= 600 ? " (environ " + Math.round(nn / 365) + " ans)" : nn >= 330 ? " (environ un an)" : nn >= 45 ? " (environ " + Math.round(nn / 30) + " mois)" : "";
      resume = reponses.date && reponses.dateRetour
        ? "Du " + dateLisible(reponses.date, reponses.date.slice(0, 4) !== reponses.dateRetour.slice(0, 4)) + " au " + dateLisible(reponses.dateRetour, reponses.date.slice(0, 4) !== reponses.dateRetour.slice(0, 4)) + " : " + nn + " jours de road trip" + approx + "."
        : nn + " jours de road trip" + approx + ".";
      if (nn >= 25) resume += " Je t’enchaîne plusieurs régions" + (nn > 90 ? ", en prenant le temps dans chacune." : ".");
      if (nn >= 60 && !reponses.date) resume += " Indique ta date de départ : je choisirai les régions selon les saisons.";
    }
    $("#duree-resume").textContent = resume;
    var na = (reponses.aime || []).length;
    $("#aime-compte").textContent = na ? na + (na > 1 ? " envies cochées." : " envie cochée.") : "Rien de coché ? Je te propose un peu de tout.";
    $("#message-depart").textContent = "";
    var dRegion = $("#choix-region [data-v='" + (reponses.region || "") + "']");
    if (dRegion) dRegion.setAttribute("aria-pressed", "true");
  }

  var MANQUE = {
    depart: "ton point de départ", duree: "la durée du voyage",
    vehicule: "ton véhicule", taille: "la longueur de ton véhicule", rythme: "ton rythme", budget: "ton budget"
  };
  function manquants() {
    var m = [];
    if (!reponses.depart || typeof reponses.depart.lat !== "number") m.push("depart");
    ["duree", "vehicule", "taille", "rythme", "budget"].forEach(function (k) { if (!reponses[k]) m.push(k); });
    return m;
  }

  $("#btn-generer").addEventListener("click", function () {
    var m = manquants();
    if (m.length) {
      $("#message-depart").textContent = "Il me manque encore " + m.map(function (k) { return MANQUE[k]; }).join(", ") + ".";
      var cle = m[0] === "taille" ? "vehicule" : m[0];
      var fs = $('[data-question="' + cle + '"]');
      fs.scrollIntoView({ behavior: "smooth", block: "center" });
      fs.classList.remove("question--appel"); void fs.offsetWidth; fs.classList.add("question--appel");
      return;
    }
    composer();
  });

  /* ---------- Pendant la génération ---------- */
  var PHRASES = [
    "Je compose ta route…",
    "Je choisis les plus beaux coins pour toi…",
    "Je regarde où tu pourras dormir…",
    "Je découpe le voyage, jour par jour…"
  ];
  function composer(options) {
    options = options || {};
    var ecranComp = $("#composition"), phrase = $("#composition-phrase"), i = 0;
    phrase.textContent = options.circuit ? "Je compose une autre route pour toi…" : PHRASES[0];
    ecranComp.hidden = false;
    var minuteur = setInterval(function () {
      i = (i + 1) % PHRASES.length;
      phrase.classList.add("composition-phrase--sort");
      setTimeout(function () { phrase.textContent = PHRASES[i]; phrase.classList.remove("composition-phrase--sort"); }, 250);
    }, 1100);
    setTimeout(function () {
      voyage = RB.generer(options.reponses || reponses, options.circuit ? { circuit: options.circuit } : null);
      RB.aires.enrichir(voyage, function () {
        memoire.ecrire(CLE.route, voyage);
        clearInterval(minuteur);
        if (location.hash === "#/route") { afficherRoute(); window.scrollTo(0, 0); } else location.hash = "#/route";
        setTimeout(function () { ecranComp.hidden = true; }, 60);
      });
    }, options.circuit ? 1800 : 3300);
  }

  /* =====================================================================
     ÉCRAN 3 — MA ROUTE
     ===================================================================== */
  function recap(v) {
    return "Ton road trip : " + esc(v.maison.nom) + " → " + esc(v.circuit.dest) + ", " +
      v.jours.length + " jours, " + nombre(v.totalKm) + " km.";
  }

  /* ---------- Le pays de chaque étape (pour ne perdre personne) ---------- */
  var grillePays = null;
  function paysDe(lat, lon) {
    if (typeof lat !== "number") return "";
    if (!grillePays) {
      grillePays = {};
      RB.villes.forEach(function (v) { var k = Math.round(v[2] * 2) + ":" + Math.round(v[3] * 2); (grillePays[k] = grillePays[k] || []).push(v); });
    }
    var best = "", bd = Infinity, i0 = Math.round(lat * 2), j0 = Math.round(lon * 2), cl = Math.cos(lat * Math.PI / 180);
    for (var r = 1; r <= 4 && !best; r++) {
      for (var i = -r; i <= r; i++) for (var j = -r; j <= r; j++) {
        (grillePays[(i0 + i) + ":" + (j0 + j)] || []).forEach(function (v) {
          var dx = (v[3] - lon) * cl, dy = v[2] - lat, d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = v[1]; }
        });
      }
    }
    return best;
  }
  // Ajoute à chaque jour le pays d’arrivée et le pays de départ
  function noterPays(v) {
    var avant = v.maison.pays || paysDe(v.maison.lat, v.maison.lon);
    v.jours.forEach(function (j) {
      j.paysDepuis = avant;
      j.pays = j.type === "retour" ? (v.maison.pays || avant) : (paysDe(j.lat, j.lon) || avant);
      avant = j.pays;
    });
  }
  function nomPays(code) { return RB.pays[code] || ""; }
  // « Lagos, Portugal » — sauf si le nom contient déjà le pays
  function avecPays(nom, code) {
    var p = nomPays(code);
    if (!p || String(nom).indexOf(p) >= 0) return esc(nom);
    return esc(nom) + '<span class="pays">, ' + esc(p) + "</span>";
  }
  function paysDuVoyage(v) {
    var l = [];
    v.jours.forEach(function (j) { var p = nomPays(j.pays); if (p && l.indexOf(p) < 0) l.push(p); });
    return l;
  }

  function trace(v) {
    var pts = [{ lat: v.maison.lat, lon: v.maison.lon }].concat(v.jours.map(function (j) { return { lat: j.lat, lon: j.lon }; }));
    var lats = pts.map(function (p) { return p.lat; }), lons = pts.map(function (p) { return p.lon; });
    var k = Math.cos((Math.min.apply(null, lats) + Math.max.apply(null, lats)) / 2 * Math.PI / 180);
    var minX = Math.min.apply(null, lons) * k, maxX = Math.max.apply(null, lons) * k;
    var minY = -Math.max.apply(null, lats), maxY = -Math.min.apply(null, lats);
    var W = 340, H = 170, pad = 18;
    var ech = Math.min((W - 2 * pad) / Math.max(maxX - minX, 0.01), (H - 2 * pad) / Math.max(maxY - minY, 0.01));
    var ox = (W - (maxX - minX) * ech) / 2, oy = (H - (maxY - minY) * ech) / 2;
    function xy(p) { return [ox + (p.lon * k - minX) * ech, oy + (-p.lat - minY) * ech]; }
    var c = pts.map(xy);
    var ligne = c.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
    var dense = c.length > 40;
    var points = c.slice(1, -1).map(function (p) {
      return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (dense ? 1.4 : 3.2) + '" fill="' + (dense ? "#6E8E86" : "#F4F1EA") + '" stroke="#6E8E86" stroke-width="' + (dense ? 0 : 1.6) + '"/>';
    }).join("");
    return '<svg class="trace-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Tracé simplifié de la route">' +
      '<polyline points="' + ligne + '" fill="none" stroke="#6E8E86" stroke-width="' + (dense ? 1.4 : 2.2) + '" stroke-linejoin="round" stroke-linecap="round"/>' +
      points +
      '<circle cx="' + c[0][0].toFixed(1) + '" cy="' + c[0][1].toFixed(1) + '" r="6" fill="#BD6240"/>' +
      '<circle cx="' + c[0][0].toFixed(1) + '" cy="' + c[0][1].toFixed(1) + '" r="2.4" fill="#fff"/>' +
      "</svg>";
  }

  // Un voyage gardé avant l’arrivée des aires : on ajoute les lieux, puis on réaffiche
  function lieuxManquants(v, ensuite) {
    if (v && RB.ajouts && v.lieuxFaits && (v.ajoutsV || "") !== RB.ajouts.version()) v.lieuxFaits = false;
    if (!v || v.lieuxFaits || v._lieuxEnCours || !RB.aires) return false;
    v._lieuxEnCours = true;
    RB.aires.enrichir(v, function () {
      delete v._lieuxEnCours;
      if (RB.ajouts) v.ajoutsV = RB.ajouts.version();
      if (v === voyage) garderVoyage(v);
      ensuite();
    });
    return true;
  }

  function afficherRoute() {
    var v = voyage;
    noterPays(v);
    lieuxManquants(v, function () { if (location.hash === "#/route") afficherRoute(); });
    function ligne(j) {
      var meta = j.type === "pause" ? "Journée sur place, pas de route"
        : j.type === "mer" ? "Journée de traversée, à bord"
        : "depuis " + avecPays(j.depuis, j.paysDepuis) +
          (j.km ? " · " + nombre(j.km) + "\u00a0km · " + duree(j.min) : "") +
          (j.ferryMin ? " · ferry " + duree(j.ferryMin) : "");
      var frontiere = j.pays && j.paysDepuis && j.pays !== j.paysDepuis && j.type !== "pause"
        ? '<span class="frontiere">Entrée en ' + esc(nomPays(j.pays)) + "</span>" : "";
      var verifiee = j.lieuId && RB.verifs && j.type !== "retour" && verifDe(RB.verifs.cleEtape(j.lieuId));
      var points = j.aConfirmer && !verifiee
        ? '<span class="jour-points">' + j.aConfirmer + (j.aConfirmer > 1 ? " points" : " point") + " à vérifier sur place</span>"
        : "";
      return '<li><a class="jour-ligne jour-ligne--' + j.statut + (j.type === "pause" || j.type === "mer" ? " jour-ligne--pause" : "") + '" href="#/jour/' + j.n + '">' +
        '<span class="jour-num"><span>J' + j.n + "</span>" + (j.date ? "<small>" + esc(j.date) + "</small>" : "") + "</span>" +
        '<span class="jour-corps"><strong>' + avecPays(j.vers, j.pays) + "</strong>" + frontiere + '<span class="jour-meta">' + meta + "</span>" +
        resumeLieux(j) +
        '<span class="jour-statut">' + statut(verifiee ? "r" : j.statut) + points +
          (j.carnet && j.carnet.fait ? '<span class="jour-fait">' + ICONES.r + "J’y suis allé</span>" : "") +
          (j.carnet && j.carnet.note ? '<span class="jour-note">· une note</span>' : "") +
          (j.ajoute ? '<span class="jour-note">· jour ajouté</span>' : "") + "</span></span>" +
        '<span class="jour-fleche" aria-hidden="true">›</span></a>' +
        (RB.modifier && RB.modifier.peutChanger(v, j)
          ? '<button type="button" class="changer-btn" data-changer="' + j.n + '" aria-expanded="false">Changer cette étape</button>' +
            '<div class="changer" id="changer-' + j.n + '" hidden></div>'
          : "") +
        "</li>";
    }
    var lignes;
    if (v.regions && v.regions.length > 1) {
      // Long voyage : les jours sont regroupés par région (les liaisons vont avec la région qui suit)
      var groupes = [], courant = null, attente = [];
      var dernier = 0;
      v.jours.forEach(function (j, i) { if (j.region) dernier = i; });
      v.jours.forEach(function (j, i) {
        if (i > dernier) { attente.push(j); return; }
        if (j.type === "arrivee" || !courant) {
          if (j.type === "arrivee" || j.region) { courant = { nom: j.region, jours: attente.concat([j]) }; attente = []; groupes.push(courant); }
          else attente.push(j);
          return;
        }
        if (!j.region) { attente.push(j); return; }
        courant.jours = courant.jours.concat(attente, [j]); attente = [];
      });
      if (attente.length) groupes.push({ nom: "Le retour", jours: attente, retour: true });
      lignes = groupes.map(function (g, gi) {
        var km = g.jours.reduce(function (t, j) { return t + j.km; }, 0);
        var debut = g.jours[0], fin = g.jours[g.jours.length - 1];
        var quand = debut.date ? " · du " + esc(debut.date) + " au " + esc(fin.date) : " · J" + debut.n + " à J" + fin.n;
        var paysG = [];
        g.jours.forEach(function (j) { var p = nomPays(j.pays); if (p && paysG.indexOf(p) < 0 && j.type !== "liaison") paysG.push(p); });
        var phG = null;
        g.jours.forEach(function (j) { if (!phG && j.region) phG = photoDe(j.lieuId, j.pays); });
        return '<li class="groupe"><details' + (gi === 0 ? " open" : "") + '><summary>' +
          (phG && !g.retour ? '<span class="groupe-vignette"><img src="' + esc(phG.f) + '" alt="" loading="lazy"></span>' : '<span class="groupe-n">' + (g.retour ? "↩" : gi + 1) + "</span>") +
          '<span class="groupe-texte"><strong>' + esc(g.nom) + (paysG.length && !g.retour ? '<span class="pays"> · ' + esc(paysG.join(", ")) + "</span>" : "") + "</strong><span>" + g.jours.length + (g.jours.length > 1 ? " jours" : " jour") + " · " + nombre(km) + "\u00a0km" + quand + "</span></span>" +
          '<span class="groupe-fleche" aria-hidden="true">›</span></summary>' +
          '<ol class="programme">' + g.jours.map(ligne).join("") + "</ol></details></li>";
      }).join("");
      lignes = '<ol class="programme programme--groupes">' + lignes + "</ol>";
    } else {
      lignes = '<ol class="programme">' + v.jours.map(ligne).join("") + "</ol>";
    }

    // La photo du voyage : la première région visitée (sinon son pays)
    var phV = null, persoV = null;
    for (var q = 0; q < v.jours.length && !phV; q++) {
      var jq = v.jours[q];
      if (jq.type !== "liaison" && jq.type !== "retour" && jq.type !== "mer") { phV = photoDe(jq.lieuId, jq.pays); persoV = persoDe(jq); }
    }
    $("#route-contenu").innerHTML =
      (phV ? '<figure class="route-photo"><div class="route-photo-cadre">' + photo(phV.f, phV.lieu, persoV ? phV : null, persoV) + "</div>" + (persoV ? "" : creditPhoto(phV)) + "</figure>" : "") +
      barreAdmin() +
      (adminOn() ? '<button type="button" class="btn-admin" data-ajout-ouvrir="etape">+ Ajouter une étape à Roadbook</button><div class="verif-form" id="ajout-etape" hidden></div>' : "") +
      '<p class="surtitre">Ta route est prête</p>' +
      '<h1 class="titre-page">' + esc(v.circuit.titre) + "</h1>" +
      '<p class="recap">' + recap(v) + "</p>" +
      (function () { var l = paysDuVoyage(v); return l.length ? '<p class="recap-pays"><strong>' + (l.length > 1 ? l.length + " pays" : "1 pays") + "</strong> · " + esc(l.join(", ")) + "</p>" : ""; })() +
      (v.avertissement ? '<div class="avertissement"><p>' + esc(v.avertissement) + "</p></div>" : "") +
      '<div class="carte-cadre carte-cadre--route"><div class="trace" id="trace-route">' + trace(v) + "</div>" +
        '<div class="carte" id="carte-route" aria-label="Carte du voyage"></div></div>' +
      '<p class="carte-note">Le tracé relie tes étapes à vol d’oiseau. Touche un numéro pour voir l’étape, ou ouvre la carte en plein écran.</p>' +
      '<p class="budget">Budget indicatif sur place : <strong>' + nombre(v.budget[0]) + " à " + nombre(v.budget[1]) +
        " €</strong> pour deux (nuits, carburant, courses).</p>" +
      '<div class="horsligne" id="horsligne" role="status" aria-live="polite"></div>' +
      (function () {
        var l = RB.reglesRoute ? RB.reglesRoute.avantDePartir(v) : [];
        return l.length ? '<div class="a-preparer"><p class="a-preparer-titre">À préparer avant de partir</p><ul>' +
          l.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" : "";
      })() +
      (v.autres && v.autres.length
        ? '<div class="ailleurs"><p class="ailleurs-titre">' + (v.regions && v.regions.length > 1
            ? "Envie de commencer ailleurs ? Depuis " + esc(v.maison.nom) + ", ton voyage peut aussi démarrer par :"
            : "Envie d’ailleurs ? Depuis " + esc(v.maison.nom) + ", tu peux aussi partir vers :") + "</p>" +
          '<div class="choix-groupe">' + v.autres.map(function (x) {
            return '<button type="button" class="choix choix--petit" data-autre="' + esc(x.id) + '"><span class="choix-l">' + esc(x.dest) + "</span></button>";
          }).join("") + "</div></div>"
        : "") +
      '<div class="legende">' +
        '<p class="legende-titre">Comment lire ta route</p>' +
        '<ul><li>' + statut("r") + "<span>Vérifiée sur le terrain.</span></li>" +
        "<li>" + statutLieu() + "<span>Aires, campings et parkings repérés, pas encore roulés.</span></li>" +
        "<li>" + statut("c") + "<span>À vérifier en arrivant. Une solution de repli est toujours prévue.</span></li></ul>" +
      "</div>" +
      '<h2 class="sous-titre">Jour par jour</h2>' +
      (v.regions && v.regions.length > 1 ? '<p class="question-aide">' + v.regions.length + " étapes de voyage, touche une région pour voir ses journées.</p>" : "") +
      lignes +
      '<p class="note-essai">Version d’essai : les repères et les statuts sont des données d’exemple.</p>' +
      '<p class="credit">Aires, campings et parkings : © les contributeurs d’<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> ; en France, offices de tourisme via <a href="https://www.datatourisme.fr" target="_blank" rel="noopener">DATAtourisme</a>. À confirmer sur place.</p>';
    majHorsLigne(v);
    brancherChanger(v);
    if (changerOuvrir) { var no = changerOuvrir; changerOuvrir = null; ouvrirChanger(v, no, true); }
    if (changerFait) montrerChange(changerFait);
    setTimeout(function () {
      if (RB.carte && location.hash === "#/route") RB.carte.route($("#carte-route"), v, $("#trace-route"), function (e) { return ficheCarte(v, e); });
    }, 60);
  }

  // La fiche d’une étape quand on la touche sur la carte
  function ficheCarte(v, e) {
    var j = v.jours[e.debut - 1], fin = v.jours[e.fin - 1] || j;
    if (!j) return "<strong>" + esc(e.nom) + "</strong>";
    // La photo seulement si elle montre bien ce lieu (pas celle de la région)
    var pp = persoDe(j), ph = pp ? { f: pp.f } : photoDe(j.photoLieu || j.lieuId, j.pays);
    if (!pp && ph && (!ph.lieu || normaliser(j.vers).indexOf(normaliser(ph.lieu).split(" ")[0]) < 0)) ph = null;
    var quand = e.debut === e.fin ? "Jour " + e.debut + (j.date ? " · " + esc(j.date) : "")
      : "Jours " + e.debut + " à " + e.fin + (j.date && fin.date ? " · du " + esc(j.date) + " au " + esc(fin.date) : "");
    var nuits = e.fin - e.debut + 1;
    var rep = (j.reperes || []).filter(function (r) { return !/^En chemin/.test(r.nom) && r.nom !== "Avant de repartir"; })[0];
    return '<div class="carte-fiche">' +
      (ph ? '<img class="carte-fiche-photo" src="' + esc(ph.f) + '" alt="">' : "") +
      '<p class="carte-fiche-quand">' + quand + "</p>" +
      '<p class="carte-fiche-nom">' + avecPays(j.vers, j.pays) + "</p>" +
      '<p class="carte-fiche-info">' + (j.km ? nombre(j.km) + "\u00a0km · " + duree(j.min) + " depuis " + esc(j.depuis) : "Pas de route ce jour-là") +
        (nuits > 1 ? "<br>" + nuits + " nuits sur place" : "") + "</p>" +
      (rep ? '<p class="carte-fiche-rep">À voir : ' + esc(rep.nom) + "</p>" : "") +
      '<a class="carte-fiche-lien" href="#/jour/' + e.debut + '">Voir la journée ›</a></div>';
  }

  /* ---------- Changer une étape qui ne plaît pas ---------- */
  var changerOuvrir = null, changerFait = null, changerListe = {};
  function kmVol(a, b) {
    var r = Math.PI / 180, x = (b.lon - a.lon) * r * Math.cos((a.lat + b.lat) / 2 * r), y = (b.lat - a.lat) * r;
    return 6371 * Math.sqrt(x * x + y * y);
  }
  function choixHtml(x, i, j) {
    var rep = x.s.rep && x.s.rep[0] ? x.s.rep[0][0] : "";
    var d = Math.round(kmVol(j, x.s) / 5) * 5;
    var code = paysDe(x.s.lat, x.s.lon) || x.pays, pays = nomPays(code);
    return '<li><button type="button" class="changer-choix" data-choix="' + i + '">' +
      "<strong>" + esc(x.s.nom) + "</strong>" +
      "<span>" + esc(pays) +
        (d >= 5 ? " · à " + nombre(d) + "\u00a0km de " + esc(j.vers) : "") + "</span>" +
      (rep ? "<em>" + esc(rep) + "</em>" : "") + "</button></li>";
  }
  function ouvrirChanger(v, n, defiler) {
    var j = v.jours[n - 1], boite = $("#changer-" + n), bouton = document.querySelector('[data-changer="' + n + '"]');
    if (!j || !boite) return;
    var det = boite.closest("details"); if (det) det.open = true;
    var props = RB.modifier.propositions(v, n);
    changerListe = { n: n, choix: props.slice() };
    boite.innerHTML = '<p class="changer-titre">Une autre étape à la place de ' + esc(j.vers) + "</p>" +
      (props.length ? '<p class="changer-aide">Des étapes proches, sur ton chemin. Touche celle qui te plaît.</p>' +
        '<ul class="changer-liste">' + props.map(function (x, i) { return choixHtml(x, i, j); }).join("") + "</ul>"
        : '<p class="changer-aide">Pas d’autre étape préparée près d’ici. Choisis une ville ci-dessous.</p>') +
      '<label class="changer-label" for="changer-ville-' + n + '">Ou une ville de ton choix</label>' +
      '<input type="search" class="changer-champ" id="changer-ville-' + n + '" autocomplete="off" placeholder="Tape le nom d’une ville">' +
      '<ul class="changer-liste" id="changer-villes-' + n + '"></ul>' +
      '<p class="changer-note">La journée suivante part de ta nouvelle étape ; ses kilomètres sont estimés. Ton voyage garde le même nombre de jours.</p>' +
      '<button type="button" class="lien-discret" data-changer-fermer="' + n + '">Garder ' + esc(j.vers) + "</button>";
    boite.hidden = false;
    if (bouton) { bouton.setAttribute("aria-expanded", "true"); bouton.hidden = true; }
    var champ = $("#changer-ville-" + n);
    champ.addEventListener("input", function () {
      var base = props.length;
      changerListe.choix.length = base;
      var res = chercher(champ.value).map(function (i) { return RB.villes[i]; })
        .filter(function (x) { return kmVol(j, { lat: x[2], lon: x[3] }) < 600 && normaliser(x[0]) !== normaliser(j.vers); });
      res.forEach(function (x) { changerListe.choix.push(RB.etapeVille(x)); });
      $("#changer-villes-" + n).innerHTML = res.length ? res.map(function (x, k) { return choixHtml(changerListe.choix[base + k], base + k, j); }).join("")
        : (champ.value.trim().length >= 3 ? '<li class="changer-vide">Pas de ville de ce nom à moins de 600 km.</li>' : "");
    });
    if (defiler) setTimeout(function () { boite.scrollIntoView({ block: "center" }); }, 80);
  }
  function montrerChange(cf) {
    var li = document.querySelector('[data-changer="' + cf.n + '"]');
    li = li && li.closest("li"); if (!li) return;
    var det = li.closest("details"); if (det) det.open = true;
    var p = document.createElement("p");
    p.className = "changer-ok"; p.setAttribute("role", "status");
    p.textContent = "C’est changé : jour " + cf.n + ", tu dors à " + cf.nom + ". Les aires et campings autour sont mis à jour.";
    li.appendChild(p);
    if (!cf.vu) { cf.vu = true; setTimeout(function () { li.scrollIntoView({ block: "center" }); }, 80); }
    setTimeout(function () { if (changerFait === cf) changerFait = null; }, 4000);
  }
  function brancherChanger(v) {
    var boite = $("#route-contenu");
    boite.onclick = function (e) {
      var b = e.target.closest("[data-changer]");
      if (b) { ouvrirChanger(v, +b.dataset.changer); return; }
      var f = e.target.closest("[data-changer-fermer]");
      if (f) {
        var n = +f.dataset.changerFermer, p = $("#changer-" + n), bt = document.querySelector('[data-changer="' + n + '"]');
        if (p) { p.hidden = true; p.innerHTML = ""; }
        if (bt) { bt.hidden = false; bt.setAttribute("aria-expanded", "false"); bt.focus(); }
        return;
      }
      var c = e.target.closest("[data-choix]");
      if (!c) return;
      // Deux appuis : le premier demande confirmation
      if (!c.classList.contains("changer-choix--confirmer")) {
        boite.querySelectorAll(".changer-choix--confirmer").forEach(function (x) { x.classList.remove("changer-choix--confirmer"); var m = x.querySelector(".changer-confirmer"); if (m) m.remove(); });
        c.classList.add("changer-choix--confirmer");
        c.insertAdjacentHTML("beforeend", '<span class="changer-confirmer">Appuie encore pour dormir ici</span>');
        return;
      }
      var choix = changerListe.choix[+c.dataset.choix], nj = changerListe.n;
      if (!choix || !RB.modifier.changerEtape(v, nj, choix)) return;
      garderVoyage(v);
      try { localStorage.removeItem("roadbook.horsligne"); } catch (er) {}
      changerFait = { n: nj, nom: choix.s.nom };
      afficherRoute();
    };
  }

  /* ---------- Le voyage sans réseau ---------- */
  function photosDuVoyage(v) {
    var l = [];
    v.jours.forEach(function (j) {
      if (j.photo) l.push(j.photo);
      var pp = persoDe(j);
      if (pp) { l.push(pp.f); (pp.galerie || []).forEach(function (g) { l.push(g.f); }); }
      var ph = photoDe(j.photoLieu || j.lieuId, j.pays); if (ph) l.push(ph.f);
      if (j.lieuId) { var p2 = photoDe(j.lieuId, j.pays); if (p2) l.push(p2.f); }
    });
    return l;
  }
  function majHorsLigne(v) {
    var boite = $("#horsligne");
    if (!boite || !RB.horsLigne) return;
    if (!RB.horsLigne.possible()) {
      boite.innerHTML = '<p class="horsligne-titre">Sans réseau</p><p>Tes journées et tes lieux pour dormir sont gardés dans ce navigateur. ' +
        "Pour emporter aussi les photos et l’application, ouvre Roadbook depuis son lien en ligne.</p>";
      return;
    }
    function dessiner(e) {
      if (location.hash !== "#/route" || voyage !== v) return;
      var b = $("#horsligne"); if (!b) return;
      if (e && e.pret) {
        b.className = "horsligne horsligne--pret";
        b.innerHTML = '<p class="horsligne-titre">' + ICONES.r + "<span>Prêt pour rouler sans réseau</span></p>" +
          "<p>Journées, aires, campings et photos sont gardés sur cet appareil. Ouvre Roadbook comme d’habitude, même sans connexion.</p>" +
          '<p class="horsligne-astuce">Astuce : ajoute Roadbook à l’écran d’accueil de ton téléphone (menu Partager ou ⋮, puis « Sur l’écran d’accueil »).</p>';
      } else if (e && e.erreur) {
        b.className = "horsligne";
        b.innerHTML = '<p class="horsligne-titre">Pas encore prêt sans réseau</p><p>Il manque une partie des photos. Ce sera complété dès que tu retrouves du réseau.</p>';
      } else {
        var pc = e && e.total ? Math.round(100 * e.fait / e.total) : 0;
        b.className = "horsligne";
        b.innerHTML = '<p class="horsligne-titre">Je prépare ton voyage pour rouler sans réseau… ' + pc + " %</p>" +
          '<div class="horsligne-barre"><span style="width:' + pc + '%"></span></div>';
      }
    }
    var e = RB.horsLigne.etat(v);
    dessiner(e);
    if (!e || e.erreur) {
      if (e && e.erreur && !navigator.onLine) return;
      RB.horsLigne.preparer(v, photosDuVoyage(v), dessiner);
    }
  }
  window.addEventListener("online", function () { if (voyage && location.hash === "#/route") majHorsLigne(voyage); });

  /* =====================================================================
     ÉCRAN 4 — MA JOURNÉE
     ===================================================================== */
  var ICONE_SERVICE = {
    eau: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c3.5 4.6 6 8 6 11a6 6 0 0 1-12 0c0-3 2.5-6.4 6-11z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    vidange: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14l-2 6H7zM12 11v5m-4 4h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    elec: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3L6 13h5l-1 8 7-10h-5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    douche: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V8a4 4 0 0 1 8 0M10 11h8M12 14v1m3-1v1m3-1v1m-6 3v1m3-1v1m3-1v1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    chien: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10l-2-5 4 2h5l4-2-1 5v4a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="10" cy="11.5" r="1" fill="currentColor"/><circle cx="13" cy="11.5" r="1" fill="currentColor"/></svg>'
  };

  /* ---------- Les vrais lieux pour dormir (OpenStreetMap) ---------- */
  var TYPE_LIEU = { A: "Aire de camping-cars", C: "Camping", P: "Parking autorisé aux camping-cars", V: "Station de vidange", E: "Point d’eau" };
  var SERVICES_LIEU = [
    { cle: "eau", nom: "Eau propre", critique: true, repli: "Garde toujours un bidon de 10 litres plein ; demande à la mairie le point d’eau le plus proche." },
    { cle: "vidange", nom: "Vidange des eaux grises", critique: true, repli: "Les campings voisins acceptent souvent la vidange pour quelques euros : demande à l’accueil." },
    { cle: "elec", nom: "Électricité" },
    { cle: "douche", nom: "Douches" },
    { cle: "chien", nom: "Chiens" }
  ];
  function valeurLieu(cle, v) {
    if (v === 1) return cle === "chien" ? "Acceptés" : "Oui";
    if (v === 0) return cle === "chien" ? "Refusés" : "Non";
    if (v === 3) return cle === "chien" ? "En laisse" : "Pour les clients";
    return "Non renseigné";
  }
  // Que faire quand un service n’est pas renseigné, selon le lieu
  var SANS_INFO = {
    C: "Non renseigné : demande à l’accueil du camping, ou appelle avant d’arriver.",
    A: "Non renseigné : le panneau à l’entrée de l’aire liste les services.",
    P: "Non renseigné : regarde les panneaux du parking ou demande à la mairie.",
    V: "Non renseigné : regarde la borne sur place.",
    E: "Non renseigné : regarde la borne sur place."
  };
  function nomLieu(l) { return l.nom || (TYPE_LIEU[l.type] + (l.ville ? " de " + l.ville : "")); }
  function cleLieu(l) { return l.lat + "," + l.lon; }
  var lieuxAffiches = {};
  function carteLieu(l, ville, choix, pays) {
    l = avecVerif(l);
    var vf = l.verif, cleV = RB.verifs && RB.communaute ? RB.verifs.cleLieu(l) : "";
    if (cleV) lieuxAffiches[cleV] = { l: l, pays: pays };
    var dormir = l.type === "A" || l.type === "C" || l.type === "P";
    var choisi = dormir && choix === cleLieu(l);
    var infos = [];
    infos.push(l.km < 0.5 ? "À " + esc(ville) : "À " + String(l.km).replace(".", ",") + "\u00a0km de " + esc(ville));
    if (l.payant === 1) infos.push("payant"); else if (l.payant === 0) infos.push("gratuit");
    if (l.capacite) infos.push(esc(l.capacite) + " places");
    var lien = "https://www.openstreetmap.org/?mlat=" + l.lat + "&mlon=" + l.lon + "#map=17/" + l.lat + "/" + l.lon;
    return '<div class="info info--lieu' + (choisi ? " info--choisi" : "") + '">' +
      '<p class="lieu-type">' + TYPE_LIEU[l.type] + (choisi ? ' <span class="lieu-choisi">· ton choix pour ce soir</span>' : "") + "</p>" +
      '<div class="info-tete"><h3>' + esc(nomLieu(l)) + "</h3>" + (vf ? statutVerifie() : statutLieu()) + "</div>" +
      (vf ? ligneVerif(vf) : "") +
      '<p class="lieu-infos">' + infos.join(" · ") + "</p>" +
      (l.source === "D" ? '<p class="lieu-infos">Infos complétées par l’office de tourisme (DATAtourisme)</p>' : "") +
      (l.horaires ? '<p class="lieu-infos">Horaires : ' + esc(l.horaires) + "</p>" : "") +
      (dormir && !vf ? "<p>Stationnement de nuit à confirmer sur place (panneaux, accueil, mairie).</p>" : "") +
      (vf && vf.prix ? '<p class="lieu-infos">Prix constaté : ' + esc(vf.prix) + "</p>" : "") +
      '<ul class="services">' + SERVICES_LIEU.filter(function (sv) { return dormir || sv.critique; }).map(function (sv) {
        var v = l[sv.cle];
        var cv = sv.cle === "chien" ? "chiens" : sv.cle;
        var st = vf && vf[cv] ? "v" : sv.critique ? "c" : "p";
        return '<li class="service service--' + (v === 1 || v === 3 ? "oui" : v === 0 ? "non" : "inconnu") + '">' +
          '<div class="service-ligne"><span class="service-icone">' + ICONE_SERVICE[sv.cle] + "</span>" +
          '<span class="service-nom">' + sv.nom + '</span><span class="service-valeur">' + valeurLieu(sv.cle, v) + "</span>" + (st === "v" ? statutVerifie() : statut(st)) + "</div>" +
          (sv.critique && v !== 1 ? repli(sv.repli) : "") + "</li>";
      }).join("") + "</ul>" +
      (SERVICES_LIEU.some(function (sv) { return (dormir || sv.critique) && l[sv.cle] === 2; })
        ? '<p class="lieu-infos lieu-sans-info">' + SANS_INFO[l.type] + "</p>" : "") +
      (RB.communaute && RB.communaute.active() ? '<div class="commu" data-commu="' + esc(RB.communaute.cle(l)) + '"></div>' +
        '<div class="commu-form" data-form="' + esc(RB.communaute.cle(l)) + '" hidden></div>' : "") +
      (dormir ? '<button type="button" class="btn btn--secondaire btn--petit btn--nuit" data-nuit="' + esc(cleLieu(l)) + '">' +
        (choisi ? "Choisir un autre lieu" : "Je dors ici ce soir") + "</button>" : "") +
      '<p class="lieu-liens"><a href="' + lien + '" target="_blank" rel="noopener">Voir le lieu</a>' +
lienSite(l) + "</p>" +
      (adminOn() && l.source === "R" && l.ajout ? '<button type="button" class="btn-admin" data-ajout-retirer="' + esc(l.ajout) + '">Retirer ce lieu ajouté</button>' : "") +
      (adminOn() && cleV && l.source !== "R" ? '<button type="button" class="btn-admin" data-verif-lieu="' + esc(cleV) + '">' + ICONES.r +
        (vf ? "Modifier ma vérification" : "J’y suis allée : vérifier ce lieu") + "</button>" +
        '<div class="verif-form" data-verif-form="' + esc(cleV) + '" hidden></div>' : "") +
      "</div>";
  }
  // Seuls les sites qui correspondent au lieu sont gardés : celui de la mairie (M:) ou celui du camping ou de l’aire (L:)
  function lienSite(l) {
    var s = String(l.site || ""), m = /^([ML]):(https?:\/\/.+)$/.exec(s);
    if (!m) return "";
    var texte = m[1] === "M" ? "Site de la mairie" : l.type === "C" ? "Site du camping" : l.type === "A" || l.type === "P" ? "Site de l’aire" : "Site du lieu";
    return ' · <a href="' + esc(m[2]) + '" target="_blank" rel="noopener">' + texte + "</a>";
  }
  // Une ligne courte pour l’écran « Ma route »
  function resumeLieux(j) {
    if (!j.lieux) return "";
    var l = j.lieux.filter(function (x) { return x.type !== "V" && x.type !== "E"; }).map(avecVerif);
    if (j.choixNuit) l.sort(function (x, y) { return (cleLieu(y) === j.choixNuit) - (cleLieu(x) === j.choixNuit); });
    if (!l.length) return '<span class="jour-nuit">Nuit : aucune aire ni camping connu à moins de 35 km, à chercher sur place</span>';
    var p = l[0];
    var puce = function (cle, court) {
      var v = p[cle], sym = v === 1 || v === 3 ? "✓" : v === 0 ? "✗" : "?";
      return '<span class="puce puce--' + (sym === "✓" ? "oui" : sym === "✗" ? "non" : "inconnu") + '">' + court + " " + sym + "</span>";
    };
    return '<span class="jour-nuit">Nuit : ' + esc(nomLieu(p)) + (p.verif ? " · vérifié par Roadbook" : "") + (p.km >= 0.5 ? " (" + String(p.km).replace(".", ",") + "\u00a0km)" : "") +
      (l[1] ? " · ou " + esc(nomLieu(l[1])) : "") + "</span>" +
      '<span class="puces">' + puce("eau", "Eau") + puce("vidange", "Vidange") + puce("elec", "Élec.") + puce("douche", "Douches") + puce("chien", "Chiens") + "</span>";
  }

  function repli(t) {
    return t ? '<p class="repli"><strong>Solution de repli</strong>' + esc(t) + "</p>" : "";
  }

  function afficherJour(n) {
    var v = voyage, j = v.jours[n - 1], total = v.jours.length;
    if (!j.pays) noterPays(v);
    var cleEt = j.lieuId && RB.verifs ? RB.verifs.cleEtape(j.lieuId) : "", vfEt = cleEt ? verifDe(cleEt) : null;
    lieuxManquants(v, function () { if (location.hash === "#/jour/" + n) afficherJour(n); });
    var html = '<div class="jour-photo">' + photo(j.photo, j.vers, photoDe(j.photoLieu || j.lieuId, j.pays), persoDe(j)) +
      '<a class="jour-photo-retour" href="#/route" aria-label="Revenir à ma route">←</a></div>' +
      galerie(persoDe(j)) +
      '<div class="colonne">' + barreAdmin() +
      '<p class="surtitre">Jour ' + j.n + " sur " + total + (j.date ? " · " + esc(j.date) : "") + "</p>" +
      '<h1 class="titre-page titre-page--jour">' + esc(j.vers) + "</h1>" +
      (nomPays(j.pays) && String(j.vers).indexOf(nomPays(j.pays)) < 0 ? '<p class="jour-pays">' + esc(nomPays(j.pays)) + "</p>" : "") +
      '<div class="jour-statut-tete">' + statut(vfEt ? "r" : j.statut) +
        (j.aConfirmer && !vfEt ? '<span class="jour-points">' + j.aConfirmer + (j.aConfirmer > 1 ? " points" : " point") + " à vérifier sur place</span>" : "") +
      "</div>" + (vfEt ? ligneVerif(vfEt) : "") +
      (adminOn() && cleEt && j.type !== "retour" && j.type !== "mer"
        ? '<button type="button" class="btn-admin" data-verif-etape="' + esc(cleEt) + '" data-nom="' + esc(j.vers) + '" data-lat="' + j.lat + '" data-lon="' + j.lon + '" data-pays="' + esc(j.pays || "") + '">' +
          ICONES.r + (vfEt ? "Retirer « étape vérifiée »" : "J’ai fait cette étape : la marquer vérifiée") + "</button>" : "");

    if (j.type === "pause") {
      html += '<div class="bloc bloc--pause"><p>' + esc(j.texte) + "</p></div>";
    } else if (j.type === "mer") {
      html += '<div class="bloc bloc--pause"><p>Aujourd’hui, tu es en mer. Rien à conduire : le ferry s’occupe de tout.</p></div>' +
        '<section class="bloc"><div class="info"><div class="info-tete"><h3>La traversée</h3>' + statut(j.route.statut) + "</div>" +
        "<p>" + esc(j.route.texte) + "</p>" + repli(j.route.repli) + "</div></section>";
    } else {
      html += '<section class="bloc">' +
        '<div class="chiffres' + (j.ferryMin ? " chiffres--trois" : "") + '"><div><b>' + nombre(j.km) + ' km</b><span>de route</span></div>' +
        "<div><b>" + (j.km ? duree(j.min) : "—") + "</b><span>de conduite</span></div>" +
        (j.ferryMin ? "<div><b>" + duree(j.ferryMin) + "</b><span>de ferry</span></div>" : "") + "</div>" +
        '<div class="info-tete info-tete--fin"><p class="trajet">De ' + avecPays(j.depuis, j.paysDepuis) + " à " + avecPays(j.vers, j.pays) + ", estimation</p>" + statut("p") + "</div>" +
        '<div class="info">' +
          '<div class="info-tete"><h3>La route</h3>' + statut(vfEt ? "r" : j.route.statut) + "</div>" +
          "<p>" + esc(j.route.texte) + "</p>" +
          (j.route.alerte ? '<p class="alerte">' + esc(j.route.alerte) + "</p>" : "") +
          repli(j.route.repli) +
        "</div></section>";
    }

    var regles = RB.reglesRoute ? RB.reglesRoute.duJour(v, j) : [];
    if (regles.length)
      html += '<section class="bloc"><h2 class="sous-titre">À savoir aujourd’hui</h2>' + regles.map(function (r) {
        return '<div class="info info--regle"><div class="info-tete"><h3>' + esc(r.titre) + "</h3>" + statut(r.statut) + "</div><p>" + esc(r.texte) + "</p></div>";
      }).join("") + "</section>";

    html += '<section class="bloc planning" id="planning"></section>';

    var ideesAj = RB.ajouts && j.lieuId ? RB.ajouts.idees(j.lieuId) : [];
    var nomsAj = ideesAj.map(function (x) { return x.nom; });
    html += '<section class="bloc"><h2 class="sous-titre">Si tu as envie…</h2><ul class="reperes">' +
      j.reperes.filter(function (r) { return nomsAj.indexOf(r.nom) < 0; }).map(function (r) {
        var cleR = j.lieuId && RB.verifs ? RB.verifs.cleRepere(j.lieuId, r.nom) : "", vfR = cleR ? verifDe(cleR) : null;
        return '<li class="info"><div class="info-tete"><h3>' + esc(r.nom) + "</h3>" + (vfR ? statutVerifie() : statut(r.statut)) + "</div><p>" + esc(r.texte) + "</p>" +
          (r.pourToi && r.pourToi.length ? '<p class="pour-toi">Pour toi · ' + r.pourToi.map(esc).join(", ") + "</p>" : "") +
          (vfR ? ligneVerif(vfR) : "") +
          (adminOn() && cleR ? '<button type="button" class="btn-admin btn-admin--petit" data-verif-repere="' + esc(cleR) + '" data-nom="' + esc(r.nom) + '" data-lat="' + j.lat + '" data-lon="' + j.lon + '" data-pays="' + esc(j.pays || "") + '">' +
            ICONES.r + (vfR ? "Retirer « vérifié »" : "J’y suis allée : vérifié") + "</button>" : "") + "</li>";
      }).join("") +
      ideesAj.map(function (x) {
        return '<li class="info"><div class="info-tete"><h3>' + esc(x.nom) + "</h3>" + statutVerifie() + "</div>" + (x.texte ? "<p>" + esc(x.texte) + "</p>" : "") +
          '<p class="verif-ligne">' + ICONES.r + "<span>Une idée de Roadbook, vérifiée sur place</span></p>" +
          (adminOn() ? '<button type="button" class="btn-admin btn-admin--petit" data-ajout-retirer="' + esc(x.id) + '">Retirer cette idée</button>' : "") + "</li>";
      }).join("") + "</ul>" +
      (adminOn() && j.lieuId && j.type !== "retour" && j.type !== "mer"
        ? '<button type="button" class="btn-admin" data-ajout-ouvrir="idee">+ Ajouter une idée de visite</button>' +
          '<div class="verif-form" id="ajout-idee" hidden></div>' : "") + "</section>";

    if (typeof j.lat === "number" && j.type !== "mer")
      html += '<section class="bloc"><h2 class="sous-titre">Sur la carte</h2>' +
        '<div class="carte-cadre carte-cadre--jour"><p class="carte-attente">La carte s’affiche quand tu as du réseau.</p>' +
        '<div class="carte" id="carte-jour" aria-label="Carte de la journée"></div></div>' +
        '<p class="carte-legende"><span class="carte-point carte-point--soir">★</span> ' + esc(j.type === "retour" ? j.vers : j.vers) +
        (j.lieux && j.lieux.length ? ' <span class="carte-point carte-point--lieu">A</span> aires <span class="carte-point carte-point--lieu carte-point--C">C</span> campings' : "") +
        "</p></section>";

    var lieux = (j.lieux || []).slice();
    // Le lieu choisi pour la nuit passe en premier
    lieux.sort(function (x, y) { return (cleLieu(y) === j.choixNuit) - (cleLieu(x) === j.choixNuit); });
    if (j.dormir && lieux.length && j.dormir.statut !== "r") {
      // de vrais lieux à la place du texte générique
      html += '<section class="bloc"><h2 class="sous-titre">Où dormir</h2>' +
        lieux.map(function (l) { return carteLieu(l, j.vers, j.choixNuit, j.pays); }).join("") +
        repli(lieux.length > 1 ? "Si le premier lieu est complet ou fermé, essaie le suivant ; sinon, demande à l’office de tourisme une aire ou un camping ouvert."
          : "Si ce lieu est complet ou fermé, demande à l’office de tourisme une aire ou un camping ouvert. Ne t’installe jamais là où un panneau l’interdit.") +
        '<p class="credit credit--gauche">Aires et campings : © les contributeurs d’<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> ; en France, compléments des offices de tourisme via <a href="https://www.datatourisme.fr" target="_blank" rel="noopener">DATAtourisme</a> (Licence Ouverte). Informations non vérifiées sur place.</p>' +
        "</section>";
    } else if (j.dormir) {
      var d = j.dormir;
      html += '<section class="bloc"><h2 class="sous-titre">Où dormir</h2>' +
        '<div class="info info--dormir">' +
          '<div class="info-tete"><h3>' + esc(d.nom) + "</h3>" + (d.statut === "p" ? statutLieu() : statut(d.statut)) + "</div>" +
          "<p>" + esc(d.legal) + "</p>" +
          (d.note ? '<p class="alerte">' + esc(d.note) + "</p>" : "") +
          repli(d.repli) +
          (d.services.length ? '<ul class="services">' : "<ul hidden>") + d.services.map(function (s) {
            return '<li class="service service--' + (s.present === 1 ? "oui" : s.present === 0 ? "non" : "inconnu") + '">' +
              '<div class="service-ligne"><span class="service-icone">' + ICONE_SERVICE[s.cle] + "</span>" +
              '<span class="service-nom">' + s.nom + '</span><span class="service-valeur">' + s.valeur + "</span>" + statut(s.statut) + "</div>" +
              repli(s.repli) + "</li>";
          }).join("") + "</ul>" +
        "</div>" +
        (lieux.length ? '<h3 class="sous-titre sous-titre--petit">D’autres lieux tout près</h3>' + lieux.map(function (l) { return carteLieu(l, j.vers, j.choixNuit, j.pays); }).join("") +
          '<p class="credit credit--gauche">Aires et campings : © les contributeurs d’<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>.</p>' : "") +
        "</section>";
    } else {
      html += '<div class="bloc bloc--pause"><p>Ce soir, tu dors chez toi. Bienvenue à la maison.</p></div>';
    }
    if (adminOn() && j.dormir && typeof j.lat === "number")
      html += '<section class="bloc bloc--admin"><button type="button" class="btn-admin" data-ajout-ouvrir="lieu">+ Ajouter une aire ou un camping près de ' + esc(j.vers) + "</button>" +
        '<div class="verif-form" id="ajout-lieu" hidden></div></section>';
    html += blocCarnet(j) + blocModifier(v, j);
    html += "</div>";
    $("#jour-contenu").innerHTML = html;
    dessinerPlanning(v, j, false);
    brancherJour(v, j, n);
    remplirCommunaute(j);
    setTimeout(function () {
      if (RB.carte && location.hash === "#/jour/" + n && $("#carte-jour")) RB.carte.jour($("#carte-jour"), v, j);
    }, 60);

    var suivant = $("#btn-suivant");
    if (n < total) {
      suivant.textContent = "Jour suivant →";
      suivant.onclick = function () { location.hash = "#/jour/" + (n + 1); };
    } else {
      suivant.textContent = "Garder ma route";
      suivant.onclick = function () { location.hash = "#/garder"; };
    }
  }

  /* ---------- Mon carnet : « j’y suis allé », un avis, une note ---------- */
  var AVIS = [{ v: 3, l: "J’ai adoré" }, { v: 2, l: "Bien" }, { v: 1, l: "Bof" }];
  function blocCarnet(j) {
    var c = j.carnet || {};
    return '<section class="bloc carnet" id="carnet"><h2 class="sous-titre">Mon carnet</h2>' +
      '<button type="button" class="carnet-fait' + (c.fait ? " carnet-fait--oui" : "") + '" data-carnet="fait" aria-pressed="' + !!c.fait + '">' +
        '<span class="carnet-case" aria-hidden="true">' + (c.fait ? ICONES.r : "") + "</span>" +
        "<span>" + (c.fait ? "J’y suis allé" + (c.le ? ", le " + esc(c.le) : "") : "J’y suis allé") + "</span></button>" +
      (c.fait ? '<div class="choix-groupe carnet-avis">' + AVIS.map(function (a) {
        return '<button type="button" class="choix choix--petit" data-avis="' + a.v + '" aria-pressed="' + (c.avis === a.v) + '"><span class="choix-l">' + a.l + "</span></button>";
      }).join("") + "</div>" : "") +
      '<label class="champ carnet-note"><span>Ma note <em>(pour moi, et pour la prochaine fois)</em></span>' +
        '<textarea id="carnet-note" rows="3" placeholder="Une adresse, un conseil, un souvenir…">' + esc(c.note || "") + "</textarea></label>" +
      '<p class="carnet-garde" id="carnet-garde" role="status" aria-live="polite"></p></section>';
  }

  /* ---------- La communauté : avis, confirmations et photos des voyageurs ---------- */
  function etoiles(n) { var s = ""; for (var i = 1; i <= 5; i++) s += i <= Math.round(n) ? "★" : "☆"; return s; }
  function dateCourte(d) { try { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; } }
  function remplirCommunaute(j) {
    if (!RB.communaute || !RB.communaute.active()) return;
    var boites = document.querySelectorAll("#jour-contenu [data-commu]");
    if (!boites.length) return;
    var cles = [].map.call(boites, function (b) { return b.dataset.commu; });
    RB.communaute.avisDe(cles).then(function (tous) {
      boites.forEach(function (b) {
        var l = tous[b.dataset.commu] || [];
        b.innerHTML = resumeCommunaute(l) +
          '<button type="button" class="lien-discret commu-donner" data-donner="' + esc(b.dataset.commu) + '">' +
          (l.length ? "Donner mon avis" : "Sois le premier à donner ton avis") + "</button>";
      });
    });
  }
  function resumeCommunaute(l) {
    if (!l.length) return "";
    var r = RB.communaute.resume(l), noms = {};
    RB.communaute.SERVICES.forEach(function (s) { noms[s[0]] = s[1]; });
    var conf = Object.keys(r.services).map(function (k) {
      var s = r.services[k], oui = s.oui >= s.non;
      return '<span class="puce puce--' + (oui ? "oui" : "non") + '">' + esc(noms[k]) + (oui ? " ✓ " : " ✗ ") + (oui ? s.oui : s.non) + "</span>";
    }).join("");
    var photos = [];
    l.forEach(function (a) { (a.photos || []).forEach(function (p) { if (photos.length < 6) photos.push(RB.communaute.urlPhoto(p)); }); });
    var etat = r.existe ? (r.existe.etat === "oui" ? "Vu sur place le " : r.existe.etat === "ferme" ? "Signalé fermé le " : "Signalé introuvable le ") + dateCourte(r.existe.le) : "";
    return '<div class="commu-resume"><p class="commu-titre">Les voyageurs en parlent' +
        (r.notes ? ' · <span class="commu-etoiles" aria-label="' + r.moyenne.toFixed(1) + ' sur 5">' + etoiles(r.moyenne) + "</span> " + String(r.moyenne.toFixed(1)).replace(".", ",") : "") +
        " · " + r.avis + (r.avis > 1 ? " avis" : " avis") + "</p>" +
      (etat ? '<p class="commu-etat commu-etat--' + r.existe.etat + '">' + esc(etat) + "</p>" : "") +
      (conf ? '<p class="commu-conf">Confirmé par les voyageurs :</p><div class="puces">' + conf + "</div>" : "") +
      (photos.length ? '<div class="commu-photos">' + photos.map(function (u) { return '<img src="' + esc(u) + '" alt="Photo d’un voyageur" loading="lazy">'; }).join("") + "</div>" : "") +
      '<details class="commu-liste"><summary>Lire les avis</summary>' + l.slice(0, 20).map(function (a) {
        return '<div class="commu-avis"><p class="commu-qui">' + esc(a.pseudo || "Un voyageur") + " · " + esc(dateCourte(a.visite_le || a.cree_le)) +
          (a.note ? ' · <span class="commu-etoiles">' + etoiles(a.note) + "</span>" : "") + "</p>" +
          (a.texte ? "<p>" + esc(a.texte) + "</p>" : "") +
          (a.payant ? '<p class="commu-qui">' + (a.payant === "gratuit" ? "Gratuit" : "Payant" + (a.prix ? " : " + esc(a.prix) : "")) + "</p>" : "") +
          '<button type="button" class="lien-discret commu-signaler" data-signaler="' + esc(a.id) + '">Signaler</button></div>';
      }).join("") + "</details></div>";
  }
  function formulaireAvis(l) {
    var oui_non = function (cle, nom) {
      return '<div class="commu-ligne"><span>' + nom + '</span><span class="commu-choix">' +
        '<button type="button" class="choix choix--petit" data-champ-avis="' + cle + '" data-val="oui" aria-pressed="false"><span class="choix-l">Oui</span></button>' +
        '<button type="button" class="choix choix--petit" data-champ-avis="' + cle + '" data-val="non" aria-pressed="false"><span class="choix-l">Non</span></button></span></div>';
    };
    return '<form class="commu-formulaire" novalidate>' +
      '<p class="commu-titre">Ton avis sur ' + esc(l.nom || TYPE_LIEU[l.type]) + "</p>" +
      '<p class="question-aide">Le lieu existe-t-il toujours ?</p><div class="choix-groupe">' +
        [["oui", "Oui, il est là"], ["ferme", "Fermé"], ["introuvable", "Introuvable"]].map(function (x) {
          return '<button type="button" class="choix choix--petit" data-champ-avis="existe" data-val="' + x[0] + '" aria-pressed="false"><span class="choix-l">' + x[1] + "</span></button>";
        }).join("") + "</div>" +
      '<p class="question-aide">Ta note</p><div class="commu-notes">' + [1, 2, 3, 4, 5].map(function (n) {
        return '<button type="button" class="commu-etoile" data-champ-avis="note" data-val="' + n + '" aria-label="' + n + ' sur 5">☆</button>';
      }).join("") + "</div>" +
      '<p class="question-aide">Ce que tu as vu sur place <em>· réponds seulement à ce que tu sais</em></p>' +
      RB.communaute.SERVICES.map(function (s) { return oui_non(s[0], s[1]); }).join("") +
      '<div class="commu-ligne"><span>Prix</span><span class="commu-choix">' +
        '<button type="button" class="choix choix--petit" data-champ-avis="payant" data-val="gratuit" aria-pressed="false"><span class="choix-l">Gratuit</span></button>' +
        '<button type="button" class="choix choix--petit" data-champ-avis="payant" data-val="payant" aria-pressed="false"><span class="choix-l">Payant</span></button></span></div>' +
      '<label class="champ"><span>Combien ? <em>(facultatif)</em></span><input type="text" name="prix" maxlength="40" placeholder="12 € la nuit, 2 € les 100 litres…"></label>' +
      '<label class="champ"><span>Ton avis <em>(facultatif)</em></span><textarea name="texte" rows="3" maxlength="1000" placeholder="Calme, bien placé, bruyant le soir…"></textarea></label>' +
      '<label class="champ"><span>Le jour de ta visite</span><input type="date" name="visite_le" value="' + new Date().toISOString().slice(0, 10) + '"></label>' +
      '<label class="champ"><span>Ton prénom ou pseudo</span><input type="text" name="pseudo" maxlength="40" required autocomplete="nickname" value="' + esc(RB.communaute.pseudo()) + '"></label>' +
      '<label class="champ"><span>Tes photos <em>(3 au plus)</em></span><input type="file" name="photos" accept="image/*" multiple></label>' +
      '<div class="commu-apercus"></div>' +
      '<label class="commu-accord"><input type="checkbox" name="accord"> <span>Ces photos sont les miennes, sans visage ni plaque reconnaissable, et j’accepte que Roadbook les publie.</span></label>' +
      '<p class="action-message commu-message" role="status" aria-live="polite"></p>' +
      '<div class="planning-actions"><button type="submit" class="btn btn--principal btn--petit">Envoyer</button>' +
      '<button type="button" class="lien-discret" data-fermer-avis>Annuler</button></div>' +
      '<p class="commu-qui">Ton avis est publié après vérification, pour garder Roadbook fiable. En l’envoyant, tu acceptes les <a href="infos.html#conditions" target="_blank" rel="noopener">conditions</a> ; tes données : <a href="infos.html#confidentialite" target="_blank" rel="noopener">confidentialité</a>.</p></form>';
  }
  function gererCommunaute(e, j) {
    var t = e.target;
    var donner = t.closest("[data-donner]"), sig = t.closest("[data-signaler]");
    if (donner) {
      var cle = donner.dataset.donner, f = document.querySelector('[data-form="' + cle + '"]');
      var l = (j.lieux || []).filter(function (x) { return RB.communaute.cle(x) === cle; })[0];
      if (!f || !l) return true;
      f.hidden = false; f.innerHTML = formulaireAvis(l); f._etat = {}; f._photos = [];
      brancherFormulaire(f, l, j);
      f.scrollIntoView({ block: "start", behavior: "smooth" });
      return true;
    }
    if (sig) {
      if (!sig.classList.contains("btn--confirmer")) { sig.classList.add("btn--confirmer"); sig.textContent = "Signaler cet avis ? Appuie encore"; return true; }
      RB.communaute.signaler(sig.dataset.signaler, "").then(function () { sig.textContent = "Merci, c’est signalé."; sig.disabled = true; })
        .catch(function () { sig.textContent = "Pas de réseau, réessaie plus tard."; });
      return true;
    }
    return false;
  }
  function brancherFormulaire(f, l, j) {
    var form = f.querySelector("form"), msg = f.querySelector(".commu-message");
    form.addEventListener("click", function (e) {
      var b = e.target.closest("[data-champ-avis]");
      if (b) {
        var k = b.dataset.champAvis, v = b.dataset.val;
        f._etat[k] = f._etat[k] === v ? "" : v;
        form.querySelectorAll('[data-champ-avis="' + k + '"]').forEach(function (x) {
          if (k === "note") x.textContent = f._etat.note && +x.dataset.val <= +f._etat.note ? "★" : "☆";
          else x.setAttribute("aria-pressed", String(x.dataset.val === f._etat[k]));
        });
        return;
      }
      if (e.target.closest("[data-fermer-avis]")) { f.hidden = true; f.innerHTML = ""; }
    });
    form.photos.addEventListener("change", function () {
      var fichiers = [].slice.call(form.photos.files, 0, 3);
      msg.textContent = fichiers.length ? "Je prépare tes photos…" : "";
      Promise.all(fichiers.map(RB.communaute.preparerPhoto)).then(function (l) {
        f._photos = l; msg.textContent = "";
        form.querySelector(".commu-apercus").innerHTML = l.map(function (d) { return '<img src="' + d + '" alt="">'; }).join("");
      }).catch(function () { msg.textContent = "Une des photos n’a pas pu être lue."; });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var et = f._etat;
      var rien = !et.existe && !et.note && !form.texte.value.trim() && !f._photos.length &&
        !RB.communaute.SERVICES.some(function (s) { return et[s[0]]; }) && !et.payant;
      if (rien) { msg.textContent = "Dis-nous au moins une chose sur ce lieu."; return; }
      if (form.pseudo.value.trim().length < 2) { msg.textContent = "Indique ton prénom ou un pseudo, pour signer ton avis."; form.pseudo.focus(); return; }
      if (f._photos.length && !form.accord.checked) { msg.textContent = "Coche la case pour pouvoir envoyer tes photos."; return; }
      RB.communaute.pseudo(form.pseudo.value.trim());
      var av = {
        lieu_cle: RB.communaute.cle(l), lieu_nom: (l.nom || "").slice(0, 120), lieu_type: l.type, lat: l.lat, lon: l.lon, pays: j.pays || "",
        existe: et.existe || "", note: et.note ? +et.note : null, payant: et.payant || "", prix: form.prix.value.trim(),
        texte: form.texte.value.trim(), pseudo: form.pseudo.value.trim(), visite_le: form.visite_le.value || null, photos: f._photos
      };
      RB.communaute.SERVICES.forEach(function (s) { av[s[0]] = et[s[0]] || ""; });
      var bouton = form.querySelector("[type=submit]"); bouton.disabled = true; msg.textContent = "J’envoie…";
      RB.communaute.envoyer(av).then(function (r) {
        f.innerHTML = '<p class="commu-merci">' + (r === "en_file"
          ? "Merci ! Pas de réseau pour l’instant : ton avis partira tout seul dès que tu en retrouves."
          : "Merci ! Ton avis aide toute la communauté. Il sera publié après vérification.") + "</p>";
      }).catch(function () { bouton.disabled = false; msg.textContent = "L’envoi n’a pas marché. Réessaie dans un moment."; });
    });
  }

  /* ---------- Modifier ma route depuis la journée ---------- */
  function blocModifier(v, j) {
    if (!RB.modifier) return "";
    var rester = RB.modifier.peutRester(v, j), retirer = RB.modifier.peutRetirer(v, j), changer = RB.modifier.peutChanger(v, j);
    if (!rester && !retirer && !changer) return "";
    return '<section class="bloc modifier" id="modifier"><h2 class="sous-titre">Changer ma route</h2>' +
      '<div class="modifier-actions">' +
      (rester ? '<button type="button" class="btn btn--secondaire btn--petit" data-modif="rester">Rester un jour de plus à ' + esc(j.vers) + "</button>" : "") +
      (changer ? '<button type="button" class="btn btn--secondaire btn--petit" data-changer-etape="' + j.n + '">Choisir une autre étape</button>' : "") +
      (retirer ? '<button type="button" class="btn btn--secondaire btn--petit" data-modif="retirer">' +
        (j.type === "pause" ? "Retirer cette journée sur place" : "Sauter cette étape") + "</button>" : "") +
      "</div>" +
      '<p class="modifier-note" id="modifier-note">' + (j.type === "pause" || !retirer ? "Les jours suivants se décalent d’un jour." :
        (function () {
          var k = RB.modifier.joursSautes(v, j);
          return "Sauter l’étape : tu pars directement de " + esc((v.jours[j.n - 2] || {}).vers || "") + " vers l’étape suivante" +
            (k > 2 ? ", et les " + (k - 1) + " journées sur place à " + esc(j.vers) + " sont retirées" : k === 2 ? ", et la journée sur place à " + esc(j.vers) + " est retirée" : "") +
            ". Ton voyage dure " + k + (k > 1 ? " jours" : " jour") + " de moins.";
        })()) + "</p></section>";
  }

  function brancherJour(v, j, n) {
    var boite = $("#jour-contenu"), minuteur = null;
    var note = $("#carnet-note");
    if (note) note.addEventListener("input", function () {
      clearTimeout(minuteur);
      minuteur = setTimeout(function () {
        j.carnet = j.carnet || {};
        j.carnet.note = note.value;
        garderVoyage(v);
        var g = $("#carnet-garde"); if (g) g.textContent = "Gardé.";
      }, 500);
    });
    boite.onclick = function (e) {
      if (gererCommunaute(e, j)) return;
      var b = e.target.closest("[data-carnet], [data-avis], [data-nuit], [data-modif], [data-changer-etape]");
      if (!b) return;
      if (b.dataset.carnet === "fait") {
        j.carnet = j.carnet || {};
        j.carnet.fait = !j.carnet.fait;
        j.carnet.le = j.carnet.fait ? new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "";
        if (!j.carnet.fait) delete j.carnet.avis;
        garderVoyage(v); remplacerCarnet(v, j);
        return;
      }
      if (b.dataset.avis) {
        j.carnet = j.carnet || {};
        j.carnet.avis = j.carnet.avis === +b.dataset.avis ? 0 : +b.dataset.avis;
        garderVoyage(v); remplacerCarnet(v, j);
        return;
      }
      if (b.dataset.nuit) {
        j.choixNuit = j.choixNuit === b.dataset.nuit ? "" : b.dataset.nuit;
        garderVoyage(v);
        var y = window.scrollY; afficherJour(n); window.scrollTo(0, y);
        return;
      }
      if (b.dataset.changerEtape) { changerOuvrir = +b.dataset.changerEtape; location.hash = "#/route"; return; }
      if (b.dataset.modif) {
        // Deux appuis : le premier demande confirmation, sans fenêtre du navigateur
        if (!b.classList.contains("btn--confirmer")) {
          boite.querySelectorAll(".btn--confirmer").forEach(function (x) { x.classList.remove("btn--confirmer"); x.textContent = x.dataset.texte; });
          b.dataset.texte = b.textContent;
          b.classList.add("btn--confirmer");
          b.textContent = "Appuie encore pour confirmer";
          return;
        }
        var ok = b.dataset.modif === "rester" ? RB.modifier.resterUnJour(v, n) : RB.modifier.retirer(v, n);
        if (!ok) return;
        garderVoyage(v);
        if (RB.horsLigne) try { localStorage.removeItem("roadbook.horsligne"); } catch (er) {}
        var cible = b.dataset.modif === "rester" ? n + 1 : Math.min(n, v.jours.length);
        if (location.hash === "#/jour/" + cible) afficherJour(cible); else location.hash = "#/jour/" + cible;
      }
    };
  }
  function remplacerCarnet(v, j) {
    var ancien = $("#carnet"); if (!ancien) return;
    var tmp = document.createElement("div"); tmp.innerHTML = blocCarnet(j);
    ancien.replaceWith(tmp.firstChild);
    brancherJour(v, j, j.n);
  }

  /* ---------- Le planning de la journée (proposé, puis modifiable) ---------- */
  var ICONE_MOMENT = {
    route: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15V9a2 2 0 0 1 2-2h9l4 4h1a2 2 0 0 1 2 2v2h-2M3 15h2m4 0h6M7 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 11h1.5a2.5 2.5 0 0 1 0 5H16M9 4c0 1.5 1 1.5 1 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    repas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v8m-2-8v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-1.7 0-3 2-3 5s1.3 4 3 4v9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    visite: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    nuit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    libre: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function heureFr(h) { var p = String(h || "").split(":"); return p.length < 2 ? esc(h) : (+p[0]) + " h" + (p[1] !== "00" ? " " + p[1] : ""); }
  function planningDe(v, j) { return j.planning || (RB.planning ? RB.planning.proposer(j, v) : []); }
  function garderVoyage(v) {
    memoire.ecrire(CLE.route, v);
    var l = voyagesGardes(), i = -1;
    l.forEach(function (x, k) { if (x.id === v.id) i = k; });
    if (i >= 0) { l[i] = v; memoire.ecrire(CLE.voyages, l); }
  }
  function dessinerPlanning(v, j, edition) {
    var boite = $("#planning");
    if (!boite || !RB.planning) return;
    var liste = planningDe(v, j), perso = !!j.planning;
    if (!edition) {
      boite.innerHTML =
        '<div class="planning-tete"><h2 class="sous-titre">' + (perso ? "Ton planning" : "Le planning proposé") + "</h2>" +
          '<button type="button" class="lien-discret" data-planning="modifier">Modifier</button></div>' +
        '<p class="planning-note">' + (perso ? "Tu l’as adapté à ta façon." : "Une idée de journée, à suivre ou à changer comme tu veux.") + "</p>" +
        '<ol class="planning-liste">' + liste.map(function (m) {
          return '<li class="moment moment--' + esc(m.type || "libre") + '"><span class="moment-heure">' + heureFr(m.h) + "</span>" +
            '<span class="moment-point" aria-hidden="true">' + (ICONE_MOMENT[m.type] || "•") + "</span>" +
            '<span class="moment-texte"><strong>' + esc(m.titre) + "</strong>" + (m.texte ? "<span>" + esc(m.texte) + "</span>" : "") + "</span></li>";
        }).join("") + "</ol>" +
        (perso ? '<button type="button" class="lien-discret" data-planning="proposer">Revenir au planning proposé</button>' : "");
    } else {
      boite.innerHTML =
        '<h2 class="sous-titre">Modifier mon planning</h2>' +
        '<p class="planning-note">Change une heure, renomme un moment, retire ce qui ne te tente pas ou ajoute ce que tu veux faire.</p>' +
        '<ol class="planning-edition">' + liste.map(ligneEdition).join("") + "</ol>" +
        '<button type="button" class="btn btn--secondaire btn--petit" data-planning="ajouter">+ Ajouter un moment</button>' +
        '<div class="planning-actions"><button type="button" class="btn btn--principal btn--petit" data-planning="enregistrer">Enregistrer</button>' +
        '<button type="button" class="lien-discret" data-planning="annuler">Annuler</button></div>';
    }
    boite.onclick = function (e) {
      var b = e.target.closest("[data-planning]");
      if (!b) return;
      var a = b.dataset.planning;
      if (a === "modifier") { dessinerPlanning(v, j, true); boite.scrollIntoView({ block: "start", behavior: "smooth" }); }
      else if (a === "annuler") dessinerPlanning(v, j, false);
      else if (a === "proposer") { delete j.planning; garderVoyage(v); dessinerPlanning(v, j, false); }
      else if (a === "retirer") b.closest("li").remove();
      else if (a === "ajouter") {
        var ol = boite.querySelector(".planning-edition");
        ol.insertAdjacentHTML("beforeend", ligneEdition({ h: "15:00", titre: "", texte: "", type: "libre" }));
        var champs = ol.querySelectorAll("li:last-child input"); if (champs[1]) champs[1].focus();
      } else if (a === "enregistrer") {
        var nouveau = [];
        boite.querySelectorAll(".planning-edition li").forEach(function (li) {
          var h = heureSaisie(li.querySelector("[data-champ=h]").value), t = li.querySelector("[data-champ=titre]").value.trim();
          if (!t) return;
          nouveau.push({ h: h, titre: t, texte: li.querySelector("[data-champ=texte]").value.trim(), type: li.dataset.type || "libre" });
        });
        nouveau.sort(function (x, y) { return x.h < y.h ? -1 : x.h > y.h ? 1 : 0; });
        j.planning = nouveau;
        garderVoyage(v);
        dessinerPlanning(v, j, false);
      }
    };
  }
  // « 14h30 », « 14:30 », « 9 » ou « 930 » deviennent « 14:30 », « 09:00 », « 09:30 »
  function heureSaisie(s) {
    var m = String(s || "").trim().match(/^(\d{1,2})\s*(?:[h:.]\s*(\d{0,2}))?$/i) || String(s || "").trim().match(/^(\d{1,2})(\d{2})$/);
    if (!m) return "12:00";
    var h = Math.min(23, +m[1]), mn = Math.min(59, +(m[2] || 0));
    return (h < 10 ? "0" : "") + h + ":" + (mn < 10 ? "0" : "") + mn;
  }
  function ligneEdition(m) {
    return '<li data-type="' + esc(m.type || "libre") + '">' +
      '<input type="text" inputmode="numeric" maxlength="5" data-champ="h" value="' + esc(m.h) + '" placeholder="14:30" aria-label="Heure">' +
      '<div class="planning-champs"><input type="text" data-champ="titre" value="' + esc(m.titre) + '" placeholder="Ce que tu fais" aria-label="Moment">' +
      '<input type="text" data-champ="texte" value="' + esc(m.texte || "") + '" placeholder="Un détail (facultatif)" aria-label="Détail"></div>' +
      '<button type="button" class="planning-retirer" data-planning="retirer" aria-label="Retirer ce moment">×</button></li>';
  }

  /* =====================================================================
     ÉCRAN 5 — GARDER MA ROUTE
     ===================================================================== */
  function voyagesGardes() { return memoire.lire(CLE.voyages, []); }
  function estGarde(v) { return voyagesGardes().some(function (x) { return x.id === v.id; }); }

  function afficherGarder(confirme) {
    var v = voyage, acces = memoire.lire(CLE.acces, null), c = $("#garder-contenu");
    var carte = '<div class="carte-voyage"><p class="carte-voyage-titre">' + esc(v.circuit.titre) + '</p><p class="carte-voyage-recap">' + recap(v) + "</p></div>";

    if (confirme || estGarde(v)) {
      c.innerHTML =
        '<div class="garde-ok" aria-hidden="true">' + ICONES.r + "</div>" +
        '<h1 class="titre-page">C’est gardé' + (acces ? ", " + esc(acces.prenom) : "") + ".</h1>" +
        '<p class="chapo">Voilà ton itinéraire. Tu n’as plus qu’à faire tes affaires et rouler.</p>' + carte +
        '<div class="pile-boutons"><a class="btn btn--principal" href="#/route">Revoir ma route</a>' +
        '<a class="btn btn--secondaire" href="#/voyages">Mes voyages sauvegardés</a></div>';
      return;
    }

    c.innerHTML =
      '<h1 class="titre-page">Garder ma route</h1>' +
      '<p class="chapo">Pour la retrouver quand tu veux, au moment de faire tes valises.</p>' + carte +
      (acces
        ? '<p class="texte">Bonjour ' + esc(acces.prenom) + ", un seul appui et c’est gardé.</p>"
        : '<div class="acces"><h2 class="sous-titre">Crée ton accès</h2>' +
          '<p class="texte">Juste ton prénom et ton e-mail, rien d’autre.</p>' +
          '<label class="champ"><span>Ton prénom</span><input type="text" id="acces-prenom" autocomplete="given-name"></label>' +
          '<label class="champ"><span>Ton e-mail</span><input type="email" id="acces-email" autocomplete="email" inputmode="email"></label>' +
          '<p class="note-essai">Pour l’instant, pas de mot de passe : ton voyage, ton prénom et ton e-mail restent dans ce navigateur, sur cet appareil, et ne sont envoyés à personne (<a href="infos.html#confidentialite">confidentialité</a>).</p></div>') +
      '<p class="action-message" id="message-garder" role="status" aria-live="polite"></p>' +
      '<button class="btn btn--principal" type="button" id="btn-sauver">Sauvegarder ce voyage</button>';

    $("#btn-sauver").addEventListener("click", function () {
      if (!acces) {
        var prenom = $("#acces-prenom").value.trim(), email = $("#acces-email").value.trim();
        if (!prenom || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          $("#message-garder").textContent = !prenom ? "Il me manque ton prénom." : "Ton e-mail ne semble pas complet.";
          return;
        }
        acces = { prenom: prenom, email: email, creeLe: new Date().toISOString() };
        memoire.ecrire(CLE.acces, acces);
      }
      var liste = voyagesGardes();
      v.gardeLe = new Date().toISOString();
      liste.unshift(v);
      if (!memoire.ecrire(CLE.voyages, liste)) {
        $("#message-garder").textContent = "La mémoire de ce navigateur est pleine : retire un ancien voyage dans « Mes voyages », puis réessaie.";
        return;
      }
      memoire.ecrire(CLE.route, v);
      afficherGarder(true);
      window.scrollTo(0, 0);
    });
  }

  /* ---------- Mes voyages sauvegardés ---------- */
  function afficherVoyages() {
    var liste = voyagesGardes(), c = $("#voyages-contenu");
    if (!liste.length) {
      c.innerHTML = '<h1 class="titre-page">Mes voyages</h1><p class="chapo">Aucun voyage gardé pour l’instant.</p>' +
        '<a class="btn btn--principal" href="#/depart">Créer mon road trip</a>';
      return;
    }
    c.innerHTML = '<h1 class="titre-page">Mes voyages</h1><ul class="liste-voyages">' +
      liste.map(function (v, i) {
        var date = new Date(v.gardeLe || v.creeLe).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
        return '<li class="carte-voyage"><p class="carte-voyage-titre">' + esc(v.circuit.titre) + "</p>" +
          '<p class="carte-voyage-recap">' + recap(v) + "</p>" +
          '<p class="carte-voyage-date">Gardé le ' + date + "</p>" +
          '<div class="carte-voyage-actions"><button type="button" class="btn btn--principal btn--petit" data-ouvrir="' + i + '">Ouvrir</button>' +
          '<button type="button" class="lien-discret" data-retirer="' + i + '">Retirer</button></div></li>';
      }).join("") + "</ul>";
    c.onclick = function (e) {
      var o = e.target.closest("[data-ouvrir]"), r = e.target.closest("[data-retirer]");
      var l = voyagesGardes();
      if (o) { voyage = l[+o.dataset.ouvrir]; memoire.ecrire(CLE.route, voyage); location.hash = "#/route"; }
      if (r) { l.splice(+r.dataset.retirer, 1); memoire.ecrire(CLE.voyages, l); afficherVoyages(); }
    };
  }

  /* =====================================================================
     NAVIGATION
     ===================================================================== */
  function montrer(id) {
    document.querySelectorAll(".ecran").forEach(function (e) { e.classList.toggle("ecran--actif", e.id === id); });
    window.scrollTo(0, 0);
  }

  function router() {
    var h = location.hash || "#/";
    var m;
    if (h === "#/depart") { majQuestionnaire(); montrer("e-depart"); document.title = "Ton départ · Roadbook"; return; }
    if (h === "#/voyages") { afficherVoyages(); montrer("e-voyages"); document.title = "Mes voyages · Roadbook"; return; }
    if (h === "#/route" || /^#\/jour\/\d+$/.test(h) || h === "#/garder") {
      if (!voyage) { location.replace("#/depart"); return; }
      if (h === "#/route") { afficherRoute(); montrer("e-route"); document.title = "Ma route · Roadbook"; return; }
      if (h === "#/garder") { afficherGarder(false); montrer("e-garder"); document.title = "Garder ma route · Roadbook"; return; }
      m = h.match(/(\d+)$/);
      var n = Math.min(Math.max(1, +m[1]), voyage.jours.length);
      afficherJour(n); montrer("e-jour"); document.title = "Jour " + n + " · Roadbook";
      return;
    }
    // Accueil
    var nb = voyagesGardes().length, lien = $("#lien-voyages");
    lien.hidden = !nb;
    lien.textContent = nb ? "Mes voyages (" + nb + ")" : "";
    montrer("e-accueil");
    document.title = "Roadbook";
  }

  document.addEventListener("click", function (e) {
    var alt = e.target.closest("[data-autre]");
    if (alt && voyage) { composer({ circuit: alt.dataset.autre, reponses: voyage.reponses }); return; }
    var b = e.target.closest("[data-aller]");
    if (b) location.hash = b.dataset.aller;
  });
  window.addEventListener("hashchange", router);

  /* ---------- Mode administratrice : les actions ---------- */
  function redessiner() { var y = window.scrollY; router(); window.scrollTo(0, y); }
  function aujourdhui() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function formVerif(cle) {
    var x = lieuxAffiches[cle]; if (!x) return "";
    var l = x.l, vf = l.verif || {};
    function choixService(nom, cle2, v) {
      var cur = vf[cle2] || (v === 1 || v === 3 ? "oui" : v === 0 ? "non" : "");
      return '<label class="verif-champ"><span>' + nom + '</span><select data-champ="' + cle2 + '">' +
        [["", "Pas vu"], ["oui", "Oui"], ["non", "Non"]].map(function (o) { return '<option value="' + o[0] + '"' + (cur === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></label>";
    }
    var pay = vf.payant || (l.payant === 0 ? "gratuit" : l.payant === 1 ? "payant" : "");
    return '<p class="verif-titre">Ce que tu as vu sur place</p>' +
      '<label class="verif-champ"><span>Date de ta visite</span><input type="date" data-champ="visite_le" value="' + esc(vf.visite_le || aujourdhui()) + '"></label>' +
      '<div class="verif-grille">' + choixService("Eau propre", "eau", l.eau) + choixService("Vidange", "vidange", l.vidange) +
        choixService("Électricité", "elec", l.elec) + choixService("Douches", "douche", l.douche) + choixService("Chiens acceptés", "chiens", l.chien) +
        '<label class="verif-champ"><span>Prix</span><select data-champ="payant">' +
          [["", "Pas vu"], ["gratuit", "Gratuit"], ["payant", "Payant"]].map(function (o) { return '<option value="' + o[0] + '"' + (pay === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") +
        "</select></label></div>" +
      '<label class="verif-champ"><span>Tarif (facultatif)</span><input type="text" maxlength="40" data-champ="prix" placeholder="ex. 12 € la nuit" value="' + esc(vf.prix || "") + '"></label>' +
      '<label class="verif-champ"><span>Ton mot pour les voyageurs (facultatif)</span><textarea maxlength="600" rows="3" data-champ="note" placeholder="Calme, ombragé, arriver avant 18 h…">' + esc(vf.note || "") + "</textarea></label>" +
      '<div class="verif-actions"><button type="button" class="btn btn--principal btn--petit" data-verif-ok="' + esc(cle) + '">Enregistrer : lieu vérifié</button>' +
      (l.verif ? '<button type="button" class="lien-discret" data-verif-retirer="' + esc(cle) + '">Retirer la vérification</button>' : "") +
      '<button type="button" class="lien-discret" data-verif-fermer="' + esc(cle) + '">Annuler</button></div>' +
      '<p class="verif-msg" role="status"></p>';
  }
  document.addEventListener("click", function (e) {
    if (!RB.verifs) return;
    var b = e.target.closest("[data-admin-sortir]");
    if (b) { RB.verifs.sortir().then(redessiner); return; }
    b = e.target.closest("[data-verif-lieu]");
    if (b && adminOn()) {
      var f = document.querySelector('[data-verif-form="' + CSS.escape(b.dataset.verifLieu) + '"]');
      if (f) { f.innerHTML = formVerif(b.dataset.verifLieu); f.hidden = false; b.hidden = true; }
      return;
    }
    b = e.target.closest("[data-verif-fermer]");
    if (b) {
      var f2 = b.closest(".verif-form"); f2.hidden = true; f2.innerHTML = "";
      var bt = document.querySelector('[data-verif-lieu="' + CSS.escape(b.dataset.verifFermer) + '"]'); if (bt) bt.hidden = false;
      return;
    }
    b = e.target.closest("[data-verif-ok]");
    if (b && adminOn()) {
      var cle = b.dataset.verifOk, x = lieuxAffiches[cle], form = b.closest(".verif-form"), ligne = { cle: cle, type: "lieu" };
      if (!x) return;
      ligne.nom = nomLieu(x.l).slice(0, 160); ligne.lat = x.l.lat; ligne.lon = x.l.lon; ligne.pays = x.pays || null;
      form.querySelectorAll("[data-champ]").forEach(function (c) { var val = c.value.trim(); ligne[c.dataset.champ] = val || null; });
      b.disabled = true;
      RB.verifs.enregistrer(ligne).then(redessiner).catch(function (er) {
        b.disabled = false; form.querySelector(".verif-msg").textContent = "Pas enregistré : " + (navigator.onLine ? "réessaie, ou reconnecte-toi sur la page Modération." : "il faut du réseau.");
      });
      return;
    }
    b = e.target.closest("[data-verif-retirer], [data-verif-etape], [data-verif-repere]");
    if (!b || !adminOn()) return;
    var cleX = b.dataset.verifRetirer || b.dataset.verifEtape || b.dataset.verifRepere;
    var existe = !!verifDe(cleX);
    if (existe && !b.classList.contains("btn--confirmer")) {
      b.classList.add("btn--confirmer"); b.dataset.texte = b.innerHTML; b.textContent = "Appuie encore pour retirer"; return;
    }
    b.disabled = true;
    var p = existe ? RB.verifs.retirer(cleX) : RB.verifs.enregistrer({
      cle: cleX, type: b.dataset.verifEtape ? "etape" : "repere", nom: String(b.dataset.nom || "").slice(0, 160),
      lat: +b.dataset.lat || null, lon: +b.dataset.lon || null, pays: b.dataset.pays || null, visite_le: aujourdhui()
    });
    p.then(redessiner).catch(function () { b.disabled = false; b.textContent = navigator.onLine ? "Pas enregistré, réessaie" : "Il faut du réseau"; });
  });
  /* ---------- Mode administratrice : ajouter ses propres idées, étapes, aires ---------- */
  function champsService(prefixe) {
    return '<div class="verif-grille">' + [["eau", "Eau propre"], ["vidange", "Vidange"], ["elec", "Électricité"], ["douche", "Douches"], ["chiens", "Chiens acceptés"]].map(function (c) {
      return '<label class="verif-champ"><span>' + c[1] + '</span><select data-a="' + c[0] + '"><option value="">Pas vu</option><option value="oui">Oui</option><option value="non">Non</option></select></label>';
    }).join("") + '<label class="verif-champ"><span>Prix</span><select data-a="payant"><option value="">Pas vu</option><option value="gratuit">Gratuit</option><option value="payant">Payant</option></select></label></div>';
  }
  function boutonsAjout(type, texte) {
    return '<div class="verif-actions"><button type="button" class="btn btn--principal btn--petit" data-ajout-ok="' + type + '">' + texte + "</button>" +
      '<button type="button" class="lien-discret" data-ajout-fermer="' + type + '">Annuler</button></div><p class="verif-msg" role="status"></p>';
  }
  var FORM_AJOUT = {
    idee: function () {
      return '<p class="verif-titre">Une idée de visite à ajouter</p>' +
        '<label class="verif-champ"><span>Nom</span><input type="text" maxlength="160" data-a="nom" placeholder="ex. Le chemin du fauvisme"></label>' +
        '<label class="verif-champ"><span>Ce qu’il faut savoir</span><textarea maxlength="600" rows="3" data-a="texte" placeholder="Pourquoi y aller, quand, combien de temps…"></textarea></label>' +
        boutonsAjout("idee", "Ajouter cette idée");
    },
    lieu: function () {
      return '<p class="verif-titre">Une aire ou un camping à ajouter</p>' +
        '<label class="verif-champ"><span>Type</span><select data-a="lieu_type"><option value="A">Aire de camping-cars</option><option value="C">Camping</option><option value="P">Parking autorisé aux camping-cars</option></select></label>' +
        '<label class="verif-champ"><span>Nom</span><input type="text" maxlength="160" data-a="nom" placeholder="ex. Aire du port"></label>' +
        '<div class="verif-champ"><span>Où ?</span><div class="ajout-ou"><button type="button" class="btn btn--secondaire btn--petit" data-ajout-position>Ma position actuelle</button>' +
          '<span class="ajout-ou-ou">ou touche la carte de la journée, plus haut</span></div><p class="ajout-coord" data-coord>Pas encore placé.</p>' +
          '<input type="hidden" data-a="lat"><input type="hidden" data-a="lon"></div>' +
        '<label class="verif-champ"><span>Date de ta visite</span><input type="date" data-a="visite_le" value="' + aujourdhui() + '"></label>' +
        champsService() +
        '<label class="verif-champ"><span>Tarif (facultatif)</span><input type="text" maxlength="40" data-a="prix" placeholder="ex. 12 € la nuit"></label>' +
        '<label class="verif-champ"><span>Ton mot pour les voyageurs (facultatif)</span><textarea maxlength="600" rows="3" data-a="texte"></textarea></label>' +
        boutonsAjout("lieu", "Ajouter ce lieu");
    },
    etape: function () {
      return '<p class="verif-titre">Une étape à ajouter à Roadbook</p>' +
        '<p class="changer-aide">Roadbook la proposera dans les itinéraires qui passent près de là, et dans « Changer cette étape ».</p>' +
        '<label class="verif-champ"><span>Nom de l’étape</span><input type="text" maxlength="160" data-a="nom" placeholder="ex. Collioure"></label>' +
        '<div class="verif-champ"><span>Où ?</span><input type="search" class="changer-champ" data-ajout-ville placeholder="Tape une ville ou un village" autocomplete="off">' +
          '<ul class="changer-liste" data-ajout-villes></ul>' +
          '<div class="ajout-ou"><button type="button" class="btn btn--secondaire btn--petit" data-ajout-position>Ma position actuelle</button></div>' +
          '<p class="ajout-coord" data-coord>Pas encore placée.</p><input type="hidden" data-a="lat"><input type="hidden" data-a="lon"><input type="hidden" data-a="pays"></div>' +
        [1, 2, 3].map(function (k) {
          return '<label class="verif-champ"><span>Idée de visite ' + k + (k > 1 ? " (facultatif)" : "") + '</span><input type="text" maxlength="160" data-idee-nom="' + k + '" placeholder="' + (k === 1 ? "ex. Le château royal" : "") + '"></label>' +
            '<label class="verif-champ verif-champ--suite"><textarea maxlength="600" rows="2" data-idee-texte="' + k + '" placeholder="Ce qu’il faut savoir"></textarea></label>';
        }).join("") +
        boutonsAjout("etape", "Ajouter cette étape");
    }
  };
  function placer(form, lat, lon, texte) {
    form.querySelector('[data-a="lat"]').value = lat; form.querySelector('[data-a="lon"]').value = lon;
    var p = form.querySelector('[data-a="pays"]'); if (p) p.value = paysDe(lat, lon) || "";
    form.querySelector("[data-coord]").textContent = (texte ? texte + " · " : "Placé : ") + String(lat).replace(".", ",") + " / " + String(lon).replace(".", ",");
  }
  document.addEventListener("input", function (e) {
    var c = e.target.closest("[data-ajout-ville]"); if (!c) return;
    var form = c.closest(".verif-form"), ul = form.querySelector("[data-ajout-villes]");
    ul.innerHTML = chercher(c.value).map(function (i) {
      var x = RB.villes[i];
      return '<li><button type="button" class="changer-choix" data-ajout-placer="' + i + '"><strong>' + esc(x[0]) + "</strong><span>" + esc(nomPays(x[1])) + "</span></button></li>";
    }).join("");
  });
  document.addEventListener("click", function (e) {
    if (!RB.ajouts || !adminOn()) return;
    var b = e.target.closest("[data-ajout-ouvrir]");
    if (b) {
      var t = b.dataset.ajoutOuvrir, f = $("#ajout-" + t);
      if (!f) return;
      f.innerHTML = FORM_AJOUT[t](); f.hidden = false; b.hidden = true;
      if (t === "lieu" && RB.carte) RB.carte.choisirPoint(function (la, lo) { placer(f, la, lo, "Placé sur la carte"); });
      var premier = f.querySelector("input[type=text], input[type=search]"); if (premier) premier.focus();
      return;
    }
    b = e.target.closest("[data-ajout-fermer]");
    if (b) { redessiner(); return; }
    b = e.target.closest("[data-ajout-placer]");
    if (b) {
      var x = RB.villes[+b.dataset.ajoutPlacer], fp = b.closest(".verif-form");
      placer(fp, x[2], x[3], x[0]);
      var nm = fp.querySelector('[data-a="nom"]'); if (nm && !nm.value) nm.value = x[0];
      fp.querySelector("[data-ajout-villes]").innerHTML = "";
      return;
    }
    b = e.target.closest("[data-ajout-position]");
    if (b) {
      var fg = b.closest(".verif-form"), msg = fg.querySelector("[data-coord]");
      if (!navigator.geolocation) { msg.textContent = "Ton téléphone ne donne pas sa position ici."; return; }
      msg.textContent = "Je cherche ta position…";
      navigator.geolocation.getCurrentPosition(function (pos) {
        placer(fg, Math.round(pos.coords.latitude * 1e5) / 1e5, Math.round(pos.coords.longitude * 1e5) / 1e5, "Ta position");
      }, function () { msg.textContent = "Position refusée ou introuvable : autorise la localisation, ou choisis autrement."; }, { enableHighAccuracy: true, timeout: 15000 });
      return;
    }
    b = e.target.closest("[data-ajout-retirer]");
    if (b) {
      if (!b.classList.contains("btn--confirmer")) { b.classList.add("btn--confirmer"); b.textContent = "Appuie encore pour retirer"; return; }
      b.disabled = true;
      RB.ajouts.retirer(b.dataset.ajoutRetirer).then(function () { if (voyage) voyage.lieuxFaits = false; redessiner(); })
        .catch(function () { b.disabled = false; b.textContent = navigator.onLine ? "Pas retiré, réessaie" : "Il faut du réseau"; });
      return;
    }
    b = e.target.closest("[data-ajout-ok]");
    if (!b) return;
    var type = b.dataset.ajoutOk, form = b.closest(".verif-form"), out = form.querySelector(".verif-msg"), ligne = { type: type };
    form.querySelectorAll("[data-a]").forEach(function (c) { var val = c.value.trim(); if (val) ligne[c.dataset.a] = val; });
    if (!ligne.nom || ligne.nom.length < 2) { out.textContent = "Donne-lui un nom."; return; }
    if (ligne.lat) { ligne.lat = +ligne.lat; ligne.lon = +ligne.lon; }
    var j = /^#\/jour\/(\d+)$/.exec(location.hash), jour = j && voyage ? voyage.jours[+j[1] - 1] : null;
    if (type === "idee") {
      if (!jour) return;
      ligne.etape_id = jour.lieuId; ligne.lat = jour.lat; ligne.lon = jour.lon; ligne.pays = jour.pays || null;
    } else if (type === "lieu") {
      if (!ligne.lat) { out.textContent = "Place le lieu : ta position, ou touche la carte de la journée."; return; }
      ligne.pays = (jour && jour.pays) || paysDe(ligne.lat, ligne.lon) || null;
    } else {
      if (!ligne.lat) { out.textContent = "Dis où elle se trouve : choisis une ville, ou ta position."; return; }
      // Déjà dans Roadbook ? On ajoute alors plutôt des idées sur sa journée
      var deja = null;
      RB.circuits.concat(RB.etapesSeules || []).forEach(function (c) { c.stages.forEach(function (st) {
        if (!deja && (kmVol(st, ligne) < 5 || normaliser(st.nom) === normaliser(ligne.nom))) deja = st;
      }); });
      if (deja && !form.dataset.insiste) {
        form.dataset.insiste = "1";
        out.textContent = "Roadbook a déjà l’étape « " + deja.nom + " » ici. Tu peux plutôt ajouter tes idées sur sa journée. Pour l’ajouter quand même, appuie encore.";
        return;
      }
      ligne.etape_id = RB.ajouts.nouvelId();
      ligne.pays = ligne.pays || paysDe(ligne.lat, ligne.lon) || null;
      ligne.idees = [1, 2, 3].map(function (k) {
        var n = form.querySelector('[data-idee-nom="' + k + '"]').value.trim(), t = form.querySelector('[data-idee-texte="' + k + '"]').value.trim();
        return n ? [n.slice(0, 160), t.slice(0, 600)] : null;
      }).filter(Boolean);
      if (!ligne.idees.length) { out.textContent = "Ajoute au moins une idée de visite."; return; }
    }
    b.disabled = true; out.textContent = "J’enregistre…";
    RB.ajouts.enregistrer(ligne).then(function () {
      if (type === "lieu" && voyage) voyage.lieuxFaits = false;
      if (type === "etape") {
        form.innerHTML = '<p class="changer-ok">C’est ajouté : « ' + esc(ligne.nom) + " » sera proposée dans les itinéraires qui passent près de là, et dans « Changer cette étape ».</p>" +
          '<button type="button" class="lien-discret" data-ajout-fermer="etape">Fermer</button>';
        return;
      }
      redessiner();
    }).catch(function () {
      b.disabled = false; out.textContent = "Pas enregistré : " + (navigator.onLine ? "réessaie, ou reconnecte-toi sur la page Modération." : "il faut du réseau.");
    });
  });

  if (RB.ajouts) {
    RB.ajouts.charger(false, function (change) { if (change) redessiner(); });
    window.addEventListener("hashchange", function () { RB.ajouts.charger(false, function (change) { if (change) redessiner(); }); });
  }
  if (RB.verifs) {
    RB.verifs.admin().then(function (a) { if (a) redessiner(); });
    RB.verifs.charger(false, function (change) { if (change) redessiner(); });
    window.addEventListener("hashchange", function () { RB.verifs.charger(false, function (change) { if (change) redessiner(); }); });
  }

  construireQuestionnaire();
  router();
})();
