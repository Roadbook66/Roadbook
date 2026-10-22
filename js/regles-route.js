/* =========================================================================
   Roadbook — les règles qui piègent les vans et les camping-cars
   · Zones à faibles émissions (ZFE, Umweltzone, LEZ, ZBE, ZTL…)
   · Péages et limites pour les véhicules de plus de 3,5 t
   · Campings fermés hors saison
   Vérifié le 21 octobre 2026 aux sources officielles (voir LISEZ-MOI). Ces règles changent souvent :
   chaque alerte renvoie vers la vérification officielle et reste « à confirmer ».
   ========================================================================= */
(function () {
  var VERIF = "Vérifie avant d’y aller sur urbanaccessregulations.eu (règles officielles, ville par ville).";

  // [nom, lat, lon, rayon km, pays, règle]
  // France : liste officielle des ZFE (mieuxrespirerenville.gouv.fr), complétée par les métropoles.
  // critair = première classe interdite pour les voitures (6 = seulement les non classés).
  function fr(nom, la, lo, r, critair, texte) { return [nom, la, lo, r, "FR", { critair: critair, texte: "ZFE " + texte }]; }
  var ZONES = [
    fr("Paris", 48.857, 2.352, 13, 3, "du Grand Paris (à l’intérieur de l’A86) : Crit’Air 3, 4, 5 et non classés interdits du lundi au vendredi de 8 h à 20 h (libre le soir, le week-end et les jours fériés). Pas d’amende avant fin 2026. Dérogation locale pour les camping-cars (VASP)."),
    fr("Lyon", 45.764, 4.836, 8, 3, "de Lyon (Lyon, Villeurbanne, Vénissieux, Bron, Caluire, et les M6, M7 et le périphérique) : Crit’Air 3, 4, 5 et non classés interdits, tous les jours, 24 h sur 24. Amendes pour les Crit’Air 3 depuis juillet 2026."),
    fr("Grenoble", 45.188, 5.724, 8, 3, "de Grenoble : Crit’Air 3, 4, 5 et non classés interdits du lundi au vendredi de 7 h à 19 h (utilitaires : tout le temps). Dérogation sur demande pour les camping-cars (12 jours par an)."),
    fr("Strasbourg", 48.573, 7.752, 9, 4, "de Strasbourg (Eurométropole) : Crit’Air 4, 5 et non classés interdits, 24 h sur 24 (Crit’Air 3 reportés, au plus tôt 2027). Dérogation sur demande pour les camping-cars."),
    fr("Rouen", 49.443, 1.099, 7, 4, "de Rouen (13 communes) : Crit’Air 4, 5 et non classés interdits, 24 h sur 24. Dérogation permanente pour les camping-cars (VASP)."),
    fr("Montpellier", 43.611, 3.877, 9, 3, "de Montpellier : Crit’Air 3, 4, 5 et non classés interdits (31 communes depuis juillet 2026). Dérogation permanente pour les camping-cars (VASP)."),
    fr("Toulouse", 43.605, 1.444, 8, 4, "de Toulouse (à l’intérieur des rocades) : Crit’Air 4, 5 et non classés interdits, 24 h sur 24. Dérogation temporaire possible pour les camping-cars."),
    fr("Marseille", 43.296, 5.37, 4, 4, "de Marseille (centre-ville élargi) : Crit’Air 4, 5 et non classés interdits, 24 h sur 24."),
    fr("Nice", 43.703, 7.266, 3, 5, "de Nice (hypercentre et Promenade des Anglais) : Crit’Air 5 et non classés interdits."),
    fr("Reims", 49.258, 4.032, 3, 4, "de Reims (hypercentre, entre les boulevards) : Crit’Air 4, 5 et non classés interdits, contrôle automatique. Dérogation temporaire possible pour les camping-cars."),
    fr("Lille", 50.629, 3.057, 8, 6, "de Lille (Métropole européenne) : véhicules non classés interdits, 24 h sur 24."),
    fr("Bordeaux", 44.838, -0.579, 7, 6, "de Bordeaux (dans la rocade) : véhicules non classés interdits."),
    fr("Nantes", 47.218, -1.554, 7, 6, "de Nantes : véhicules non classés interdits du lundi au vendredi, de 7 h à 9 h et de 16 h à 19 h."),
    fr("Rennes", 48.117, -1.678, 6, 6, "de Rennes : véhicules non classés interdits (Crit’Air 5 à partir de 2027)."),
    fr("Angers", 47.473, -0.551, 5, 6, "d’Angers : véhicules non classés interdits."),
    fr("Caen", 49.183, -0.37, 5, 6, "de Caen : véhicules non classés interdits."),
    fr("Le Havre", 49.494, 0.108, 5, 6, "du Havre : véhicules non classés interdits."),
    fr("Pau", 43.295, -0.37, 5, 6, "de Pau : véhicules non classés interdits du lundi au vendredi de 9 h à 18 h."),
    fr("Nîmes", 43.837, 4.36, 5, 6, "de Nîmes : véhicules non classés interdits."),
    fr("Annecy", 45.899, 6.129, 6, 6, "du Grand Annecy : véhicules non classés interdits (Crit’Air 5 à partir de 2028)."),
    fr("Annemasse", 46.194, 6.234, 4, 6, "d’Annemasse : véhicules non classés interdits (Crit’Air 5 à partir de 2028)."),
    ["Nancy", 48.692, 6.184, 5, "FR", { utilitaire: true, texte: "ZFE de Nancy : pour l’instant, seuls les utilitaires Crit’Air 5 et non classés sont interdits (les voitures à partir de 2028). Un fourgon aménagé immatriculé en utilitaire (CTTE) est concerné." }],
    ["Clermont-Ferrand", 45.778, 3.087, 5, "FR", { utilitaire: true, texte: "ZFE de Clermont-Ferrand : seuls les utilitaires et poids lourds non classés sont interdits. Un fourgon aménagé immatriculé en utilitaire (CTTE) est concerné." }],
    ["Saint-Étienne", 45.44, 4.387, 5, "FR", { utilitaire: true, texte: "ZFE de Saint-Étienne : seuls les utilitaires non classés sont interdits, pas les voitures. Les camping-cars (VASP) peuvent demander une dérogation." }],

    // Allemagne : les 35 Umweltzonen actives (Umweltbundesamt, 26 août 2026), toutes avec la vignette verte
    ["Berlin", 52.52, 13.405, 7, "DE", { texte: "Umweltzone de Berlin (à l’intérieur du S-Bahn-Ring)." }],
    ["Munich", 48.137, 11.576, 5, "DE", { texte: "Umweltzone de Munich (à l’intérieur du Mittlerer Ring)." }],
    ["Stuttgart", 48.776, 9.183, 8, "DE", { texte: "Umweltzone de Stuttgart (toute la ville)." }],
    ["Ludwigsburg", 48.897, 9.192, 5, "DE", { texte: "Umweltzone de Ludwigsburg et environs." }],
    ["Pforzheim", 48.892, 8.694, 4, "DE", { texte: "Umweltzone de Pforzheim." }],
    ["Augsbourg", 48.371, 10.898, 4, "DE", { texte: "Umweltzone d’Augsbourg." }],
    ["Ratisbonne", 49.013, 12.102, 3, "DE", { texte: "Umweltzone de Ratisbonne." }],
    ["Brême", 53.079, 8.802, 4, "DE", { texte: "Umweltzone de Brême." }],
    ["Darmstadt", 49.872, 8.651, 4, "DE", { texte: "Umweltzone de Darmstadt." }],
    ["Francfort-sur-le-Main", 50.11, 8.682, 7, "DE", { texte: "Umweltzone de Francfort." }],
    ["Limbourg-sur-la-Lahn", 50.385, 8.064, 3, "DE", { texte: "Umweltzone de Limbourg-sur-la-Lahn." }],
    ["Marbourg", 50.81, 8.77, 4, "DE", { texte: "Umweltzone de Marbourg (zones est et ouest)." }],
    ["Offenbach", 50.096, 8.776, 4, "DE", { texte: "Umweltzone d’Offenbach." }],
    ["Wiesbaden", 50.078, 8.24, 6, "DE", { texte: "Umweltzone de Wiesbaden." }],
    ["Osnabrück", 52.28, 8.047, 4, "DE", { texte: "Umweltzone d’Osnabrück." }],
    ["Aix-la-Chapelle", 50.776, 6.084, 4, "DE", { texte: "Umweltzone d’Aix-la-Chapelle." }],
    ["Bonn", 50.737, 7.098, 5, "DE", { texte: "Umweltzone de Bonn." }],
    ["Dinslaken", 51.562, 6.743, 3, "DE", { texte: "Umweltzone de Dinslaken." }],
    ["Düsseldorf", 51.228, 6.774, 6, "DE", { texte: "Umweltzone de Düsseldorf." }],
    ["Eschweiler", 50.819, 6.272, 3, "DE", { texte: "Umweltzone d’Eschweiler." }],
    ["Hagen", 51.367, 7.463, 4, "DE", { texte: "Umweltzone de Hagen." }],
    ["Krefeld", 51.339, 6.586, 4, "DE", { texte: "Umweltzone de Krefeld." }],
    ["Cologne", 50.938, 6.96, 9, "DE", { texte: "Umweltzone de Cologne (agrandie en 2019)." }],
    ["Langenfeld", 51.108, 6.948, 3, "DE", { texte: "Umweltzone de Langenfeld." }],
    ["Mönchengladbach", 51.185, 6.442, 4, "DE", { texte: "Umweltzone de Mönchengladbach." }],
    ["Münster", 51.961, 7.626, 4, "DE", { texte: "Umweltzone de Münster." }],
    ["Neuss", 51.2, 6.687, 4, "DE", { texte: "Umweltzone de Neuss." }],
    ["Overath", 50.933, 7.284, 3, "DE", { texte: "Umweltzone d’Overath." }],
    ["Remscheid", 51.18, 7.192, 4, "DE", { texte: "Umweltzone de Remscheid." }],
    ["Siegen", 50.874, 8.024, 3, "DE", { texte: "Umweltzone de Siegen." }],
    ["Wuppertal", 51.256, 7.151, 6, "DE", { texte: "Umweltzone de Wuppertal." }],
    ["Leipzig", 51.34, 12.375, 7, "DE", { texte: "Umweltzone de Leipzig." }],
    ["Halle-sur-Saale", 51.483, 11.97, 4, "DE", { texte: "Umweltzone de Halle." }],
    ["Magdebourg", 52.12, 11.628, 4, "DE", { texte: "Umweltzone de Magdebourg." }],
    // La Umweltzone de la Ruhr : treize villes d’un seul tenant
    ["Bochum", 51.482, 7.216, 6, "DE", { texte: "Umweltzone de la Ruhr (Bochum)." }],
    ["Bottrop", 51.524, 6.928, 4, "DE", { texte: "Umweltzone de la Ruhr (Bottrop)." }],
    ["Castrop-Rauxel", 51.557, 7.312, 4, "DE", { texte: "Umweltzone de la Ruhr (Castrop-Rauxel)." }],
    ["Dortmund", 51.514, 7.468, 7, "DE", { texte: "Umweltzone de la Ruhr (Dortmund)." }],
    ["Duisbourg", 51.434, 6.762, 7, "DE", { texte: "Umweltzone de la Ruhr (Duisbourg)." }],
    ["Essen", 51.456, 7.012, 7, "DE", { texte: "Umweltzone de la Ruhr (Essen)." }],
    ["Gelsenkirchen", 51.518, 7.086, 5, "DE", { texte: "Umweltzone de la Ruhr (Gelsenkirchen)." }],
    ["Gladbeck", 51.571, 6.986, 3, "DE", { texte: "Umweltzone de la Ruhr (Gladbeck)." }],
    ["Herne", 51.539, 7.226, 4, "DE", { texte: "Umweltzone de la Ruhr (Herne)." }],
    ["Herten", 51.596, 7.144, 3, "DE", { texte: "Umweltzone de la Ruhr (Herten)." }],
    ["Mülheim an der Ruhr", 51.427, 6.883, 4, "DE", { texte: "Umweltzone de la Ruhr (Mülheim)." }],
    ["Oberhausen", 51.47, 6.852, 5, "DE", { texte: "Umweltzone de la Ruhr (Oberhausen)." }],
    ["Recklinghausen", 51.614, 7.197, 4, "DE", { texte: "Umweltzone de la Ruhr (Recklinghausen)." }],

    // Belgique : une inscription gratuite vaut pour Anvers et Gand, une autre pour Bruxelles (pas besoin pour les plaques néerlandaises)
    ["Bruxelles", 50.85, 4.352, 9, "BE", { texte: "LEZ de Bruxelles (toute la région, sauf le ring R0), 24 h sur 24 : diesel Euro 6 et essence Euro 3 au minimum depuis le 1er janvier 2026. Inscris ta plaque étrangère (gratuit) sur lez.brussels ; sinon, pass de 35 € par jour (24 par an au maximum)." }],
    ["Anvers", 51.219, 4.402, 6, "BE", { texte: "LEZ d’Anvers (centre et rive gauche), 24 h sur 24 : diesel Euro 5 et essence Euro 2 au minimum en 2026. Inscris ta plaque étrangère (gratuit, au plus tard le lendemain) sur slimnaarantwerpen.be : l’inscription vaut aussi pour Gand." }],
    ["Gand", 51.054, 3.717, 3, "BE", { texte: "LEZ de Gand (à l’intérieur du R40), 24 h sur 24 : diesel Euro 5 et essence Euro 2 au minimum en 2026. Inscris ta plaque étrangère (gratuit, au plus tard le lendemain) sur lez.stad.gent : l’inscription vaut aussi pour Anvers." }],

    // Pays-Bas : milieuzones pour les voitures diesel (contrôle par caméra)
    ["Amsterdam", 52.37, 4.895, 6, "NL", { diesel: true, texte: "Milieuzone d’Amsterdam (dans le ring A10) : interdite aux vieux diesels. Contrôle par caméra." }],
    ["Utrecht", 52.091, 5.122, 4, "NL", { diesel: true, texte: "Milieuzone d’Utrecht : interdite aux vieux diesels. Contrôle par caméra." }],
    ["La Haye", 52.078, 4.288, 4, "NL", { diesel: true, texte: "Milieuzone de La Haye : interdite aux vieux diesels. Contrôle par caméra." }],
    ["Arnhem", 51.985, 5.899, 3, "NL", { diesel: true, texte: "Milieuzone d’Arnhem : diesels de classe d’émission 5 au minimum. Contrôle par caméra." }],

    // Danemark : miljøzoner pour les diesels
    ["Copenhague", 55.676, 12.568, 7, "DK", { diesel: true, texte: "Miljøzone de Copenhague et Frederiksberg : diesels Euro 5 au minimum ou avec filtre à particules." }],
    ["Aarhus", 56.157, 10.211, 4, "DK", { diesel: true, texte: "Miljøzone d’Aarhus : diesels Euro 5 au minimum ou avec filtre à particules." }],
    ["Odense", 55.403, 10.402, 4, "DK", { diesel: true, texte: "Miljøzone d’Odense : diesels Euro 5 au minimum ou avec filtre à particules." }],
    ["Aalborg", 57.048, 9.919, 4, "DK", { diesel: true, texte: "Miljøzone d’Aalborg : diesels Euro 5 au minimum ou avec filtre à particules." }],

    // Espagne : ZBE (les véhicules les plus anciens, essence d’avant 2000 et diesel d’avant 2006, sont interdits)
    ["Madrid", 40.417, -3.704, 10, "ES", { texte: "ZBE de Madrid : les véhicules sans étiquette DGT (essence d’avant 2000, diesel d’avant 2006) n’entrent pas. Gare-toi en périphérie." }],
    ["Barcelone", 41.385, 2.173, 9, "ES", { texte: "ZBE de Barcelone (dans les Rondes), du lundi au vendredi de 7 h à 20 h : essence Euro 3 et diesel Euro 4 au minimum. Inscription obligatoire des plaques étrangères sur le site de l’AMB (7 €, traitée en 24 h)." }],
    ["Sabadell", 41.548, 2.108, 3, "ES", { texte: "ZBE de Sabadell : véhicules les plus anciens interdits." }],
    ["Badalona", 41.45, 2.247, 3, "ES", { texte: "ZBE de Badalona : véhicules les plus anciens interdits." }],
    ["Valence", 39.47, -0.376, 5, "ES", { texte: "ZBE de Valence : véhicules les plus anciens interdits." }],
    ["Séville", 37.389, -5.984, 4, "ES", { texte: "ZBE de Séville : véhicules les plus anciens interdits." }],
    ["Bilbao", 43.263, -2.935, 3, "ES", { texte: "ZBE de Bilbao : véhicules les plus anciens interdits, et des limites aussi pour l’étiquette B." }],
    ["Saint-Sébastien", 43.318, -1.981, 3, "ES", { texte: "ZBE de Saint-Sébastien : véhicules les plus anciens interdits." }],
    ["Vitoria-Gasteiz", 42.847, -2.672, 3, "ES", { texte: "ZBE de Vitoria-Gasteiz : véhicules les plus anciens interdits." }],
    ["Saragosse", 41.649, -0.889, 4, "ES", { texte: "ZBE de Saragosse : véhicules les plus anciens interdits." }],
    ["Malaga", 36.721, -4.421, 4, "ES", { texte: "ZBE de Malaga : véhicules les plus anciens interdits." }],
    ["Grenade", 37.177, -3.599, 3, "ES", { texte: "ZBE de Grenade : véhicules les plus anciens interdits." }],
    ["Cordoue", 37.888, -4.779, 3, "ES", { texte: "ZBE de Cordoue : véhicules les plus anciens interdits." }],
    ["Valladolid", 41.652, -4.724, 3, "ES", { texte: "ZBE de Valladolid : véhicules les plus anciens interdits." }],
    ["La Corogne", 43.362, -8.411, 3, "ES", { texte: "ZBE de La Corogne : véhicules les plus anciens interdits." }],
    ["Pontevedra", 42.431, -8.645, 2, "ES", { texte: "ZBE de Pontevedra : véhicules les plus anciens interdits." }],
    ["Salamanque", 40.965, -5.664, 3, "ES", { texte: "ZBE de Salamanque : véhicules les plus anciens interdits." }],
    ["Almería", 36.834, -2.464, 3, "ES", { texte: "ZBE d’Almería : véhicules les plus anciens interdits." }],
    ["Carthagène", 37.606, -0.986, 3, "ES", { texte: "ZBE de Carthagène : véhicules les plus anciens interdits." }],
    ["Torremolinos", 36.624, -4.5, 2, "ES", { texte: "ZBE de Torremolinos : véhicules les plus anciens interdits." }],

    // Italie : les deux grandes zones à part des ZTL
    ["Milan", 45.464, 9.19, 9, "IT", { texte: "Area B de Milan (presque toute la ville), du lundi au vendredi de 7 h 30 à 19 h 30 : essence Euro 0 à 3 et diesel Euro 0 à 5 interdits. Area C (centre) : payante, 7,50 € par jour. Contrôle par caméra." }],
    ["Rome", 41.903, 12.496, 9, "IT", { texte: "Fascia Verde de Rome : essence jusqu’à Euro 2 et diesel jusqu’à Euro 3 interdits (règles d’octobre 2025). Le centre historique est une ZTL." }],

    // Portugal
    ["Lisbonne", 38.722, -9.139, 4, "PT", { texte: "ZER de Lisbonne, en semaine de 7 h à 21 h : Euro 3 au minimum (véhicules de 2000 ou après) dans la Baixa et l’avenue de la Liberté, Euro 2 (1996 ou après) dans la zone plus large. Contrôle par caméra depuis 2026." }],

    // Pologne : strefy czystego transportu
    ["Varsovie", 52.23, 21.012, 7, "PL", { texte: "SCT de Varsovie : pour les véhicules venus d’ailleurs, essence Euro 3 (2000 ou après) et diesel Euro 5 (2008 ou après) au minimum." }],
    ["Cracovie", 50.062, 19.937, 6, "PL", { texte: "SCT de Cracovie (à l’intérieur de la 4e rocade) depuis le 1er janvier 2026 : les véhicules venus d’ailleurs qui ne respectent pas les normes paient 2,50 zł de l’heure." }],

    // Suède : péage urbain (trängselskatt), aussi pour les plaques étrangères
    ["Stockholm", 59.329, 18.069, 6, "SE", { peage: true, texte: "Péage urbain de Stockholm (trängselskatt) en semaine : il s’applique aussi aux plaques étrangères, la facture arrive chez toi." }],
    ["Göteborg", 57.709, 11.975, 5, "SE", { peage: true, texte: "Péage urbain de Göteborg (trängselskatt) en semaine : il s’applique aussi aux plaques étrangères, la facture arrive chez toi." }]
  ];

  // Règles de tout un pays, rappelées le jour où l’on y entre
  var PAYS_ZONES = {
    FR: "En France, la vignette Crit’Air est obligatoire dans les 25 ZFE, aussi pour un véhicule étranger (sinon, il est traité comme « non classé »). Elle se commande uniquement sur certificat-air.gouv.fr (moins de 4 €), compte 2 à 3 semaines. Amende : 68 €.",
    DE: "En Allemagne, 35 villes ont une Umweltzone (dont la Ruhr, Berlin, Munich, Stuttgart, Cologne, Francfort, Leipzig) : vignette verte obligatoire, aussi pour les véhicules étrangers. Amende : 100 €.",
    IT: "En Italie, le centre historique de presque toutes les villes est une ZTL : entrée interdite sans autorisation, contrôle par caméra et amende envoyée chez toi. Gare-toi à l’extérieur.",
    ES: "En Espagne, 56 villes ont une ZBE active. Les véhicules sans étiquette DGT (essence d’avant 2000, diesel d’avant 2006) n’y entrent pas. Un véhicule étranger ne peut pas avoir l’étiquette : il est jugé sur sa norme Euro.",
    BE: "En Belgique, Bruxelles, Anvers et Gand ont une LEZ, 24 h sur 24 : inscris ta plaque étrangère gratuitement (une inscription pour Anvers et Gand, une autre pour Bruxelles). Pas de LEZ en Wallonie.",
    NL: "Aux Pays-Bas, Amsterdam, Utrecht, La Haye et Arnhem interdisent les vieux diesels (contrôle par caméra). Rien à enregistrer.",
    DK: "Au Danemark, Copenhague, Frederiksberg, Aarhus, Odense et Aalborg exigent un diesel Euro 5 ou un filtre à particules. Les diesels anciens (voitures d’avant 2011, utilitaires d’avant septembre 2016) doivent être inscrits gratuitement sur miljoezoner.dk au plus tard le jour même. Amende : 1 500 DKK.",
    PT: "Au Portugal, Lisbonne a une zone à faibles émissions dans le centre, en semaine de 7 h à 21 h.",
    PL: "En Pologne, Varsovie et Cracovie ont une zone à faibles émissions (SCT).",
    SE: "En Suède, Stockholm et Göteborg ont un péage urbain en semaine, aussi pour les plaques étrangères (facture envoyée chez toi).",
    NO: "En Norvège, pas de péage à l’ancienne : des caméras lisent ta plaque et Epass24 t’envoie la facture. Inscris ta plaque gratuitement sur epass24.com pour éviter les frais."
  };

  // Au-delà de 3,5 t (vitesses : route / autoroute, vérifiées dans deux guides de 2026)
  var LOURD = {
    FR: "Plus de 3,5 t : 80 km/h sur route, 100 sur voie express, 110 sur autoroute, et 50 en ville même là où 70 est indiqué. Au péage, classe supérieure. Les panneaux « 3,5 t » (ponts, centres, interdiction de dépasser) te concernent.",
    DE: "Plus de 3,5 t : 80 km/h sur route, 100 sur autoroute. Pas de péage poids lourds si ton camping-car est immatriculé comme tel (M1 SA ou « Wohnmobil ») ; sur un châssis de camion immatriculé en camion, inscris-le chez Toll Collect.",
    AT: "Plus de 3,5 t : 70 km/h sur route, 80 sur autoroute. Pas de vignette mais le péage au kilomètre avec le boîtier GO-Box (ASFINAG), plus un péage spécial sur le Brenner (A13).",
    CH: "Plus de 3,5 t : 80 km/h sur route, 100 sur autoroute. Pas de vignette mais la redevance forfaitaire poids lourds (PSVA), à payer avant d’entrer avec l’application Via, de 1 jour à 1 an.",
    IT: "Plus de 3,5 t : 80 km/h sur route, 100 sur autoroute. Classe de péage selon les essieux et la hauteur.",
    ES: "Plus de 3,5 t : 80 km/h sur route, 90 sur autoroute.",
    HR: "Plus de 3,5 t : 80 km/h sur route, 90 sur autoroute.",
    NL: "Plus de 3,5 t : 80 km/h sur route et sur autoroute. Le péage poids lourds (depuis le 1er juillet 2026) ne s’applique pas aux camping-cars immatriculés M1 ou SA : inscris ta plaque comme exemptée sur le portail vrachtwagenheffing.",
    BE: "Plus de 3,5 t : pas de péage si ton camping-car est immatriculé comme camping-car (M1) ; immatriculé comme camion, le péage Viapass s’applique.",
    PL: "Plus de 3,5 t : 70 km/h sur route, 80 sur autoroute, et le péage électronique e-TOLL (application ou boîtier) à activer avant d’entrer.",
    CZ: "Plus de 3,5 t : 80 km/h sur route et sur autoroute, et le péage électronique au kilomètre (boîtier MYTO, inscription sur myto.gov.cz).",
    SK: "Plus de 3,5 t : immatriculé M1 (camping-car), tu prends la vignette comme une voiture ; immatriculé en utilitaire (N), c’est le péage électronique e-Myto.",
    HU: "Plus de 3,5 t : 70 km/h sur route, 80 sur autoroute. Depuis le 1er janvier 2026, les camping-cars M1 de plus de 3,5 t prennent l’e-vignette de catégorie D2 (plus de HU-GO).",
    SI: "Plus de 3,5 t : pas de vignette mais le boîtier DarsGo (péage au kilomètre), à commander sur darsgo.si avant d’entrer.",
    BG: "Plus de 3,5 t : péage au kilomètre BG Toll (ticket de trajet, boîtier ou GPS) au lieu de la vignette.",
    DK: "Plus de 3,5 t : 80 km/h sur route et sur autoroute.",
    NO: "Plus de 3,5 t : 80 km/h sur route et sur autoroute. Les péages coûtent 2 à 3 fois plus cher, sauf pour un camping-car M1 équipé d’un badge AutoPASS."
  };
  var LOURD_GENERAL = "Plus de 3,5 t : les vitesses sont souvent plus basses qu’en voiture, et les panneaux « camion » ou « 3,5 t » te concernent (ponts, centres-villes, interdictions de dépasser).";

  function km(a, b, c, d) {
    var r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r;
    return 6371 * Math.sqrt(x * x + y * y);
  }
  function moisDu(v, j) {
    var a = v.reponses || {};
    if (!a.date) return null;
    var d = new Date(a.date + "T12:00:00"); d.setDate(d.getDate() + (j.n - 1));
    return d.getMonth() + 1;
  }

  RB.reglesRoute = {};
  // Les alertes d’une journée : [{titre, texte, statut}]
  RB.reglesRoute.duJour = function (v, j) {
    var a = v.reponses || {}, l = [];
    if (j.type === "mer" || typeof j.lat !== "number") return l;
    var prec = v.jours[j.n - 2];
    var entre = j.pays && (!prec || prec.pays !== j.pays) && j.type !== "pause";

    // Zones à faibles émissions autour de l’arrivée (pas le jour du retour à la maison)
    if (j.type !== "retour") ZONES.forEach(function (z) {
      if (km(j.lat, j.lon, z[1], z[2]) > z[3]) return;
      var r = z[5];
      // Ta vignette Crit’Air suffit (1, 2 ou 3 : « 4, 5 ou sans » ne permet pas de savoir)
      if (r.critair && /^[123]$/.test(a.critair || "") && +a.critair < r.critair) return;
      // ZFE qui ne visent que les utilitaires : pas pour un camping-car
      if (r.utilitaire && a.vehicule === "campingcar") return;
      var texte = r.texte + (z[4] === "DE" ? " Vignette verte obligatoire, aussi pour les véhicules étrangers." : "");
      l.push({ titre: (r.peage ? "Péage urbain à " : "Zone à faibles émissions à ") + z[0], texte: texte + " " + VERIF, statut: "c" });
    });
    if (entre && PAYS_ZONES[j.pays] && j.pays !== "FR") l.push({ titre: j.pays === "SE" || j.pays === "NO" ? "Péages urbains" : "Zones à faibles émissions", texte: PAYS_ZONES[j.pays], statut: "c" });
    if (entre && j.pays === "FR" && (!prec || prec.pays !== "FR") && v.maison && v.maison.pays !== "FR") l.push({ titre: "Vignette Crit’Air", texte: PAYS_ZONES.FR, statut: "c" });

    // Plus de 3,5 t : le rappel du pays, le jour où l’on y entre
    if (a.poids === "lourd" && entre) l.push({ titre: "Ton véhicule de plus de 3,5 t", texte: LOURD[j.pays] || LOURD_GENERAL, statut: "c" });

    // Hors saison : beaucoup de campings ferment
    // (le premier soir concerné, puis les soirs où il n’y a pas d’aire tout près)
    var m = moisDu(v, j);
    var dejaDit = v.jours.slice(0, j.n - 1).some(function (k) { var mk = moisDu(v, k); return k.dormir && mk && (mk >= 11 || mk <= 3); });
    var sansAire = !(j.lieux || []).some(function (x) { return x.type === "A" || x.type === "P"; });
    if (m && (m >= 11 || m <= 3) && j.dormir && (!dejaDit || (j.lieux && sansAire))) {
      l.push({ titre: "Hors saison", texte: "De novembre à mars, beaucoup de campings sont fermés. Appelle avant de venir, ou choisis une aire de camping-cars : la plupart restent ouvertes toute l’année.", statut: "c" });
    }
    return l;
  };
  // Au départ : ce qu’il faut préparer pour tout le voyage
  RB.reglesRoute.avantDePartir = function (v) {
    var a = v.reponses || {}, pays = {}, villes = {}, l = [];
    v.jours.forEach(function (j) {
      if (j.pays) pays[j.pays] = 1;
      if (typeof j.lat === "number" && j.type !== "retour") ZONES.forEach(function (z) { if (km(j.lat, j.lon, z[1], z[2]) <= z[3]) { villes[z[0]] = 1; villes[z[4]] = 1; } });
    });
    if (v.maison && typeof v.maison.lat === "number") ZONES.forEach(function (z) {
      if (km(v.maison.lat, v.maison.lon, z[1], z[2]) <= z[3]) l.push("Tu pars de la zone à faibles émissions de " + z[0] + " : vérifie que ton véhicule y est autorisé.");
    });
    if (pays.FR) l.push("La vignette Crit’Air sur le pare-brise (uniquement sur certificat-air.gouv.fr, 2 à 3 semaines de délai).");
    if (villes.DE) l.push("La vignette verte allemande (Umweltplakette), pour les Umweltzonen de ton voyage.");
    if (villes.Bruxelles) l.push("L’inscription gratuite de ta plaque sur lez.brussels.");
    if (villes.Anvers || villes.Gand) l.push("L’inscription gratuite de ta plaque pour Anvers et Gand (une seule pour les deux).");
    if (villes.Barcelone) l.push("L’inscription de ta plaque à la ZBE de Barcelone sur le site de l’AMB (7 €).");
    if (villes.DK) l.push("Si ton diesel est ancien, son inscription gratuite sur miljoezoner.dk.");
    if (pays.NO) l.push("L’inscription gratuite de ta plaque sur epass24.com pour les péages norvégiens.");
    if (a.poids === "lourd") {
      ["AT", "CH", "SI", "CZ", "PL", "HU", "BG", "NL"].forEach(function (c) {
        if (pays[c]) l.push(RB.pays[c] + " : " + LOURD[c].replace(/^Plus de 3,5 t : /, ""));
      });
    }
    return l;
  };
})();
