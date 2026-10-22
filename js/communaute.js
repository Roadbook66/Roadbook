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
})();
