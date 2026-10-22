/* =========================================================================
   Roadbook — villes de départ et villes-étapes (Europe continentale)
   [nom, pays, latitude, longitude, grande ville (1) ou non (0)]
   Coordonnées approximatives : elles servent à estimer les distances.
   ========================================================================= */
window.RB = window.RB || {};

RB.pays = {
  FR: "France", BE: "Belgique", LU: "Luxembourg", NL: "Pays-Bas", CH: "Suisse", DE: "Allemagne",
  AT: "Autriche", IT: "Italie", ES: "Espagne", PT: "Portugal", DK: "Danemark", CZ: "Tchéquie",
  PL: "Pologne", SK: "Slovaquie", HU: "Hongrie", SI: "Slovénie", HR: "Croatie", MC: "Monaco",
  NO: "Norvège", SE: "Suède", FI: "Finlande", EE: "Estonie",
  LV: "Lettonie", LT: "Lituanie", RO: "Roumanie", BG: "Bulgarie", RS: "Serbie",
  BA: "Bosnie-Herzégovine", ME: "Monténégro", AL: "Albanie", MK: "Macédoine du Nord", GR: "Grèce",
  TR: "Turquie", GE: "Géorgie", AM: "Arménie"
};

/* Règles à connaître par pays (affichées « à confirmer sur place ») */
RB.regles = {
  CH: "Vignette autoroutière obligatoire en Suisse (redevance spéciale au-delà de 3,5 t).",
  AT: "Vignette autoroutière obligatoire en Autriche (péage au kilomètre au-delà de 3,5 t).",
  SI: "Vignette autoroutière obligatoire en Slovénie (règles selon le poids).",
  CZ: "Vignette autoroutière obligatoire en Tchéquie (règles selon le poids).",
  SK: "Vignette autoroutière obligatoire en Slovaquie (règles selon le poids).",
  HU: "Vignette autoroutière obligatoire en Hongrie (règles selon le poids).",
  RO: "Vignette routière (rovinieta) obligatoire en Roumanie.",
  BG: "Vignette routière obligatoire en Bulgarie.",
  NO: "Péages automatiques en Norvège : enregistre ton véhicule à l’avance pour recevoir la facture.",
  AL: "Albanie : vérifie que ton assurance couvre le pays (carte verte).",
  ME: "Monténégro : vérifie que ton assurance couvre le pays (carte verte).",
  BA: "Bosnie-Herzégovine : vérifie que ton assurance couvre le pays (carte verte).",
  RS: "Serbie : vérifie que ton assurance couvre le pays (carte verte).",
  MK: "Macédoine du Nord : vérifie que ton assurance couvre le pays (carte verte).",
  TR: "Turquie : passeport valable, et vérifie que ta carte verte (assurance) couvre bien la Turquie. Péages d’autoroute électroniques (badge HGS à acheter sur place).",
  GE: "Géorgie : assurance au tiers locale obligatoire pour les véhicules étrangers, à souscrire à la frontière (la carte verte ne couvre pas la Géorgie).",
  AM: "Arménie : assurance locale et droits d’entrée du véhicule à régler à la frontière. On y entre par la Géorgie : les frontières avec la Turquie et l’Azerbaïdjan sont fermées."
};

/* Zones « terrestres » : on ne passe d’une zone à l’autre que par un pont, un tunnel ou un ferry */
RB.zonePays = { NO: "SC", SE: "SC", FI: "FI", EE: "BL", LV: "BL", LT: "BL", IT: "IT", TR: "TR", GE: "GE", AM: "AM" };
RB.zoneVille = {
  "Belfast": "IE", "Derry": "IE",
  "Copenhague": "DKZ", "Roskilde": "DKZ", "Rødby": "DKZ", "Gedser": "DKZ",
  "Ajaccio": "CO", "Bastia": "CO", "Calvi": "CO", "Porto-Vecchio": "CO", "Bonifacio": "CO", "Corte": "CO",
  "Olbia": "SA", "Cagliari": "SA", "Sassari": "SA", "Alghero": "SA", "Nuoro": "SA", "Santa Teresa Gallura": "SA", "Oristano": "SA",
  "Messine": "SI", "Palerme": "SI", "Catane": "SI", "Syracuse": "SI", "Agrigente": "SI", "Trapani": "SI", "Cefalù": "SI", "Raguse": "SI"
};

RB.villes = [
  /* France */
  ["Paris","FR",48.857,2.352,1],["Marseille","FR",43.296,5.37,1],["Lyon","FR",45.764,4.836,1],["Toulouse","FR",43.605,1.444,1],
  ["Nice","FR",43.71,7.262,1],["Nantes","FR",47.218,-1.554,1],["Montpellier","FR",43.611,3.877,1],["Strasbourg","FR",48.573,7.752,1],
  ["Bordeaux","FR",44.838,-0.579,1],["Lille","FR",50.629,3.057,1],["Rennes","FR",48.117,-1.678,1],["Reims","FR",49.258,4.032,1],
  ["Toulon","FR",43.124,5.928,1],["Saint-Étienne","FR",45.439,4.387,1],["Le Havre","FR",49.494,0.108,1],["Grenoble","FR",45.188,5.724,1],
  ["Dijon","FR",47.322,5.041,1],["Angers","FR",47.478,-0.563,1],["Nîmes","FR",43.837,4.36,1],["Clermont-Ferrand","FR",45.778,3.087,1],
  ["Aix-en-Provence","FR",43.529,5.447,1],["Le Mans","FR",48.006,0.199,1],["Brest","FR",48.39,-4.486,1],["Tours","FR",47.394,0.685,1],
  ["Amiens","FR",49.894,2.296,1],["Limoges","FR",45.833,1.261,1],["Annecy","FR",45.899,6.129,0],["Perpignan","FR",42.699,2.895,0],
  ["Metz","FR",49.119,6.176,0],["Besançon","FR",47.238,6.024,0],["Orléans","FR",47.903,1.909,0],["Rouen","FR",49.443,1.099,0],
  ["Mulhouse","FR",47.75,7.336,0],["Caen","FR",49.183,-0.37,0],["Nancy","FR",48.692,6.184,0],["Avignon","FR",43.949,4.806,0],
  ["Poitiers","FR",46.58,0.34,0],["La Rochelle","FR",46.16,-1.151,0],["Pau","FR",43.296,-0.37,0],["Bayonne","FR",43.493,-1.475,0],
  ["Biarritz","FR",43.483,-1.559,0],["Calais","FR",50.951,1.858,0],["Dunkerque","FR",51.034,2.377,0],["Boulogne-sur-Mer","FR",50.726,1.614,0],
  ["Arras","FR",50.291,2.777,0],["Valenciennes","FR",50.358,3.524,0],["Saint-Quentin","FR",49.847,3.287,0],["Beauvais","FR",49.43,2.081,0],
  ["Compiègne","FR",49.418,2.826,0],["Troyes","FR",48.297,4.074,0],["Chartres","FR",48.446,1.489,0],["Évreux","FR",49.024,1.151,0],
  ["Cherbourg","FR",49.639,-1.616,0],["Saint-Malo","FR",48.649,-2.026,0],["Saint-Brieuc","FR",48.514,-2.765,0],["Quimper","FR",47.996,-4.102,0],
  ["Lorient","FR",47.748,-3.37,0],["Vannes","FR",47.658,-2.76,0],["Laval","FR",48.073,-0.77,0],["Alençon","FR",48.432,0.091,0],
  ["Saint-Nazaire","FR",47.273,-2.214,0],["La Roche-sur-Yon","FR",46.67,-1.426,0],["Niort","FR",46.323,-0.459,0],["Angoulême","FR",45.648,0.156,0],
  ["Périgueux","FR",45.184,0.721,0],["Brive-la-Gaillarde","FR",45.159,1.533,0],["Agen","FR",44.203,0.616,0],["Mont-de-Marsan","FR",43.89,-0.5,0],
  ["Arcachon","FR",44.658,-1.168,0],["Cahors","FR",44.448,1.441,0],["Montauban","FR",44.018,1.355,0],["Albi","FR",43.929,2.148,0],
  ["Rodez","FR",44.35,2.575,0],["Tarbes","FR",43.233,0.078,0],["Lourdes","FR",43.095,-0.046,0],["Foix","FR",42.965,1.607,0],
  ["Carcassonne","FR",43.213,2.351,0],["Narbonne","FR",43.184,3.004,0],["Béziers","FR",43.344,3.216,0],["Sète","FR",43.403,3.693,0],
  ["Alès","FR",44.125,4.081,0],["Arles","FR",43.677,4.631,0],["Orange","FR",44.138,4.807,0],["Valence","FR",44.933,4.892,0],
  ["Montélimar","FR",44.558,4.751,0],["Gap","FR",44.559,6.079,0],["Digne-les-Bains","FR",44.092,6.236,0],["Cannes","FR",43.552,7.017,0],
  ["Antibes","FR",43.581,7.125,0],["Fréjus","FR",43.433,6.737,0],["Hyères","FR",43.12,6.13,0],["Menton","FR",43.776,7.504,0],
  ["Salon-de-Provence","FR",43.64,5.097,0],["Chambéry","FR",45.564,5.917,0],["Annemasse","FR",46.193,6.234,0],["Bourg-en-Bresse","FR",46.205,5.226,0],
  ["Mâcon","FR",46.307,4.828,0],["Chalon-sur-Saône","FR",46.781,4.854,0],["Beaune","FR",47.025,4.84,0],["Auxerre","FR",47.799,3.567,0],
  ["Nevers","FR",46.99,3.159,0],["Bourges","FR",47.081,2.399,0],["Châteauroux","FR",46.811,1.691,0],["Blois","FR",47.586,1.335,0],
  ["Vierzon","FR",47.222,2.069,0],["Moulins","FR",46.566,3.333,0],["Vichy","FR",46.128,3.426,0],["Le Puy-en-Velay","FR",45.043,3.885,0],
  ["Aurillac","FR",44.926,2.444,0],["Tulle","FR",45.267,1.771,0],["Guéret","FR",46.171,1.871,0],["Montluçon","FR",46.34,2.603,0],
  ["Épinal","FR",48.173,6.45,0],["Colmar","FR",48.079,7.358,0],["Belfort","FR",47.64,6.863,0],["Vesoul","FR",47.622,6.155,0],
  ["Chaumont","FR",48.111,5.139,0],["Charleville-Mézières","FR",49.773,4.721,0],["Châlons-en-Champagne","FR",48.957,4.363,0],["Bar-le-Duc","FR",48.772,5.16,0],
  ["Verdun","FR",49.16,5.384,0],["Thionville","FR",49.358,6.168,0],["Saumur","FR",47.26,-0.077,0],["Cholet","FR",47.06,-0.879,0],
  ["Lons-le-Saunier","FR",46.675,5.555,0],["Pontarlier","FR",46.904,6.355,0],["Versailles","FR",48.804,2.13,0],["Meaux","FR",48.96,2.879,0],
  ["Melun","FR",48.54,2.66,0],["Fontainebleau","FR",48.405,2.702,0],["Cergy","FR",49.036,2.063,0],["Évry","FR",48.629,2.441,0],
  ["Deauville","FR",49.357,0.067,0],["Lisieux","FR",49.146,0.226,0],["Royan","FR",45.624,-1.029,0],["Les Sables-d’Olonne","FR",46.497,-1.783,0],
  ["Bergerac","FR",44.853,0.483,0],["Dax","FR",43.71,-1.053,0],["Millau","FR",44.098,3.078,0],["Mende","FR",44.518,3.501,0],
  ["Privas","FR",44.735,4.599,0],["Aubenas","FR",44.62,4.39,0],["Vienne","FR",45.525,4.874,0],["Villefranche-sur-Saône","FR",45.99,4.718,0],
  ["Roanne","FR",46.036,4.068,0],["Sens","FR",48.197,3.283,0],["Laon","FR",49.564,3.62,0],["Soissons","FR",49.381,3.323,0],
  ["Saint-Lô","FR",49.116,-1.09,0],["Dieppe","FR",49.922,1.078,0],["Abbeville","FR",50.106,1.835,0],["Châtellerault","FR",46.817,0.546,0],
  ["Haguenau","FR",48.816,7.791,0],["Saint-Dié-des-Vosges","FR",48.285,6.95,0],["Monaco","MC",43.738,7.425,0],
  /* Belgique, Luxembourg, Pays-Bas */
  ["Bruxelles","BE",50.85,4.352,1],["Anvers","BE",51.219,4.402,1],["Gand","BE",51.054,3.717,1],["Charleroi","BE",50.411,4.444,1],
  ["Liège","BE",50.633,5.567,1],["Bruges","BE",51.209,3.225,0],["Namur","BE",50.467,4.872,0],["Louvain","BE",50.879,4.701,0],
  ["Mons","BE",50.454,3.952,0],["Tournai","BE",50.606,3.389,0],["Arlon","BE",49.683,5.817,0],["Ostende","BE",51.225,2.919,0],
  ["Malines","BE",51.026,4.478,0],["Hasselt","BE",50.931,5.338,0],["Luxembourg","LU",49.611,6.13,1],
  ["Amsterdam","NL",52.37,4.895,1],["Rotterdam","NL",51.924,4.478,1],["La Haye","NL",52.07,4.3,1],["Utrecht","NL",52.091,5.122,1],
  ["Eindhoven","NL",51.441,5.47,1],["Maastricht","NL",50.851,5.691,0],["Groningue","NL",53.219,6.567,0],["Arnhem","NL",51.985,5.899,0],
  ["Nimègue","NL",51.842,5.853,0],["Breda","NL",51.589,4.776,0],["Zwolle","NL",52.516,6.083,0],["Leyde","NL",52.16,4.497,0],
  /* Suisse */
  ["Zurich","CH",47.377,8.541,1],["Genève","CH",46.204,6.143,1],["Bâle","CH",47.56,7.589,1],["Lausanne","CH",46.52,6.633,1],
  ["Berne","CH",46.948,7.447,1],["Lucerne","CH",47.05,8.309,0],["Lugano","CH",46.004,8.951,0],["Saint-Gall","CH",47.424,9.377,0],
  ["Neuchâtel","CH",46.99,6.931,0],["Fribourg","CH",46.806,7.162,0],["Sion","CH",46.233,7.36,0],["Coire","CH",46.85,9.532,0],
  ["Montreux","CH",46.431,6.911,0],["Interlaken","CH",46.686,7.863,0],
  /* Allemagne */
  ["Berlin","DE",52.52,13.405,1],["Hambourg","DE",53.551,9.994,1],["Munich","DE",48.135,11.582,1],["Cologne","DE",50.938,6.96,1],
  ["Francfort","DE",50.11,8.682,1],["Stuttgart","DE",48.776,9.183,1],["Düsseldorf","DE",51.228,6.774,1],["Dortmund","DE",51.514,7.468,1],
  ["Essen","DE",51.456,7.012,1],["Leipzig","DE",51.34,12.375,1],["Brême","DE",53.079,8.802,1],["Dresde","DE",51.051,13.738,1],
  ["Hanovre","DE",52.376,9.732,1],["Nuremberg","DE",49.452,11.077,1],["Bonn","DE",50.737,7.098,0],["Münster","DE",51.961,7.626,0],
  ["Karlsruhe","DE",49.007,8.404,0],["Mannheim","DE",49.488,8.466,0],["Augsbourg","DE",48.371,10.898,0],["Wiesbaden","DE",50.078,8.24,0],
  ["Mayence","DE",49.993,8.247,0],["Fribourg-en-Brisgau","DE",47.999,7.842,0],["Heidelberg","DE",49.398,8.672,0],["Ratisbonne","DE",49.013,12.102,0],
  ["Wurtzbourg","DE",49.792,9.954,0],["Ulm","DE",48.401,9.987,0],["Sarrebruck","DE",49.24,6.997,0],["Trèves","DE",49.75,6.637,0],
  ["Coblence","DE",50.356,7.594,0],["Kassel","DE",51.312,9.479,0],["Erfurt","DE",50.978,11.029,0],["Kiel","DE",54.323,10.123,0],
  ["Lübeck","DE",53.866,10.687,0],["Rostock","DE",54.092,12.099,0],["Magdebourg","DE",52.12,11.628,0],["Aix-la-Chapelle","DE",50.776,6.084,0],
  ["Constance","DE",47.66,9.175,0],["Passau","DE",48.574,13.461,0],["Bamberg","DE",49.898,10.902,0],["Göttingen","DE",51.541,9.916,0],
  ["Osnabrück","DE",52.28,8.047,0],
  /* Autriche */
  ["Vienne (Autriche)","AT",48.208,16.373,1],["Graz","AT",47.071,15.44,0],["Linz","AT",48.306,14.286,0],["Salzbourg","AT",47.809,13.055,0],
  ["Innsbruck","AT",47.269,11.404,0],["Klagenfurt","AT",46.624,14.308,0],["Bregenz","AT",47.503,9.747,0],["Villach","AT",46.611,13.855,0],
  /* Italie */
  ["Rome","IT",41.903,12.496,1],["Milan","IT",45.464,9.19,1],["Naples","IT",40.852,14.268,1],["Turin","IT",45.07,7.686,1],
  ["Gênes","IT",44.405,8.946,1],["Bologne","IT",44.494,11.343,1],["Florence","IT",43.769,11.256,1],["Venise","IT",45.44,12.316,1],
  ["Vérone","IT",45.438,10.992,0],["Padoue","IT",45.406,11.877,0],["Trieste","IT",45.65,13.777,0],["Brescia","IT",45.541,10.211,0],
  ["Bergame","IT",45.698,9.677,0],["Parme","IT",44.801,10.328,0],["Modène","IT",44.647,10.925,0],["Pise","IT",43.716,10.396,0],
  ["Livourne","IT",43.548,10.311,0],["Pérouse","IT",43.111,12.39,0],["Ancône","IT",43.617,13.519,0],["Pescara","IT",42.464,14.214,0],
  ["Bari","IT",41.117,16.872,0],["Lecce","IT",40.352,18.172,0],["Salerne","IT",40.682,14.768,0],["Trente","IT",46.067,11.121,0],
  ["Bolzano","IT",46.498,11.354,0],["Côme","IT",45.808,9.085,0],["Aoste","IT",45.737,7.32,0],["Sanremo","IT",43.815,7.776,0],
  ["La Spezia","IT",44.102,9.824,0],["Rimini","IT",44.068,12.568,0],["Udine","IT",46.064,13.235,0],["Ravenne","IT",44.418,12.204,0],
  ["Sienne","IT",43.318,11.331,0],["Arezzo","IT",43.463,11.88,0],["Novare","IT",45.446,8.622,0],["Alessandria","IT",44.913,8.615,0],
  ["Coni","IT",44.384,7.543,0],["Plaisance","IT",45.052,9.693,0],
  /* Espagne */
  ["Madrid","ES",40.417,-3.704,1],["Barcelone","ES",41.385,2.173,1],["Valence (Espagne)","ES",39.47,-0.376,1],["Séville","ES",37.389,-5.984,1],
  ["Saragosse","ES",41.649,-0.889,1],["Malaga","ES",36.721,-4.421,1],["Bilbao","ES",43.263,-2.935,1],["Alicante","ES",38.345,-0.481,0],
  ["Murcie","ES",37.992,-1.131,0],["Valladolid","ES",41.652,-4.725,0],["Vigo","ES",42.24,-8.721,0],["Gijón","ES",43.532,-5.661,0],
  ["La Corogne","ES",43.362,-8.411,0],["Grenade","ES",37.177,-3.599,0],["Vitoria-Gasteiz","ES",42.846,-2.672,0],["Oviedo","ES",43.361,-5.849,0],
  ["Pampelune","ES",42.812,-1.646,0],["Saint-Sébastien","ES",43.318,-1.981,0],["Santander","ES",43.462,-3.81,0],["Burgos","ES",42.344,-3.697,0],
  ["Salamanque","ES",40.97,-5.663,0],["León","ES",42.599,-5.567,0],["Cordoue","ES",37.884,-4.779,0],["Cadix","ES",36.527,-6.288,0],
  ["Almería","ES",36.834,-2.464,0],["Tarragone","ES",41.119,1.245,0],["Gérone","ES",41.979,2.821,0],["Lérida","ES",41.617,0.62,0],
  ["Logroño","ES",42.463,-2.445,0],["Saint-Jacques-de-Compostelle","ES",42.878,-8.545,0],["Tolède","ES",39.863,-4.027,0],["Cáceres","ES",39.475,-6.372,0],
  ["Badajoz","ES",38.879,-6.97,0],["Huesca","ES",42.136,-0.409,0],["Castellón","ES",39.986,-0.051,0],["Jaén","ES",37.779,-3.785,0],
  ["Albacete","ES",38.994,-1.856,0],["Ségovie","ES",40.948,-4.118,0],["Cuenca","ES",40.07,-2.137,0],["Teruel","ES",40.344,-1.106,0],
  ["Soria","ES",41.764,-2.465,0],
  /* Portugal */
  ["Lisbonne","PT",38.722,-9.139,1],["Porto","PT",41.15,-8.611,1],["Braga","PT",41.545,-8.427,0],["Coimbra","PT",40.203,-8.41,0],
  ["Faro","PT",37.019,-7.93,0],["Aveiro","PT",40.641,-8.654,0],["Évora","PT",38.571,-7.909,0],["Viseu","PT",40.657,-7.914,0],
  ["Leiria","PT",39.744,-8.807,0],["Guimarães","PT",41.442,-8.296,0],["Setúbal","PT",38.524,-8.893,0],["Bragance","PT",41.806,-6.757,0],
  /* Danemark, Europe centrale */
  ["Copenhague","DK",55.676,12.568,1],["Aarhus","DK",56.163,10.204,0],["Odense","DK",55.403,10.402,0],["Aalborg","DK",57.048,9.919,0],
  ["Esbjerg","DK",55.476,8.459,0],["Prague","CZ",50.076,14.438,1],["Brno","CZ",49.195,16.608,0],["Plzeň","CZ",49.738,13.373,0],
  ["Ostrava","CZ",49.82,18.262,0],["Český Krumlov","CZ",48.811,14.315,0],["Varsovie","PL",52.23,21.012,1],["Cracovie","PL",50.065,19.945,1],
  ["Wrocław","PL",51.108,17.039,0],["Poznań","PL",52.406,16.925,0],["Gdańsk","PL",54.352,18.647,0],["Łódź","PL",51.76,19.456,0],
  ["Szczecin","PL",53.429,14.553,0],["Katowice","PL",50.264,19.024,0],["Bratislava","SK",48.148,17.107,1],["Košice","SK",48.717,21.261,0],
  ["Budapest","HU",47.498,19.04,1],["Győr","HU",47.687,17.65,0],["Pécs","HU",46.073,18.233,0],
  ["Ljubljana","SI",46.056,14.506,1],["Maribor","SI",46.554,15.646,0],["Zagreb","HR",45.815,15.982,1],["Rijeka","HR",45.327,14.442,0],
  ["Split","HR",43.508,16.44,0],["Zadar","HR",44.119,15.231,0],["Pula","HR",44.867,13.85,0],["Dubrovnik","HR",42.65,18.094,0]
];


RB.villes = RB.villes.concat([
  /* France : ports et Alpes */
  ["Roscoff","FR",48.726,-3.985,0],["Ouistreham","FR",49.283,-0.249,0],["Chamonix","FR",45.924,6.869,0],
  
  
  /* Benelux, Allemagne, Danemark : ports */
  ["Hoek van Holland","NL",51.977,4.133,0],["Puttgarden","DE",54.499,11.226,0],["Flensbourg","DE",54.794,9.446,0],
  ["Hirtshals","DK",57.588,9.959,0],["Frederikshavn","DK",57.441,10.537,0],["Kolding","DK",55.49,9.472,0],
  ["Roskilde","DK",55.642,12.08,0],["Rødby","DK",54.695,11.389,0],["Gedser","DK",54.574,11.927,0],
  /* Royaume-Uni */
  
  
  
  
  
  
  
  
  
  
  /* Irlande (et Irlande du Nord) */
  
  
  
  
  /* Norvège, Suède */
  ["Oslo","NO",59.914,10.752,1],["Bergen","NO",60.392,5.324,1],["Stavanger","NO",58.97,5.733,0],["Kristiansand","NO",58.146,7.996,0],
  ["Larvik","NO",59.053,10.027,0],["Lillehammer","NO",61.115,10.466,0],["Flåm","NO",60.863,7.113,0],["Geiranger","NO",62.101,7.206,0],
  ["Ålesund","NO",62.472,6.15,0],["Trondheim","NO",63.431,10.395,0],["Bodø","NO",67.28,14.405,0],["Narvik","NO",68.438,17.427,0],
  ["Tromsø","NO",69.649,18.956,0],
  ["Stockholm","SE",59.329,18.069,1],["Göteborg","SE",57.709,11.975,1],["Malmö","SE",55.605,13.004,1],["Helsingborg","SE",56.046,12.695,0],
  ["Trelleborg","SE",55.376,13.157,0],["Uppsala","SE",59.859,17.639,0],["Jönköping","SE",57.783,14.161,0],["Karlstad","SE",59.379,13.504,0],
  ["Kalmar","SE",56.663,16.356,0],["Växjö","SE",56.879,14.806,0],["Örebro","SE",59.275,15.213,0],["Norrköping","SE",58.588,16.192,0],
  ["Gävle","SE",60.675,17.141,0],["Falun","SE",60.607,15.631,0],["Mora","SE",61.004,14.537,0],["Sundsvall","SE",62.391,17.307,0],
  ["Östersund","SE",63.179,14.636,0],["Umeå","SE",63.826,20.263,0],["Luleå","SE",65.584,22.155,0],["Kiruna","SE",67.856,20.225,0],
  /* Finlande */
  ["Helsinki","FI",60.17,24.938,1],["Turku","FI",60.452,22.267,0],["Tampere","FI",61.498,23.761,0],["Lahti","FI",60.983,25.656,0],
  ["Jyväskylä","FI",62.242,25.747,0],["Kuopio","FI",62.892,27.677,0],["Savonlinna","FI",61.869,28.88,0],["Joensuu","FI",62.601,29.763,0],
  ["Vaasa","FI",63.096,21.616,0],["Oulu","FI",65.012,25.465,0],["Tornio","FI",65.848,24.146,0],["Rovaniemi","FI",66.503,25.729,0],
  /* Pays baltes */
  ["Tallinn","EE",59.437,24.754,1],["Tartu","EE",58.378,26.729,0],["Pärnu","EE",58.385,24.497,0],
  ["Riga","LV",56.95,24.105,1],["Liepāja","LV",56.505,21.011,0],["Cēsis","LV",57.312,25.274,0],["Daugavpils","LV",55.875,26.536,0],
  ["Vilnius","LT",54.687,25.28,1],["Kaunas","LT",54.899,23.904,0],["Klaipėda","LT",55.703,21.144,0],["Šiauliai","LT",55.934,23.316,0],
  /* Pologne, Slovaquie, Hongrie : compléments */
  ["Białystok","PL",53.133,23.169,0],["Lublin","PL",51.247,22.568,0],["Olsztyn","PL",53.778,20.48,0],["Zakopane","PL",49.299,19.949,0],
  ["Rzeszów","PL",50.041,21.999,0],["Poprad","SK",49.059,20.297,0],["Žilina","SK",49.223,18.74,0],
  ["Debrecen","HU",47.532,21.627,0],["Szeged","HU",46.253,20.141,0],["Siófok","HU",46.904,18.058,0],
  /* Roumanie, Bulgarie, Serbie */
  ["Bucarest","RO",44.427,26.103,1],["Cluj-Napoca","RO",46.771,23.624,0],["Brașov","RO",45.658,25.601,0],["Sibiu","RO",45.798,24.125,0],
  ["Timișoara","RO",45.749,21.208,0],["Oradea","RO",47.047,21.919,0],["Sighișoara","RO",46.22,24.792,0],["Iași","RO",47.159,27.587,0],
  ["Constanța","RO",44.16,28.635,0],["Sofia","BG",42.698,23.322,1],["Plovdiv","BG",42.136,24.743,0],["Varna","BG",43.214,27.915,0],
  ["Bourgas","BG",42.504,27.462,0],["Veliko Tarnovo","BG",43.076,25.617,0],["Belgrade","RS",44.787,20.457,1],["Novi Sad","RS",45.267,19.833,0],
  ["Niš","RS",43.32,21.896,0],
  /* Balkans de l’Ouest */
  ["Sarajevo","BA",43.856,18.413,1],["Mostar","BA",43.343,17.808,0],["Banja Luka","BA",44.772,17.191,0],
  ["Podgorica","ME",42.441,19.263,0],["Kotor","ME",42.425,18.771,0],["Budva","ME",42.286,18.84,0],
  ["Tirana","AL",41.327,19.819,1],["Shkodër","AL",42.068,19.513,0],["Vlorë","AL",40.466,19.49,0],["Sarandë","AL",39.875,20.005,0],
  ["Berat","AL",40.706,19.952,0],["Gjirokastër","AL",40.076,20.139,0],["Skopje","MK",41.998,21.426,1],["Ohrid","MK",41.117,20.802,0],
  ["Osijek","HR",45.554,18.695,0],["Šibenik","HR",43.735,15.89,0],["Koper","SI",45.548,13.73,0],
  /* Grèce */
  ["Athènes","GR",37.984,23.728,1],["Thessalonique","GR",40.64,22.944,1],["Le Pirée","GR",37.942,23.646,0],["Patras","GR",38.246,21.735,0],
  ["Igoumenitsa","GR",39.505,20.266,0],["Ioannina","GR",39.665,20.853,0],["Kalambaka","GR",39.706,21.626,0],["Volos","GR",39.362,22.942,0],
  ["Nauplie","GR",37.567,22.807,0],["Kalamata","GR",37.039,22.114,0],["Delphes","GR",38.482,22.501,0],["Olympie","GR",37.638,21.63,0],
  ["Kavala","GR",40.937,24.412,0],["Alexandroupoli","GR",40.848,25.874,0],
  /* Italie : Sud, Sicile, Sardaigne */
  ["Civitavecchia","IT",42.093,11.796,0],["Assise","IT",43.071,12.617,0],["Orvieto","IT",42.718,12.111,0],["L’Aquila","IT",42.35,13.399,0],
  ["Foggia","IT",41.462,15.544,0],["Brindisi","IT",40.632,17.942,0],["Tarente","IT",40.464,17.247,0],["Matera","IT",40.667,16.604,0],
  ["Cosenza","IT",39.298,16.254,0],["Reggio de Calabre","IT",38.111,15.647,0],["Villa San Giovanni","IT",38.22,15.637,0],
  
  
  
  
  /* Islande */
  
  
  
]);

/* Passages entre zones, uniquement par la route : ponts, tunnels et frontières
   [ville A, ville B, type, (inutilisé), libellé] — aucun ferry : Roadbook est 100 % terrestre */
RB.liens = [
  /* Ponts et tunnels entre zones (par la route) */
  ["Copenhague", "Malmö", "route", 0, "Pont de l’Øresund (péage)"],
  ["Copenhague", "Odense", "route", 0, "Pont du Grand Belt (péage)"],
  ["Roskilde", "Odense", "route", 0, "Pont du Grand Belt (péage)"],
  ["Chambéry", "Turin", "route", 0, "Tunnel du Fréjus (péage)"],
  ["Chamonix", "Aoste", "route", 0, "Tunnel du Mont-Blanc (péage)"],
  ["Nice", "Sanremo", "route", 0, ""],
  ["Menton", "Sanremo", "route", 0, ""],
  ["Lugano", "Côme", "route", 0, ""],
  ["Innsbruck", "Bolzano", "route", 0, "Autoroute du Brenner (péage)"],
  ["Villach", "Udine", "route", 0, ""],
  ["Ljubljana", "Trieste", "route", 0, ""],
  ["Koper", "Trieste", "route", 0, ""],
  ["Białystok", "Kaunas", "route", 0, ""],
  ["Luleå", "Tornio", "route", 0, ""]
];


/* Vers le Caucase par la route : la Turquie, puis la Géorgie et l’Arménie.
   (L’Azerbaïdjan garde ses frontières terrestres fermées aux voitures, il n’est donc pas proposé.) */
RB.villes = RB.villes.concat([
  ["Svilengrad","BG",41.766,26.199,0],
  ["Edirne","TR",41.677,26.556,0],["Keşan","TR",40.856,26.63,0],["Istanbul","TR",41.008,28.978,1],["Çorlu","TR",41.159,27.8,0],
  ["Çanakkale","TR",40.146,26.408,0],["Bursa","TR",40.188,29.061,1],["Izmit","TR",40.766,29.94,0],["Düzce","TR",40.844,31.156,0],
  ["Bolu","TR",40.739,31.611,0],["Eskişehir","TR",39.777,30.52,0],["Ankara","TR",39.933,32.86,1],["Safranbolu","TR",41.25,32.694,0],
  ["Kastamonu","TR",41.376,33.776,0],["Sinop","TR",42.026,35.151,0],["Çorum","TR",40.549,34.954,0],["Amasya","TR",40.65,35.833,0],
  ["Samsun","TR",41.287,36.33,0],["Tokat","TR",40.314,36.554,0],["Ordu","TR",40.984,37.88,0],["Giresun","TR",40.913,38.39,0],
  ["Trabzon","TR",41.002,39.717,0],["Rize","TR",41.025,40.517,0],["Hopa","TR",41.391,41.428,0],["Artvin","TR",41.183,41.818,0],
  ["Ardahan","TR",41.111,42.702,0],["Kars","TR",40.602,43.097,0],["Erzurum","TR",39.904,41.267,0],["Erzincan","TR",39.75,39.491,0],
  ["Sivas","TR",39.75,37.017,0],["Kayseri","TR",38.734,35.467,0],["Göreme","TR",38.643,34.828,0],
  ["Batoumi","GE",41.642,41.634,0],["Zougdidi","GE",42.509,41.871,0],["Koutaïssi","GE",42.268,42.718,0],["Mestia","GE",43.046,42.727,0],
  ["Borjomi","GE",41.84,43.383,0],["Akhaltsikhé","GE",41.639,42.983,0],["Ninotsminda","GE",41.264,43.592,0],["Gori","GE",41.985,44.11,0],
  ["Tbilissi","GE",41.716,44.783,1],["Stepantsminda","GE",42.657,44.643,0],["Telavi","GE",41.919,45.473,0],["Sighnaghi","GE",41.62,45.922,0],
  ["Erevan","AM",40.179,44.499,1],["Gyumri","AM",40.785,43.841,0],["Vanadzor","AM",40.812,44.488,0],["Alaverdi","AM",41.097,44.673,0],
  ["Dilijan","AM",40.741,44.863,0],["Sevan","AM",40.548,44.948,0],["Areni","AM",39.721,45.204,0],["Goris","AM",39.508,46.338,0]
]);
RB.liens = RB.liens.concat([
  ["Svilengrad", "Edirne", "route", 0, "Frontière Bulgarie → Turquie (Kapitan Andreevo)"],
  ["Alexandroupoli", "Keşan", "route", 0, "Frontière Grèce → Turquie (Kipoi)"],
  ["Hopa", "Batoumi", "route", 0, "Frontière Turquie → Géorgie (Sarpi)"],
  ["Ardahan", "Akhaltsikhé", "route", 0, "Frontière Turquie → Géorgie (Türkgözü)"],
  ["Tbilissi", "Alaverdi", "route", 0, "Frontière Géorgie → Arménie (Sadakhlo)"],
  ["Ninotsminda", "Gyumri", "route", 0, "Frontière Géorgie → Arménie (Bavra)"]
]);

/* Raccourcis affichés sous le champ de recherche */
RB.raccourcis = ["Paris", "Lyon", "Marseille", "Toulouse", "Bordeaux", "Lille", "Bruxelles", "Genève"];

/* Destinations qu’on ne rejoint pas par la route : l’app explique pourquoi */
(function () {
  var mer = "ne se rejoint qu’en ferry : pour l’instant, Roadbook ne propose que des routes 100 % terrestres.";
  var liste = {
    "royaume-uni": mer, "royaume uni": mer, "angleterre": mer, "ecosse": mer, "pays de galles": mer, "irlande": mer,
    "irlande du nord": mer, "islande": mer, "corse": mer, "sardaigne": mer, "sicile": mer, "malte": mer, "chypre": mer,
    "baleares": mer, "majorque": mer, "minorque": mer, "ibiza": mer, "crete": mer, "rhodes": mer, "corfou": mer,
    "canaries": mer, "madere": mer, "acores": mer, "feroe": mer, "londres": mer, "dublin": mer, "edimbourg": mer,
    "belfast": mer, "reykjavik": mer, "ajaccio": mer, "bastia": mer, "palerme": mer, "catane": mer, "cagliari": mer,
    "la valette": mer, "cornouailles": mer, "bretagne anglaise": mer, "jersey": mer, "guernesey": mer,
    "azerbaidjan": "garde ses frontières terrestres fermées aux voitures : seul le train depuis la Géorgie a repris en mai 2026.",
    "bakou": "est en Azerbaïdjan, qui garde ses frontières terrestres fermées aux voitures.",
    "russie": "n’est pas proposée : Roadbook ne trace pas de route vers ce pays pour l’instant.",
    "bielorussie": "n’est pas proposée : Roadbook ne trace pas de route vers ce pays pour l’instant.",
    "ukraine": "n’est pas proposée pour l’instant, à cause de la guerre.",
    "moldavie": "n’est pas encore proposée par Roadbook."
  };
  RB.horsRoute = liste;
})();
