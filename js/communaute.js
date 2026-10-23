/* =========================================================================
   Roadbook — la communauté : avis, confirmations et photos des voyageurs
   Envoyés « en attente », publiés après validation (page moderation.html).
   Sans réseau, l’avis attend dans le téléphone et part dès que le réseau revient.
   ========================================================================= */
(function () {
  var CLE_FILE = "roadbook.envois", CLE_PSEUDO = "roadbook.pseudo";
  var client = null, cache = {};
  var SERVICES = [["eau", "Eau propre"], ["vidange", "Vidange"], ["elec", "Électricité"], ["douche", "Douches"], ["chiens", "Chiens acceptés"]];

  function pret() {
    if (client) return client;
    var c = RB.config || {};
    if (!c.supabaseUrl || !c.supabaseCle || !window.supabase) return null;
    try { client = window.supabase.createClient(c.supabaseUrl, c.supabaseCle, { auth: { persistSession: false } }); } catch (e) { client = null; }
    return client;
  }
  function lire(cle, d) { try { var v = localStorage.getItem(cle); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function ecrire(cle, v) { try { localStorage.setItem(cle, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); });
  }

  RB.communaute = {};
  RB.communaute.active = function () { return !!pret(); };
  RB.communaute.SERVICES = SERVICES;
  RB.communaute.cle = function (l) { return (+l.lat).toFixed(5) + "," + (+l.lon).toFixed(5); };
  RB.communaute.pseudo = function (p) { if (p !== undefined) ecrire(CLE_PSEUDO, p); return lire(CLE_PSEUDO, ""); };

  // Réduit une photo (1600 px au plus) : le passage par le canevas retire aussi les données cachées, dont le GPS
  RB.communaute.preparerPhoto = function (fichier) {
    return new Promise(function (ok, non) {
      var url = URL.createObjectURL(fichier), img = new Image();
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = function () { URL.revokeObjectURL(url); non(new Error("photo illisible")); };
      img.src = url;
    });
  };
  function enBlob(dataUrl) {
    var p = dataUrl.split(","), b = atob(p[1]), u = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return new Blob([u], { type: "image/jpeg" });
  }

  // Envoie un avis (avec ses photos en dataURL) ; sans réseau, il est mis en file d’attente
  function envoyerMaintenant(av) {
    var c = pret();
    if (!c) return Promise.reject(new Error("pas de serveur"));
    var dossier = "attente/" + uuid();
    var photos = av.photos || [];
    return Promise.all(photos.map(function (d, i) {
      var chemin = dossier + "/" + (i + 1) + ".jpg";
      return c.storage.from("photos-attente").upload(chemin, enBlob(d), { contentType: "image/jpeg", upsert: false })
        .then(function (r) { if (r.error) throw r.error; return chemin; });
    })).then(function (chemins) {
      var ligne = {};
      Object.keys(av).forEach(function (k) { if (k !== "photos" && av[k] !== "" && av[k] != null) ligne[k] = av[k]; });
      ligne.photos = chemins;
      ligne.statut = "en_attente";
      return c.from("contributions").insert(ligne).then(function (r) { if (r.error) throw r.error; });
    });
  }
  RB.communaute.envoyer = function (av) {
    return envoyerMaintenant(av).then(function () { return "envoye"; }).catch(function (e) {
      if (!navigator.onLine || /fetch|network|Failed/i.test(String(e && (e.message || e)))) {
        var f = lire(CLE_FILE, []); f.push(av);
        if (!ecrire(CLE_FILE, f)) { av.photos = []; f[f.length - 1] = av; ecrire(CLE_FILE, f); }
        return "en_file";
      }
      throw e;
    });
  };
  RB.communaute.enAttente = function () { return lire(CLE_FILE, []).length; };
  function viderFile() {
    var f = lire(CLE_FILE, []);
    if (!f.length || !navigator.onLine || !pret()) return;
    var reste = [];
    f.reduce(function (p, av) {
      return p.then(function () { return envoyerMaintenant(av).catch(function () { reste.push(av); }); });
    }, Promise.resolve()).then(function () { ecrire(CLE_FILE, reste); });
  }
  window.addEventListener("online", viderFile);
  window.addEventListener("load", function () { setTimeout(viderFile, 3000); });

  // Les avis publiés pour une liste de lieux : { cle: [avis…] }
  RB.communaute.avisDe = function (cles) {
    var c = pret();
    var manquent = cles.filter(function (k) { return !cache[k]; });
    if (!c || !manquent.length) return Promise.resolve(pick(cles));
    return c.from("contributions")
      .select("id,cree_le,lieu_cle,existe,note,eau,vidange,elec,douche,chiens,payant,prix,texte,pseudo,visite_le,photos")
      .eq("statut", "publie").in("lieu_cle", manquent).order("cree_le", { ascending: false }).limit(200)
      .then(function (r) {
        if (r.error) throw r.error;
        manquent.forEach(function (k) { cache[k] = []; });
        (r.data || []).forEach(function (a) { (cache[a.lieu_cle] = cache[a.lieu_cle] || []).push(a); });
        return pick(cles);
      }).catch(function () { return pick(cles); });
    function pick(l) { var o = {}; l.forEach(function (k) { o[k] = cache[k] || []; }); return o; }
  };
  RB.communaute.urlPhoto = function (chemin) {
    var c = pret();
    return c ? c.storage.from("photos").getPublicUrl(chemin).data.publicUrl : "";
  };
  RB.communaute.signaler = function (id, raison) {
    var c = pret();
    if (!c) return Promise.reject(new Error("pas de serveur"));
    return c.from("signalements").insert({ contribution_id: id, raison: raison || "" }).then(function (r) { if (r.error) throw r.error; });
  };

  // Le résumé d’une liste d’avis : note moyenne, confirmations par service, dernier état
  RB.communaute.resume = function (liste) {
    var n = 0, somme = 0, services = {}, existe = null;
    liste.forEach(function (a) {
      if (a.note) { n++; somme += a.note; }
      SERVICES.forEach(function (s) {
        var v = a[s[0]]; if (!v) return;
        services[s[0]] = services[s[0]] || { oui: 0, non: 0 };
        services[s[0]][v]++;
      });
      if (!existe && a.existe) existe = { etat: a.existe, le: a.visite_le || a.cree_le };
    });
    return { avis: liste.length, notes: n, moyenne: n ? somme / n : 0, services: services, existe: existe };
  };

  /* ---------- Les vérifications de Roadbook (mode administratrice) ----------
     Tout le monde les lit ; seule une modératrice connectée (page moderation.html,
     même navigateur) peut en ajouter. Gardées dans le téléphone pour rouler sans réseau. */
  var CLE_VERIFS = "roadbook.verifs", verifs = lire(CLE_VERIFS, { le: 0, l: {} }), admin = null, clientAdmin = null;
  if (!verifs || typeof verifs.l !== "object" || !verifs.l) verifs = { le: 0, l: {} };
  function pretAdmin() {
    if (clientAdmin) return clientAdmin;
    var c = RB.config || {};
    if (!c.supabaseUrl || !c.supabaseCle || !window.supabase) return null;
    // Même session que la page de modération (même stockage du navigateur)
    try { clientAdmin = window.supabase.createClient(c.supabaseUrl, c.supabaseCle); } catch (e) { clientAdmin = null; }
    return clientAdmin;
  }
  RB.verifs = {};
  RB.verifs.cleLieu = function (l) { return "lieu:" + RB.communaute.cle(l); };
  RB.verifs.cleEtape = function (id) { return "etape:" + id; };
  RB.verifs.cleRepere = function (id, nom) {
    return ("repere:" + id + ":" + String(nom || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")).slice(0, 200);
  };
  RB.verifs.de = function (cle) { return verifs.l[cle] || null; };
  RB.verifs.toutes = function () { return verifs.l; };
  // Recharge depuis le serveur (au plus toutes les 5 minutes, sauf si force) ; fin(change)
  RB.verifs.charger = function (force, fin) {
    var c = pret();
    if (!c || !navigator.onLine || (!force && Date.now() - verifs.le < 300000)) { if (fin) fin(false); return; }
    c.from("verifications").select("*").limit(5000).then(function (r) {
      if (r.error) throw r.error;
      if (!Array.isArray(r.data)) throw new Error("réponse inattendue");
      var l = {};
      r.data.forEach(function (x) { l[x.cle] = x; });
      var change = JSON.stringify(l) !== JSON.stringify(verifs.l);
      verifs = { le: Date.now(), l: l };
      ecrire(CLE_VERIFS, verifs);
      if (fin) fin(change);
    }).catch(function () { if (fin) fin(false); });
  };
  // Suis-je connectée comme modératrice ? (réponse gardée pour la visite)
  RB.verifs.admin = function () {
    if (admin !== null) return Promise.resolve(admin);
    var c = pretAdmin();
    if (!c) return Promise.resolve(admin = false);
    return c.auth.getSession().then(function (r) {
      if (!r.data || !r.data.session) return (admin = false);
      return c.rpc("est_moderateur").then(function (x) { return (admin = !x.error && x.data === true); });
    }).catch(function () { return (admin = false); });
  };
  RB.verifs.estAdmin = function () { return admin === true; };
  RB.verifs.enregistrer = function (ligne) {
    var c = pretAdmin();
    if (!c || !admin) return Promise.reject(new Error("pas connectée"));
    ligne.maj_le = new Date().toISOString();
    return c.from("verifications").upsert(ligne).then(function (r) {
      if (r.error) throw r.error;
      verifs.l[ligne.cle] = ligne; ecrire(CLE_VERIFS, verifs);
    });
  };
  RB.verifs.retirer = function (cle) {
    var c = pretAdmin();
    if (!c || !admin) return Promise.reject(new Error("pas connectée"));
    return c.from("verifications").delete().eq("cle", cle).then(function (r) {
      if (r.error) throw r.error;
      delete verifs.l[cle]; ecrire(CLE_VERIFS, verifs);
    });
  };
  RB.verifs.sortir = function () {
    var c = pretAdmin(); admin = false;
    return c ? c.auth.signOut().catch(function () {}) : Promise.resolve();
  };

  /* ---------- Les ajouts de Roadbook : idées de visite, étapes, aires et campings ----------
     Ajoutés depuis l’appli en mode administratrice, puis mêlés aux données de Roadbook :
     les nouvelles étapes entrent dans les itinéraires, les aires dans « Où dormir ». */
  var CLE_AJOUTS = "roadbook.ajouts", ajouts = lire(CLE_AJOUTS, { le: 0, l: [] });
  if (!ajouts || !Array.isArray(ajouts.l)) ajouts = { le: 0, l: [] };
  function vol(a, b) {
    var r = Math.PI / 180, x = (b.lon - a.lon) * r * Math.cos((a.lat + b.lat) / 2 * r), y = (b.lat - a.lat) * r;
    return 6371 * Math.sqrt(x * x + y * y);
  }
  function oui(v) { return v === "oui" ? 1 : v === "non" ? 0 : 2; }
  function marquer(r) { r._ajout = true; return r; }
  function appliquer() {
    if (!RB.circuits) return;
    try { appliquerVraiment(); } catch (e) { /* un ajout mal formé ne doit jamais bloquer l’appli */ }
  }
  function appliquerVraiment() {
    // On retire d’abord ce qui avait été mêlé, puis on remet la liste à jour
    RB.circuits.forEach(function (c) {
      c.stages = c.stages.filter(function (st) { return !st._ajout; });
      c.stages.forEach(function (st) { if (st.rep && st.rep.some(function (r) { return r._ajout; })) st.rep = st.rep.filter(function (r) { return !r._ajout; }); });
    });
    RB.etapesSeules = [];
    var parId = {};
    RB.circuits.forEach(function (c) { c.stages.forEach(function (st) { parId[st.id] = st; }); });
    ajouts.l.filter(function (a) { return a.type === "etape" && typeof a.lat === "number"; }).forEach(function (a) {
      var st = { id: a.etape_id, nom: a.nom, lat: a.lat, lon: a.lon, pause: 0, _ajout: true,
        rep: (a.idees || []).filter(function (x) { return x && x[0]; }).map(function (x) { return marquer([x[0], x[1] || "", "r"]); }),
        route: ["p", 3, "", ""], aire: ["près de " + a.nom, "c", null, null, null], camp: ["près de " + a.nom, "c", null, null, null] };
      if (!st.rep.length) st.rep.push(marquer(["Le cœur de " + a.nom, a.texte || "Une balade à pied pour découvrir les lieux.", "r"]));
      // Dans la région la plus proche (moins de 120 km), à la place qui allonge le moins la route
      var best = null, bd = 120;
      RB.circuits.forEach(function (c) { c.stages.forEach(function (x) { var d = vol(x, st); if (d < bd) { bd = d; best = c; } }); });
      if (best) {
        var l = best.stages, pos = 0, cout = vol(st, l[0]);
        for (var k = 0; k < l.length - 1; k++) { var d2 = vol(l[k], st) + vol(st, l[k + 1]) - vol(l[k], l[k + 1]); if (d2 < cout) { cout = d2; pos = k + 1; } }
        if (vol(l[l.length - 1], st) < cout) pos = l.length;
        l.splice(pos, 0, st);
      } else {
        RB.etapesSeules.push({ id: a.etape_id, dest: a.nom, pays: String(a.pays || "").toLowerCase(), paysCode: a.pays || "", stages: [st] });
      }
      parId[st.id] = st;
    });
    ajouts.l.filter(function (a) { return a.type === "idee" && a.etape_id; }).forEach(function (a) {
      var st = parId[a.etape_id];
      if (st) (st.rep = st.rep || []).push(marquer([a.nom, a.texte || "", "r"]));
    });
    RB.airesEnPlus = ajouts.l.filter(function (a) { return a.type === "lieu" && typeof a.lat === "number"; }).map(function (a) {
      return [a.lieu_type || "A", a.lat, a.lon, a.nom, oui(a.eau), oui(a.vidange), oui(a.elec), oui(a.douche), oui(a.chiens),
        a.payant === "gratuit" ? 0 : a.payant === "payant" ? 1 : null, null, null, null, null, "R", a.id];
    });
    if (RB._oublierGrilles) RB._oublierGrilles();
  }
  appliquer();

  RB.ajouts = {};
  RB.ajouts.tous = function () { return ajouts.l; };
  RB.ajouts.de = function (id) { return ajouts.l.filter(function (a) { return a.id === id; })[0] || null; };
  // Les idées ajoutées pour une étape (y compris celles d’une étape ajoutée)
  RB.ajouts.idees = function (etapeId) {
    var res = [];
    ajouts.l.forEach(function (a) {
      if (a.type === "idee" && a.etape_id === etapeId) res.push({ nom: a.nom, texte: a.texte || "", id: a.id });
    });
    return res;
  };
  // Change quand les aires ajoutées changent : les voyages gardés recalculent alors leurs lieux
  RB.ajouts.version = function () {
    return ajouts.l.filter(function (a) { return a.type === "lieu"; }).map(function (a) { return a.id + a.maj_le; }).sort().join("|");
  };
  RB.ajouts.charger = function (force, fin) {
    var c = pret();
    if (!c || !navigator.onLine || (!force && Date.now() - ajouts.le < 300000)) { if (fin) fin(false); return; }
    c.from("ajouts").select("*").order("cree_le").limit(5000).then(function (r) {
      if (r.error) throw r.error;
      if (!Array.isArray(r.data)) throw new Error("réponse inattendue");
      var l = r.data, change = JSON.stringify(l) !== JSON.stringify(ajouts.l);
      ajouts = { le: Date.now(), l: l };
      ecrire(CLE_AJOUTS, ajouts);
      if (change) appliquer();
      if (fin) fin(change);
    }).catch(function () { if (fin) fin(false); });
  };
  RB.ajouts.enregistrer = function (ligne) {
    var c = pretAdmin();
    if (!c || !admin) return Promise.reject(new Error("pas connectée"));
    ligne.id = ligne.id || uuid();
    ligne.maj_le = new Date().toISOString();
    return c.from("ajouts").upsert(ligne).then(function (r) {
      if (r.error) throw r.error;
      ajouts.l = ajouts.l.filter(function (a) { return a.id !== ligne.id; }).concat([ligne]);
      ecrire(CLE_AJOUTS, ajouts); appliquer();
      return ligne;
    });
  };
  RB.ajouts.retirer = function (id) {
    var c = pretAdmin();
    if (!c || !admin) return Promise.reject(new Error("pas connectée"));
    return c.from("ajouts").delete().eq("id", id).then(function (r) {
      if (r.error) throw r.error;
      ajouts.l = ajouts.l.filter(function (a) { return a.id !== id; });
      ecrire(CLE_AJOUTS, ajouts); appliquer();
    });
  };
  RB.ajouts.nouvelId = function () { return "rb-" + uuid().slice(0, 8); };
})();
