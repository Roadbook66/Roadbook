# Roadbook — version 1

## Lancer l’application
Double-clique sur **index.html** : l’app s’ouvre dans ton navigateur. Rien à installer.

Si tu préfères passer par un petit serveur local, dans ce dossier :
```
python3 -m http.server 8000
```
puis ouvre http://localhost:8000

## Le parcours
1. **Accueil** : grande image, titre, bouton « Créer mon road trip ».
   Un lien discret « Mes voyages » apparaît seulement s’il y a des voyages gardés.
2. **Ton départ** : 7 questions, bouton « Générer mon itinéraire ».
   « Où as-tu envie d’aller ? » : on tape sa destination (un pays, une région, une étape comme
   « Étretat », ou n’importe quelle ville d’Europe, même un village en indiquant la ville connue
   la plus proche), ou on se laisse guider : Surprends-moi, une partie de l’Europe, puis un pays, puis une région.
   Pour une ville sans repérages, l’app compose une boucle avec les villes voisines, en
   « proposé » et « à confirmer ». Si c’est trop loin pour la durée choisie, l’app le dit
   et propose la meilleure route possible.
   Pour le départ, on tape sa ville (plus de 16 000 villes et villages de 41 pays) ou on touche un raccourci.
   Si la ville n’est pas connue, on la garde comme point de départ et on choisit la grande ville la plus proche.
   Durée : un raccourci (4 jours à 1 an), le nombre exact de jours (de 2 jours à 2 ans, avec − / +
   ou en le tapant), ou les dates de départ et de retour. Au-delà de 3 semaines environ, l’app
   enchaîne plusieurs régions ; au-delà de 3 mois, elle ralentit le rythme dans chacune ; avec une
   date de départ, elle suit les saisons (le Nord et la montagne en été, le Sud en hiver) et la fin
   du voyage se rapproche de la maison. Sur la route, les jours sont regroupés par région.
   « Ce que tu aimes » : 22 envies en 5 familles (paysages, activités, culture, saveurs, ambiance).
   L’app choisit les régions et les étapes qui y répondent, et l’écran du jour signale « Pour toi ».
3. **Ma route** : récap, tracé simple, budget indicatif, « Envie d’ailleurs ? » (6 autres destinations
   possibles depuis ce départ, proches et lointaines), puis la route jour par jour.
4. **Ma journée** : photo, distance, temps, route, repères, où dormir, services.
   Pour chaque nuit, les vrais lieux les plus proches (à 15 km, ou jusqu’à 35 km s’il n’y a rien) :
   une aire de camping-cars ou un parking autorisé, un camping, et au besoin le point d’eau ou la
   station de vidange la plus proche. Pour chacun : eau propre, vidange des eaux grises, électricité,
   douches, chiens, payant ou gratuit, places, horaires, lien vers le lieu. L’écran « Ma route »
   résume la nuit de chaque jour (nom, distance, Eau ✓ Vidange ✓ Élec. ? Douches ? Chiens ?).
5. **Garder ma route** : prénom + e-mail (sans mot de passe), puis « Sauvegarder ce voyage ».

## Les statuts
- **Roulée** (pastille terracotta pleine) : vérifiée sur le terrain.
- **Proposée** (contour vert-de-gris) : une bonne idée, pas encore roulée.
- **À confirmer sur place** (pointillés argile) : avec toujours une solution de repli.

Règle appliquée dans le code (`js/generator.js`) : une information critique (la route,
le lieu pour dormir, l’eau, la vidange) qui n’est pas « roulée » s’affiche toujours
« à confirmer sur place », avec une solution de repli.

⚠️ **Les données sont des exemples.** Les « roulée » de `js/data.js` montrent le rendu,
mais personne n’a vérifié ces lieux. Avant de montrer l’app à de vrais voyageurs,
remplace-les par tes vrais passages (ou passe-les en `"c"`).

## Tes photos
Voir **images/LISEZ-MOI.txt** pour la liste exacte des noms de fichiers.
Tant que ta photo d’une étape manque, l’app montre la photo de sa région (`images/regions/`, choisie sur
Wikimedia Commons, avec son auteur et sa licence affichés sous la photo : cette mention doit rester).
Une région sans belle photo prend celle de son pays ; sinon, le paysage dessiné.
« Ma route » s’ouvre sur la photo de la première région du voyage ; les longs voyages ont une vignette
par région. Les scripts qui ont choisi et allégé ces photos sont dans `outils/` (photos1-3.py).

## Les fichiers
- `index.html` : les 5 écrans
- `css/styles.css` : l’univers « Lin et terre » (couleurs et polices en haut du fichier)
- `js/villes.js` : les villes d’Europe et de la route du Caucase, les zones, les ponts, tunnels et
  frontières qui les relient (aucun ferry), les règles à connaître par pays, et les destinations
  qu’on ne rejoint pas par la route (l’app explique pourquoi)
- `js/data.js` : 7 régions en France, Espagne et Italie (étapes, repères, lieux pour dormir, statuts)
- `js/data-europe.js` : 7 régions européennes (Portugal, Andalousie, Toscane, Dolomites,
  Slovénie et Croatie, Forêt-Noire, Bavière et Autriche)
- `js/data-europe2.js` : 12 régions (Norvège, Suède, Finlande, pays baltes, Pologne, Tchéquie, Roumanie,
  Monténégro et Albanie, Grèce, Pouilles, Suisse, Pays-Bas et Flandre)
- `js/data-terre.js` : 7 régions (Géorgie, Arménie, Hongrie, Bulgarie, Bosnie-Herzégovine, Danemark,
  Rhin et Moselle) et les grandes parties de l’Europe
- `js/regions-*.js` : les régions officielles de tous les pays (régions, provinces, Länder, cantons,
  comtés…), environ 310 en plus des 33 itinéraires détaillés, soit 346 régions par la route.
  `regions-outils.js` les fabrique, `regions-ouest/centre/sud/nord/est/orient.js` les décrivent
  (une ligne par étape : nom, position, deux repères), `regions-fin.js` les relie au réseau routier
  et les range par partie de l’Europe. Ces régions n’ont pas encore de repérages : tout y est
  « proposé », et les nuits, l’eau et la vidange sont « à confirmer sur place », avec un repli.
- `js/villes-plus.js` : Andorre, Liechtenstein, Saint-Marin, Vatican, Kosovo et Moldavie (frontières,
  règles), et l’outil qui ajoute les villes. `js/villes-ouest/centre/sud/nord/est/orient.js` : toutes les
  villes et villages par pays, une ligne « Nom latitude longitude » chacun (ajoute les tiens librement).
  La route passe par les grands axes ; une petite ville est un « cul-de-sac » du réseau (on y va,
  on n’y passe pas), sauf là où les grandes villes sont rares : elle devient alors un carrefour.
- `js/villes-geonames.js` : toutes les villes de plus de 5 000 habitants des 41 pays (source GeoNames,
  licence CC BY 4.0 : la mention « Villes : GeoNames » doit rester visible dans l’app), sans les îles
  qu’on ne rejoint qu’en ferry ni la Transnistrie, l’Abkhazie et l’Ossétie du Sud.
- `js/regions-plus.js` : les régions des pays ajoutés.
- `js/aires.js` et `js/aires/XX.js` : les aires de camping-cars, campings, parkings autorisés, stations
  de vidange et points d’eau, un fichier par pays (© les contributeurs d’OpenStreetMap, licence ODbL :
  la mention doit rester visible). Seuls les pays de l’itinéraire sont chargés. Ces informations n’ont
  pas été vérifiées sur place : la nuit, l’eau et la vidange restent « à confirmer sur place ».
  Quand OpenStreetMap ne dit rien sur un service, l’app affiche « Non renseigné » avec un conseil (accueil du camping, panneau de l’aire).
  Une borne d’eau ou de vidange enregistrée à moins de 150 m d’une aire ou d’un camping compte comme « oui ».
  En France, les services sont complétés avec DATAtourisme, la base des offices de tourisme
  (data.gouv.fr, Licence Ouverte 2.0) : ces lieux portent un « D » en 15e valeur et la carte l’indique.
  Données brutes extraites : outils/datatourisme-aires.json.
  Des sites internet indiqués dans OpenStreetMap, l’app ne garde que ceux de la mairie (ou de la
  commune) et ceux dont l’adresse correspond au camping ou à l’aire (son nom, ou un mot comme camping,
  aire, stellplatz, sosta…). Les annuaires, réseaux sociaux, sites de réservation et sites sans rapport
  sont retirés (script : sites.py). Chaque lieu garde son lien « Voir le lieu » (sa
  position sur la carte OpenStreetMap).
- `js/envies.js` : les 22 envies et leurs mots-clés (à enrichir librement)
- `js/generator.js` : la fabrication de la route jour par jour (calcul sur le réseau routier)
- `js/app.js` : les écrans, la navigation et la sauvegarde

## Où sont gardées les données
Dans le navigateur (localStorage) : les réponses au questionnaire, la dernière route,
les voyages gardés et l’accès (prénom + e-mail). Rien ne part sur Internet.
Un autre navigateur ou un autre appareil ne voit pas ces voyages.

## Limites connues de cette version
- Les distances sont des estimations sur un réseau simplifié de villes, pas un vrai calcul GPS.
- 100 % terrestre : aucun ferry. Royaume-Uni, Irlande, Islande, Corse, Sardaigne, Sicile, Malte,
  Chypre et les îles ne sont pas proposés pour l’instant.
- Caucase : Géorgie et Arménie, par la Turquie (seul accès par la route). L’Azerbaïdjan garde ses
  frontières terrestres fermées aux voitures (seul le train depuis la Géorgie a repris en mai 2026).
- Russie, Biélorussie et Ukraine ne font pas partie de Roadbook. Transnistrie, Abkhazie et Ossétie du Sud
  non plus.
- Kosovo : on y entre par l’Albanie, la Macédoine du Nord ou le Monténégro, et l’app n’y trace pas de route
  directe avec la Serbie (la Serbie peut refuser l’entrée depuis le Kosovo).
- Les villes ajoutées à la main (villages de moins de 5 000 habitants) ont des positions approximatives.
- Turquie : ses 7 régions sont proposées (partie « La Turquie »). Pour le Sud-Est, la frontière
  syrienne est proche : vérifie les conseils aux voyageurs avant de partir.
- Les régions officielles reprennent les découpages administratifs, sauf les îles qu’on ne rejoint
  qu’en ferry (Baléares, Canaries, îles grecques, Sicile, Sardaigne, Corse, Gotland, Åland…).

## Sans réseau

- `sw.js` (le service hors ligne) garde l’application sur l’appareil dès la première visite en ligne.
  Il ne fonctionne que sur un site en https (le lien en ligne de Roadbook), pas en ouvrant index.html
  depuis le disque. **À chaque mise à jour de Roadbook, change la ligne `VERSION` en haut de sw.js.**
- `js/horsligne.js` prépare chaque voyage composé : les fichiers d’aires des pays traversés et toutes
  ses photos sont gardés dans le navigateur. Ma route affiche « Prêt pour rouler sans réseau ».
- Les journées et les lieux pour dormir sont déjà gardés avec le voyage (localStorage).
- `manifest.webmanifest` et `images/icone-192.png` / `icone-512.png` permettent d’ajouter Roadbook
  à l’écran d’accueil du téléphone, comme une application.

## Les cartes

- `js/carte.js` dessine la carte de Ma route (le tracé, nuit après nuit) et celle de chaque journée
  (d’où l’on vient, la ville du soir, les aires et campings autour). Bibliothèque Leaflet 1.9.4,
  gardée dans `js/vendor/leaflet/` (licence BSD, voir LICENSE.txt).
- Le fond de carte est inclus : `js/fond-carte.js` (côtes et frontières de Natural Earth, domaine public,
  tirées de world-atlas ; source dans outils/fonds/). Il marche partout, même sans réseau et dans la
  version en ligne. Les noms des villes viennent de la liste des villes de Roadbook.
- Pour le détail des rues, chaque lieu a un lien « Voir sur la carte » vers OpenStreetMap.

- Avec du réseau (site en ligne), la carte détaillée d’OpenStreetMap (tile.openstreetmap.org) s’affiche
  par-dessus le fond Natural Earth, qui reste en secours sans réseau. Bouton « Plein écran » sur chaque carte.
  Sur Ma route, toucher un numéro ouvre la fiche de l’étape : photo (si elle montre ce lieu), dates, km,
  nuits sur place, une idée de visite et « Voir la journée ».

## Les règles de la route

- `js/regles-route.js` : zones à faibles émissions, péages urbains, péages et vitesses au-delà de 3,5 t,
  et campings fermés hors saison (novembre à mars). Les alertes apparaissent dans « À savoir aujourd’hui »
  sur la journée concernée, et la liste « À préparer avant de partir » sur Ma route.
- Le questionnaire demande (facultatif) le PTAC et la vignette Crit’Air.
- Vérifié le 21 octobre 2026 :
  - France : les 25 ZFE de la liste officielle (mieuxrespirerenville.gouv.fr), complétées par les métropoles
    (Grand Lyon, Strasbourg, Grand Paris…). ZFE maintenues après la censure du Conseil constitutionnel
    du 21 mai 2026. Dérogations camping-cars (VASP) : Rouen, Montpellier, Grand Paris, Grenoble, Strasbourg,
    Toulouse, Reims, Saint-Étienne.
  - Allemagne : les 35 Umweltzonen actives de l’Umweltbundesamt (mise à jour du 26 août 2026) ;
    23 zones supprimées (Hanovre, Fribourg, Heidelberg, Mannheim, Ulm, Tübingen, Mayence…) ne sont pas listées.
  - Belgique (lez.brussels, villes de Gand et d’Anvers), Pays-Bas (milieuzones.nl), Danemark (miljoezoner.dk),
    Espagne (56 ZBE actives ; Barcelone : inscription AMB), Italie (Milan Area B/C, Rome Fascia Verde),
    Portugal (ZER de Lisbonne), Pologne (SCT de Varsovie et Cracovie), Suède (péage urbain de Stockholm et Göteborg),
    Norvège (Epass24).
  - Plus de 3,5 t : Autriche GO-Box, Suisse PSVA (application Via), Slovénie DarsGo, Tchéquie MYTO,
    Hongrie e-vignette D2 (depuis le 1er janvier 2026), Pologne e-TOLL, Slovaquie (M1 : vignette ; N : e-Myto),
    Bulgarie BG Toll, Allemagne et Pays-Bas (camping-cars M1/SA exemptés du péage poids lourds).
    Vitesses : deux guides concordants de 2026 (Eurocampings, Cleared for Camping).
- Ces règles changent souvent : à revoir tous les six mois. Chaque alerte renvoie vers
  urbanaccessregulations.eu.

## Changer sa route et tenir son carnet

- `js/modifier.js` : « Rester un jour de plus » (ajoute une journée sur place), « Retirer cette journée
  sur place » et « Sauter cette étape » (avec ses journées sur place ; la distance vers l’étape suivante
  est alors estimée). Les jours, les dates et le total de kilomètres sont recalculés.
- « Changer cette étape » (sur Ma route, ou « Choisir une autre étape » dans la journée) : jusqu’à 8 étapes
  préparées proches et sur le chemin (`RB.modifier.propositions`, sans celles déjà au programme), ou une
  ville au choix (moins de 600 km). Deux appuis pour confirmer. La journée suivante part de la nouvelle
  étape (distance estimée), et les aires et campings sont recalculés.
- Sur chaque journée : « Mon carnet » (j’y suis allé, un avis, une note) et « Je dors ici ce soir »
  pour choisir son aire ou son camping. Tout est gardé avec le voyage, et Ma route l’affiche.

## La communauté (avis, confirmations, photos)

- Serveur : Supabase. `outils/communaute.sql` crée la base (à coller une fois dans SQL Editor → Run).
  `js/config.js` reçoit l’adresse du projet et la clé publique « anon » (jamais la clé « service_role »).
- Sur chaque aire, camping ou parking : « Donner mon avis » (existe toujours ?, note, eau, vidange,
  électricité, douches, chiens, prix, texte, date, pseudo, jusqu’à 3 photos). Les photos sont réduites
  dans le téléphone, ce qui retire aussi leur position GPS. Sans réseau, l’avis part plus tard tout seul.
- Tout arrive « en attente » ; rien n’est visible avant validation sur `moderation.html`
  (connexion avec le compte créé dans Supabase, adresse listée dans la table « moderateurs »).
  Publier déplace les photos du stockage privé vers le public. Les voyageurs peuvent signaler un avis publié.
- Bibliothèque supabase-js 2.45.4 dans `js/vendor/supabase/` (licence MIT).
