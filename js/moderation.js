/* =========================================================================
   Roadbook — la page de modération (moderation.html)
   Connexion avec le compte créé dans Supabase (Authentication → Users), dont
   l’adresse figure dans la table « moderateurs ».
   Publier : la photo passe de « photos-attente » (privé) à « photos » (public).
   ========================================================================= */
(function () {
  var c = RB.config || {}, $ = function (s) { return document.querySelector(s); };
  var boite = $("#mod-contenu"), onglet = "attente";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (x) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[x]; }); }
  if (!c.supabaseUrl || !c.supabaseCle || !window.supabase) {
    boite.innerHTML = '<p class="mod-vide">Le serveur de la communauté n’est pas encore réglé (js/config.js).</p>';
    return;
  }
  var sb = window.supabase.createClient(c.supabaseUrl, c.supabaseCle);
  var TYPES = { A: "Aire de camping-cars", C: "Camping", P: "Parking", V: "Station de vidange", E: "Point d’eau" };

  function connexion(msg) {
    boite.innerHTML = '<form id="mod-cx" class="acces">' +
      '<label class="champ"><span>E-mail</span><input type="email" id="mod-email" autocomplete="username" required></label>' +
      '<label class="champ"><span>Mot de passe</span><input type="password" id="mod-mdp" autocomplete="current-password" required></label>' +
      '<p class="action-message">' + esc(msg || "") + '</p><button class="btn btn--principal" type="submit">Me connecter</button></form>';
    $("#mod-cx").onsubmit = function (e) {
      e.preventDefault();
      sb.auth.signInWithPassword({ email: $("#mod-email").value.trim(), password: $("#mod-mdp").value }).then(function (r) {
        if (r.error) connexion("Connexion refusée : vérifie l’e-mail et le mot de passe."); else afficher();
      });
    };
  }

  function afficher() {
    boite.innerHTML = '<div class="mod-onglets">' +
      [["attente", "En attente"], ["signalements", "Signalements"], ["publie", "Publiés"]].map(function (o) {
        return '<button type="button" class="choix choix--petit" data-onglet="' + o[0] + '" aria-pressed="' + (o[0] === onglet) + '"><span class="choix-l">' + o[1] + "</span></button>";
      }).join("") + '<button type="button" class="lien-discret" id="mod-sortir">Me déconnecter</button></div><div id="mod-liste"><p class="mod-vide">Chargement…</p></div>';
    if (onglet === "signalements") return signalements();
    var q = sb.from("contributions").select("*").eq("statut", onglet === "attente" ? "en_attente" : "publie")
      .order("cree_le", { ascending: onglet === "attente" }).limit(50);
    q.then(function (r) {
      if (r.error) return liste('<p class="mod-vide">Accès refusé : ce compte n’est pas modérateur.</p>');
      if (!r.data.length) return liste('<p class="mod-vide">' + (onglet === "attente" ? "Rien en attente. Tout est à jour." : "Aucun avis publié pour l’instant.") + "</p>");
      Promise.all(r.data.map(function (a) {
        var seau = a.statut === "publie" ? "photos" : "photos-attente";
        return Promise.all((a.photos || []).map(function (p) {
          if (seau === "photos") return sb.storage.from("photos").getPublicUrl(p).data.publicUrl;
          return sb.storage.from(seau).createSignedUrl(p, 3600).then(function (x) { return x.data ? x.data.signedUrl : ""; });
        })).then(function (urls) { return carte(a, urls); });
      })).then(function (html) { liste(html.join("")); });
    });
  }
  function liste(h) { $("#mod-liste").innerHTML = h; }
  function carte(a, urls) {
    var champs = [["existe", "Existe"], ["note", "Note"], ["eau", "Eau"], ["vidange", "Vidange"], ["elec", "Électricité"], ["douche", "Douches"], ["chiens", "Chiens"], ["payant", "Prix"], ["prix", "Combien"]]
      .filter(function (k) { return a[k[0]] != null && a[k[0]] !== ""; })
      .map(function (k) { return "<span><strong>" + k[1] + " :</strong> " + esc(a[k[0]]) + "</span>"; }).join("");
    return '<div class="mod-carte" data-id="' + a.id + '"><h3>' + esc(a.lieu_nom || TYPES[a.lieu_type] || "Lieu") + "</h3>" +
      '<p class="mod-meta">' + esc(TYPES[a.lieu_type] || "") + " · " + esc(a.pays || "") + " · par " + esc(a.pseudo || "anonyme") + " · " + new Date(a.cree_le).toLocaleString("fr-FR") +
      ' · <a href="https://www.openstreetmap.org/?mlat=' + a.lat + "&mlon=" + a.lon + '#map=17/' + a.lat + "/" + a.lon + '" target="_blank" rel="noopener">voir sur la carte</a></p>' +
      '<div class="mod-champs">' + champs + "</div>" +
      (a.texte ? "<p>" + esc(a.texte) + "</p>" : "") +
      (urls.length ? '<div class="mod-photos">' + urls.map(function (u) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" alt=""></a>'; }).join("") + "</div>" : "") +
      '<div class="mod-actions">' + (a.statut === "en_attente"
        ? '<button type="button" class="btn btn--principal btn--petit" data-action="publier">Publier</button><button type="button" class="btn btn--secondaire btn--petit" data-action="refuser">Refuser</button>'
        : '<button type="button" class="btn btn--secondaire btn--petit" data-action="retirer">Retirer de Roadbook</button>') +
      '</div><p class="action-message" data-msg></p></div>';
  }
  function signalements() {
    sb.from("signalements").select("id,cree_le,raison,contribution_id,contributions(*)").eq("traite", false).order("cree_le").limit(50).then(function (r) {
      if (r.error) return liste('<p class="mod-vide">Accès refusé : ce compte n’est pas modérateur.</p>');
      if (!r.data.length) return liste('<p class="mod-vide">Aucun signalement.</p>');
      liste(r.data.map(function (s) {
        var a = s.contributions || {};
        return '<div class="mod-carte" data-sig="' + s.id + '" data-id="' + esc(s.contribution_id) + '"><h3>Signalé : ' + esc(a.lieu_nom || "avis") + "</h3>" +
          '<p class="mod-meta">' + new Date(s.cree_le).toLocaleString("fr-FR") + (s.raison ? " · " + esc(s.raison) : "") + "</p>" +
          (a.texte ? "<p>« " + esc(a.texte) + " » — " + esc(a.pseudo || "anonyme") + "</p>" : "") +
          '<div class="mod-actions"><button type="button" class="btn btn--secondaire btn--petit" data-action="retirer">Retirer l’avis</button>' +
          '<button type="button" class="lien-discret" data-action="garder">Garder l’avis</button></div><p class="action-message" data-msg></p></div>';
      }).join(""));
    });
  }

  function publier(id) {
    return sb.from("contributions").select("photos").eq("id", id).single().then(function (r) {
      if (r.error) throw r.error;
      var chemins = r.data.photos || [];
      return Promise.all(chemins.map(function (p) {
        var cible = p.replace(/^attente\//, "publie/");
        return sb.storage.from("photos-attente").download(p).then(function (d) {
          if (d.error) throw d.error;
          return sb.storage.from("photos").upload(cible, d.data, { contentType: "image/jpeg", upsert: true });
        }).then(function (u) { if (u.error) throw u.error; return cible; });
      })).then(function (nouveaux) {
        return sb.from("contributions").update({ statut: "publie", photos: nouveaux }).eq("id", id).then(function (u) {
          if (u.error) throw u.error;
          if (chemins.length) sb.storage.from("photos-attente").remove(chemins);
        });
      });
    });
  }
  function supprimer(id) {
    return sb.from("contributions").select("photos,statut").eq("id", id).single().then(function (r) {
      var a = r.data || {}, ph = a.photos || [];
      if (ph.length) sb.storage.from(a.statut === "publie" ? "photos" : "photos-attente").remove(ph);
      return sb.from("contributions").delete().eq("id", id).then(function (d) { if (d.error) throw d.error; });
    });
  }

  boite.addEventListener("click", function (e) {
    var o = e.target.closest("[data-onglet]");
    if (o) { onglet = o.dataset.onglet; afficher(); return; }
    if (e.target.closest("#mod-sortir")) { sb.auth.signOut().then(function () { connexion(); }); return; }
    var b = e.target.closest("[data-action]");
    if (!b) return;
    var cte = b.closest(".mod-carte"), id = cte.dataset.id, msg = cte.querySelector("[data-msg]"), act = b.dataset.action;
    var p = act === "publier" ? publier(id)
      : act === "refuser" || act === "retirer" ? supprimer(id)
      : sb.from("signalements").update({ traite: true }).eq("id", cte.dataset.sig);
    msg.textContent = "Un instant…";
    Promise.resolve(p).then(function () {
      if (cte.dataset.sig && act !== "garder") sb.from("signalements").update({ traite: true }).eq("id", cte.dataset.sig);
      cte.remove();
    }).catch(function (er) { msg.textContent = "Ça n’a pas marché : " + (er && er.message || er); });
  });

  sb.auth.getSession().then(function (r) { if (r.data && r.data.session) afficher(); else connexion(); });
})();
