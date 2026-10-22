/* =========================================================================
   Roadbook — ce que les voyageurs aiment
   Chaque envie a des mots-clés : l’app les cherche dans les étapes et les
   repères de chaque région pour choisir les régions et les étapes qui
   correspondent, et pour signaler « Pour toi » sur l’écran du jour.
   (Mots-clés en minuscules, sans accents.)
   ========================================================================= */
window.RB = window.RB || {};

RB.familles = [
  { id: "paysages", nom: "Les paysages" },
  { id: "activites", nom: "Les activités" },
  { id: "culture", nom: "La culture" },
  { id: "saveurs", nom: "Les saveurs" },
  { id: "ambiance", nom: "L’ambiance" }
];

RB.envies = [
  /* Paysages */
  { id: "montagne", famille: "paysages", nom: "Montagne",
    mots: ["montagne", "col ", "cols", "sommet", "glacier", "cirque", "alpage", "pic ", "crete", "tatras", "dolomit", "volcan", "etna", "massif", "jungfrau", "cervin", "zugspitze", "aiguille du midi"] },
  { id: "mer", famille: "paysages", nom: "Mer et plages",
    mots: ["plage", "mer ", "mer,", "mer.", "crique", "cote ", "cote,", "cotes", "falaise", "ocean", "baie", "presqu", "atlantique", "riviera", "lagune", "littoral"] },
  { id: "lacs", famille: "paysages", nom: "Lacs et rivières",
    mots: ["lac ", "lac,", "lac.", "lacs", "riviere", "cascade", "gorges", "fleuve", "fjord", "canaux", "canal", "rapides", "source ", "sources"] },
  { id: "forets", famille: "paysages", nom: "Forêts",
    mots: ["foret", "hetraie", "pins ", "pins,", "pins.", "pinede", "bois ", "bois.", "bois,", "sapins"] },
  { id: "sauvage", famille: "paysages", nom: "Grands espaces sauvages",
    mots: ["sauvage", "lande", "desert", "dune", "parc national", "parc de", "reserve", "bout du monde", "bout de", "plateau", "tourbieres", "a perte de vue", "glaciaire"] },

  /* Activités */
  { id: "rando", famille: "activites", nom: "Randonnée",
    mots: ["randonnee", "sentier", "a pied", "de marche", "balade", "boucle"] },
  { id: "velo", famille: "activites", nom: "Vélo",
    mots: ["velo", "piste cyclable", "voie verte", "a velo"] },
  { id: "baignade", famille: "activites", nom: "Baignade",
    mots: ["baignade", "plage", "eau turquoise", "sources chaudes", "bains", "vasques", "bassin"] },
  { id: "bateau", famille: "activites", nom: "Kayak, canoë, bateau",
    mots: ["kayak", "canoe", "bateau", "barque", "radeau", "pletna", "pedalo", "en ferry", "traversee"] },
  { id: "animaux", famille: "activites", nom: "Observer les animaux",
    mots: ["oiseaux", "chevaux", "poneys", "flamants", "aigles", "baleines", "brebis", "troupeaux", "faune"] },

  /* Culture */
  { id: "villes", famille: "culture", nom: "Belles villes",
    mots: ["vieille ville", "ville close", "ville haute", "quartier", "intra-muros", "capitale", "centre historique", "la ville"] },
  { id: "villages", famille: "culture", nom: "Villages de caractère",
    mots: ["village", "plus beaux villages", "perche", "colombages", "maisons colorees", "petit port"] },
  { id: "chateaux", famille: "culture", nom: "Châteaux et monuments",
    mots: ["chateau", "forteresse", "abbaye", "cathedrale", "palais", "citadelle", "remparts", "monastere", "eglise", "fort "] },
  { id: "histoire", famille: "culture", nom: "Sites historiques",
    mots: ["antique", "romain", "prehistori", "medieval", "debarquement", "temple", "ruines", "etrusque", "cite", "1066", "byzantin", "bataille"] },
  { id: "art", famille: "culture", nom: "Musées et art",
    mots: ["musee", "peintres", "art ", "art nouveau", "artiste", "gaudi", "retable", "faience", "murales", "van gogh", "mozart", "baroque"] },

  /* Saveurs */
  { id: "vin", famille: "saveurs", nom: "Vins et vignobles",
    mots: ["vin ", "vin,", "vin.", "vins", "vino", "vigneron", "vignes", "vignoble", "degustation", "txakoli", "riesling", "porto ", "porto.", "chianti", "vernaccia", "vranac", "quintas", "cave"] },
  { id: "terroir", famille: "saveurs", nom: "Produits du terroir et marchés",
    mots: ["marche du", "marche central", "le marche", "marches ", "fromage", "cidre", "calvados", "specialite", "chocolat", "patisserie", "piment", "pecorino", "truffe", "jambon", "whisky", "distillerie", "liqueur", "berlingots", "sucres d", "producteurs", "halles"] },
  { id: "tables", famille: "saveurs", nom: "Bonnes tables",
    mots: ["gourmand", "pintxos", "poisson", "langoustine", "repas", "crêperies", "creperies", "fish", "table", "ferme-auberge", "spécialité locale", "specialite locale"] },

  /* Ambiance */
  { id: "detente", famille: "ambiance", nom: "Détente et bien-être",
    mots: ["thermes", "thermal", "bains", "sources chaudes", "sauna", "souffler", "tranquille", "calme", "pas de route"] },
  { id: "photo", famille: "ambiance", nom: "Photo et couchers de soleil",
    mots: ["vue", "coucher du soleil", "belvedere", "panorama", "carte postale", "lever du soleil", "photographiee", "vertigineus"] },
  { id: "calme", famille: "ambiance", nom: "Calme, loin de la foule",
    mots: ["sauvage", "tranquille", "calme", "plus calme", "loin", "petit port", "isole"],
    eviter: ["frequente", "foule", "dense", "animee", "difficile"] },
  { id: "fete", famille: "ambiance", nom: "Ambiance et soirées",
    mots: ["bar ", "bars", "pubs", "musique", "animee", "animees", "soir", "etudiante", "musiciens"] }
];

/* Les anciennes réponses (nature, visites, gastronomie, détente) restent comprises */
RB.enviesAnciennes = {
  nature: ["montagne", "mer", "lacs", "forets", "sauvage"],
  visites: ["villes", "villages", "chateaux", "histoire", "art"],
  gastronomie: ["vin", "terroir", "tables"],
  detente: ["detente", "baignade", "calme"]
};
