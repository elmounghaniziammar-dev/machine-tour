# Tour parallèle interactif en JavaScript

Ce projet représente un tour parallèle générique en 3D avec Three.js. La caméra permet d'examiner la machine ; les commandes dessinées sur celle-ci permettent de déplacer les chariots et la poupée mobile, de régler la broche et d'engager une avance automatique. Le code est en JavaScript, sans framework d'interface.

Le simulateur associe la cinématique du tour à un modèle géométrique de coupe. La pièce est fixée à la broche. Le bec de la plaquette enlève de la matière sur les secteurs de pièce qui défilent devant lui. La surface usinée et le volume des copeaux proviennent de ce même calcul.

## Lancer le projet

Utiliser Node.js `^20.19.0` ou `>=22.12.0`. Depuis le dossier qui contient `package.json` :

```bash
npm ci
npm run dev
```

Ouvrir l'adresse indiquée par Vite. Il faut un navigateur avec WebGL2 ; ouvrir `index.html` directement ne charge pas correctement les modules. `npm install` peut remplacer `npm ci` si le fichier de verrouillage doit être mis à jour.

## Effectuer une passe

Le projet simule le **chariotage extérieur** d’un brut de Ø 40 × 150 mm. Le mandrin serre la pièce à gauche. À droite, une contre-pointe tournante la soutient dans un trou de centre préparé à 60°.

1. Sur la poupée fixe, régler le régime à l’arrêt et choisir l’avance par tour. Pour soutenir le brut, approcher la contre-pointe au volant du fourreau puis bloquer le verrou.
2. Tourner le volant transversal pour tangenter le brut et cliquer sur la bague pour prendre le zéro. Pour obtenir Ø 36 à partir de Ø 40 mm, prendre 2 mm au rayon en position dégagée au-delà de la face. La mesure **Ø réglé au bec** vaut deux fois la distance du bec à l’axe, quel que soit le zéro du tambour.
3. Cliquer sur le levier de broche pour démarrer en marche avant, puis sur le levier d’avance du tablier pour embrayer. Le traînard part de sa position actuelle. On peut aussi embrayer à l’arrêt puis démarrer la broche. L’outil peut avancer dans le vide avant la coupe.
4. Cliquer de nouveau sur le levier du tablier à la fin de la longueur voulue. La broche continue de tourner. Les butées et les collisions bornent les mouvements.

Le panneau 2D affiche uniquement des mesures et des états. Les touches **1 à 5** cadrent la machine entière, la poupée fixe, le traînard, le tambour et la zone de coupe. La molette permet de zoomer.

## Modèle de coupe

- Le brut est échantillonné tous les 0,25 mm le long de son axe et en 48 secteurs autour de la broche. La simulation interpole la position des arêtes à leur passage devant chaque secteur. Une fraction de révolution usine une fraction de la circonférence. **Ø au bec** mesure le diamètre d’enveloppe de la section en cours de coupe. **Ø derrière le bec** mesure celui de la section côté contre-pointe, après le passage de l’arête de finition. La différence est visible pendant l’avance.
- Pour une passe cylindrique, la pénétration radiale vaut `aₚ = (D₀ − D₁) / 2`. L'avance vaut `v_f = f × n` en mm/min, avec `f` en mm/tr et `n` en tr/min. La vitesse de coupe affichée vaut `V_c = π × D × n / 1000` en m/min pour un diamètre en mm. [Formules de tournage métriques, Sandvik Coromant](https://cdn2.sandvik.coromant.com/files/sitecollectiondocuments/elearning/formulas-and-definitions/h84_turning_formulas_fra_metric.pdf)
- Le volume d'une couronne de longueur `L` vaut `π × L × (D₀² − D₁²) / 4`. Le calcul additionne cette différence pour les secteurs réellement entamés, avec leur largeur axiale et leur fraction de tour. Un passage dans le vide ou sur une surface déjà entièrement balayée ajoute zéro. Les flancs inclinés et les traces d'avance de la plaquette contribuent à la mesure réelle.
- Le rendu émet un ruban de copeau pour 4 mm³ retirés. Le reliquat est conservé pour l'image suivante. À très fort débit, les fragments d'une même image sont regroupés pour borner le coût du rendu. La trajectoire inclut la gravité et un contact simplifié avec les surfaces de réception. La forme et la teinte des rubans sont illustratives. Les efforts, la température et l'usure de la plaquette sont hors du modèle.

## Utiliser la machine

Le volant transversal tourne de façon continue par glissement circulaire. Un clic sur le volant avance d’une division et Maj + clic recule d’une division. Une division vaut 0,05 mm au rayon, soit 0,10 mm sur le diamètre. Un clic sur la bague graduée remet sa lecture à zéro sans déplacer le bec.

À 250 tr/min et 0,10 mm/tr, la barre d’avance déplace le traînard de 25 mm/min vers le mandrin en marche avant. L’origine Z affichée correspond à la face droite du brut. La plaque sur la poupée fixe reprend les régimes lisibles du SN 40.

Survoler une commande 3D la met en évidence et affiche une infobulle avec son nom, sa valeur et le geste attendu. Un message d'état dans la vue 3D signale notamment les butées et les verrous. Le cran **Marche avant · sens de coupe** correspond à la rotation antihoraire vue depuis la poupée mobile. La surface avant de la pièce descend alors sur la plaquette.

| Commande | Action |
| --- | --- |
| Glisser sur un espace vide | Tourner la caméra autour du tour. |
| Molette | Zoomer. |
| Bouton droit glissé | Déplacer la vue. |
| Maintenir la poignée ou la jante du volant du traînard, puis décrire un cercle | Déplacer le traînard et tous les chariots portés le long du banc, à raison de 25 mm par tour. Désengager d'abord l'avance automatique. |
| Tourner le volant transversal d'un geste circulaire | Déplacer le transversal et l'outil de 5 mm **radiaux** par tour. Son tambour tourne avec le volant : 100 divisions, soit 0,05 mm radial par division. |
| Tourner la manivelle à l’extrémité droite du petit chariot | Déplacer le coulisseau et l’outil parallèlement au banc sur ce montage, à raison de 2 mm par tour. |
| Tourner le volant de la poupée mobile d'un geste circulaire | Sortir ou rentrer le fourreau vers le mandrin, à raison de 4 mm par tour et dans une course de 0 à 80 mm, si son verrou est ouvert. |
| Glisser le levier de verrouillage de la poupée mobile, puis son corps | Déverrouiller et faire glisser la poupée uniquement le long du banc. Remettre le levier en position verrouillée pour l'immobiliser. |
| Glisser le levier de verrouillage du fourreau | Bloquer ou libérer l'extension du fourreau. |
| Maintenir et glisser le sélecteur de vitesse | Choisir à l’arrêt l’un des 14 régimes distincts visibles sur la plaque SN 40, de 22,4 à 2 000 tr/min. |
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
| `src/mecanique/ProfilPiece.js`, `Coupe.js` | Rayons résiduels, balayage des arêtes de coupe et bilan volumique. |
| `src/machine/parts/Copeaux.js` | Émission et mouvement des rubans de copeaux. |
| `src/interactions/PanneauUsinage.js` | Affichage en lecture seule des diamètres, de la coupe et des mouvements. |
| `src/interactions/Selection.js` | Sélection des commandes visibles par lancer de rayon, gestes de pointeur, infobulles et messages d'état. |
| `src/interactions/InteractionVolant.js` | Projection des gestes sur les plans des volants et du banc. |
| `src/interactions/InteractionSelecteur.js`, `InteractionLevier.js` | Réglages et représentation visuelle des sélecteurs et leviers. |
| `test/physics.test.js` | Vérifications des contacts, de la rigidité des assemblages et des matériaux. |
| `test/controls.test.js` | Vérifications des crans, verrous, courses et gestes circulaires. |
| `test/usinage.test.js` | Révolution partielle, conservation du volume, profils de passe, arrêt et copeaux. |

Pour suivre le fonctionnement, commencer par `main.js`, puis `Machine.js`, `EtatMachine.js`, `Deplacements.js`, `Collisions.js` et `Selection.js`. Les fichiers de `parts/` définissent ensuite la géométrie visible.

## Repères et contraintes

- 1 unité Three.js correspond à 1 mm.
- X Three.js suit la longueur du banc ; Y est la hauteur ; Z Three.js suit la direction transversale.
- Le centre de la broche est à 200 mm au-dessus des glissières.
- Les courses numériques sont : trainard `[460, 1060]`, transversal `[0, 200]`, petit chariot `[-40, 40]`, poupée mobile `[780, 1180]` et fourreau `[0, 80]`, en millimètres.

`Deplacements.js` déplace les groupes parents ; leurs pièces enfants conservent donc leurs positions relatives. `Limites.js` applique d'abord les bornes de course. `Collisions.js` compare ensuite des boîtes englobantes alignées sur les axes pour les maillages des assemblages et arrête un geste au premier contact estimé. Les jeux internes nécessaires au guidage, comme banc/trainard ou fourreau/poupée, sont exclus de ces contrôles. La trajectoire des éléments tournants de la broche utilise une enveloppe radiale pour éviter un passage entre deux images.

La portée conique de la contre-pointe est modélisée par tranches axiales de 1 mm pour déterminer ses jeux avec le porte-outil. La profondeur du trou de centre donne la butée du fourreau. Les autres enveloppes de collision sont conservatrices et peuvent arrêter un mouvement avant le contact visible. Seule la plaquette enlève de la matière. À l’arrêt, le contact de ses arêtes tient compte du diamètre résiduel de chaque section. Les jeux, les courses et la zone de prise sont ceux de la géométrie simulée.

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
