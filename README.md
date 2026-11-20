# Tour parallèle interactif en JavaScript

Ce projet représente un tour parallèle générique en 3D avec Three.js. La caméra permet d'examiner la machine ; les commandes dessinées sur celle-ci permettent de déplacer les chariots et la poupée mobile, de régler la broche et d'engager une avance automatique. Le code est en JavaScript, sans framework d'interface.

Il s'agit d'une **simulation cinématique simplifiée** : les assemblages se déplacent comme des corps rigides et leurs courses sont bornées. Le modèle ne réalise aucun enlèvement de matière.

## Lancer le projet

Utiliser Node.js `^20.19.0` ou `>=22.12.0`. Depuis le dossier qui contient `package.json` :

```bash
npm ci
npm run dev
```

Ouvrir l'adresse indiquée par Vite. Il faut un navigateur avec WebGL2 ; ouvrir `index.html` directement ne charge pas correctement les modules. `npm install` peut remplacer `npm ci` si le fichier de verrouillage doit être mis à jour.

## Utiliser la machine

Survoler une commande 3D la met légèrement en évidence et affiche une courte infobulle en anglais : nom, valeur actuelle et geste attendu. Un bref message d'état apparaît en bas à gauche, notamment lorsqu'une butée ou un verrou bloque un mouvement. Toutes les commandes se manipulent sur la machine elle-même.

| Commande | Action |
| --- | --- |
| Glisser sur un espace vide | Tourner la caméra autour du tour. |
| Molette | Zoomer. |
| Bouton droit glissé | Déplacer la vue. |
| Maintenir la poignée ou la jante du volant du traînard, puis décrire un cercle | Déplacer le traînard et tous les chariots portés le long du banc, à raison de 25 mm par tour. Désengager d'abord l'avance automatique. |
| Tourner le volant transversal d'un geste circulaire | Déplacer le transversal et l'outil de 5 mm **radiaux** par tour. Son tambour tourne avec le volant : 100 divisions, soit 0,05 mm radial par division. |
| Tourner la manivelle du petit chariot d'un geste circulaire | Déplacer le coulisseau et l'outil sur l'axe local de la base orientable, à raison de 2 mm par tour ; la base reste fixe. |
| Tourner le volant de la poupée mobile d'un geste circulaire | Sortir ou rentrer le fourreau vers le mandrin, à raison de 4 mm par tour et dans une course de 0 à 80 mm, si son verrou est ouvert. |
| Glisser le levier de verrouillage de la poupée mobile, puis son corps | Déverrouiller et faire glisser la poupée uniquement le long du banc. Remettre le levier en position verrouillée pour l'immobiliser. |
| Glisser le levier de verrouillage du fourreau | Bloquer ou libérer l'extension du fourreau. |
| Maintenir et glisser le sélecteur de vitesse | Choisir l'un des 12 crans, de 45 à 2 000 tr/min. La broche doit être arrêtée. La valeur choisie s'affiche discrètement près du sélecteur. |
| Cliquer le sélecteur d'avance | Choisir l'avance suivante en mm par tour ; `Maj` + clic revient à la précédente. |
| Maintenir et glisser le levier de broche | Choisir marche avant, arrêt ou marche arrière. Pour inverser la rotation, relâcher d'abord au cran d'arrêt, puis effectuer un second geste vers le sens opposé. |
| Cliquer le levier d'avance ou celui des demi-noix | Engager ou désengager respectivement la barre d'avance ou la vis mère. |
| Cliquer le bouton rouge | Déclencher l'arrêt d'urgence : broche arrêtée et avance motorisée désengagée. Le bouton reste enfoncé ; cliquer de nouveau pour le réarmer. La broche ne redémarre pas automatiquement. |

Orienter la vue assez face au volant ou au levier pour que le geste circulaire soit lisible. La caméra cesse de tourner pendant la manipulation et redevient disponible dès que le pointeur est relâché ou que le geste est annulé. Les infobulles et messages restent informatifs ; ils ne remplacent aucune commande 3D.

## Structure du code

| Fichier | Rôle |
| --- | --- |
| `index.html`, `src/style.css` | Point d'entrée HTML et style de la page. |
| `src/main.js` | Scène, caméra, éclairage, rendu, boucle d'animation et branchement des interactions. |
| `src/machine/Machine.js` | Assemblage des parties et références aux objets mobiles ou commandables. |
| `src/machine/parts/Support.js`, `Banc.js` | Support, banc, glissières, vis mère, barre d'avance et bac. |
| `src/machine/parts/PoupeeFixe.js`, `Mandrin.js`, `Piece.js` | Poupée fixe, broche, mandrin et pièce cylindrique. |
| `src/machine/parts/Trainard.js`, `Chariots.js`, `PorteOutil.js` | Trainard, chariots et outil. |
| `src/machine/parts/PoupeeMobile.js` | Poupée mobile, fourreau, pointe et verrous. |
| `src/machine/parts/Volants.js`, `Details.js` | Formes réutilisées pour volants, leviers, graduations et détails. |
| `src/utils/geometry.js` | Matériaux et fonctions de création des groupes, blocs, cylindres et maillages. |
| `src/mecanique/EtatMachine.js` | Réglages et positions numériques de la machine. |
| `src/mecanique/Deplacements.js`, `Limites.js` | Application des déplacements et bornes de course. |
| `src/mecanique/Collisions.js` | Limitation des déplacements au premier contact estimé entre assemblages. |
| `src/mecanique/Broche.js` | Rotation de la broche et avance automatique selon le temps écoulé. |
| `src/interactions/Selection.js` | Sélection des commandes visibles par lancer de rayon, gestes de pointeur, infobulles et messages d'état. |
| `src/interactions/InteractionVolant.js` | Projection des gestes sur les plans des volants et du banc. |
| `src/interactions/InteractionSelecteur.js`, `InteractionLevier.js` | Réglages et représentation visuelle des sélecteurs et leviers. |
| `test/physics.test.js` | Vérifications des contacts, de la rigidité des assemblages et des matériaux. |
| `test/controls.test.js` | Vérifications des crans, verrous, courses et gestes circulaires. |

Pour suivre le fonctionnement, commencer par `main.js`, puis `Machine.js`, `EtatMachine.js`, `Deplacements.js`, `Collisions.js` et `Selection.js`. Les fichiers de `parts/` définissent ensuite la géométrie visible.

## Repères et contraintes

- 1 unité Three.js correspond à 1 mm.
- X Three.js suit la longueur du banc ; Y est la hauteur ; Z Three.js suit la direction transversale.
- Le centre de la broche est à 200 mm au-dessus des glissières.
- Les courses numériques sont : trainard `[460, 1060]`, transversal `[0, 200]`, petit chariot `[-40, 40]`, poupée mobile `[780, 1180]` et fourreau `[0, 80]`, en millimètres.

`Deplacements.js` déplace les groupes parents ; leurs pièces enfants conservent donc leurs positions relatives. `Limites.js` applique d'abord les bornes de course. `Collisions.js` compare ensuite des boîtes englobantes alignées sur les axes pour les maillages des assemblages et arrête un geste au premier contact estimé. Les jeux internes nécessaires au guidage, comme banc/trainard ou fourreau/poupée, sont exclus de ces contrôles. La trajectoire des éléments tournants de la broche utilise une enveloppe radiale pour éviter un passage entre deux images.

Ces boîtes sont une approximation : un mouvement peut être arrêté avant que les surfaces visibles se touchent, et le système n'est ni un solveur de physique ni une simulation d'usinage. La rotation, l'avance et le contact de la pointe avec la pièce sont simplifiés ; il n'y a pas de coupe, de déformation, d'effort ou de filetage de la pièce.

## Modifier le modèle

Les tailles et les positions des pièces se trouvent dans `src/machine/parts/`. Les matériaux communs sont dans `src/utils/geometry.js` et la vue initiale dans `src/main.js`. Si une pièce ou un groupe mobile change de nom ou de parent, vérifier les références de `Machine.js` et les boîtes de `Collisions.js`.

Les fonctions `box()` et `cylinder()` évitent de répéter la construction des maillages. Par exemple :

```javascript
box(groupe, "monBloc", [200, 30, 100], [0, 15, 0], materials.paint);
cylinder(groupe, "maPiece", 20, 150, [75, 0, 0], materials.steel, "x");
```

Un `Group` rassemble des objets dans un repère local. Les coordonnées de ses enfants sont relatives au parent ; `position.set(x, y, z)` les place et `rotation` exprime les angles en radians.

## Vérifier

```bash
npm test
npm run build
```

`npm test` exécute les tests de mécanique avec le lanceur intégré de Node.js. `npm run build` vérifie la compilation de production avec Vite. Ces commandes ne remplacent pas une vérification visuelle et des gestes dans un navigateur WebGL2.
