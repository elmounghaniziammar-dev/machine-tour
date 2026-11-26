import test from "node:test";
import assert from "node:assert/strict";
import { creerProfil, BRUT, TOUR } from "../src/mecanique/ProfilPiece.js";
import { creerMachine } from "../src/machine/Machine.js";
import { creerEtatMachine } from "../src/mecanique/EtatMachine.js";
import { creerDeplacements } from "../src/mecanique/Deplacements.js";
import { creerBroche } from "../src/mecanique/Broche.js";
import { creerCopeaux, VOLUME_FRAGMENT } from "../src/machine/parts/Copeaux.js";
import { actionnerLevier, reglerDirection } from "../src/interactions/InteractionLevier.js";

function atelier() {
  const machine = creerMachine();
  const etat = creerEtatMachine();
  const axes = creerDeplacements(machine.elements, etat);
  const broche = creerBroche(machine.elements, etat, axes);
  return { machine, etat, axes, broche, profil: axes.coupe.profil };
}
function proche(obtenu, attendu, tolerance = 1e-6) {
  assert.ok(Math.abs(obtenu - attendu) < tolerance, `${obtenu} au lieu de ${attendu}`);
}

test("le volume d'un secteur puis d'une couronne suit la différence des diamètres au carré", () => {
  const profil = creerProfil();
  const bec = { x: 0, r: 18 };
  // Arête de référence couvrant tout le cylindre pour isoler la quadrature volumique.
  const bords = [{ debutX: 0, debutZ: 0, x: BRUT.longueur, z: 0 }];
  const volume = Math.PI / 4 * (40 ** 2 - 36 ** 2) * BRUT.longueur;
  proche(profil.balayer(bec, bec, 0, TOUR / 4, bords), volume / 4);
  assert.equal(profil.diametre(75), 40);
  proche(profil.balayer(bec, bec, TOUR / 4, 3 * TOUR / 4, bords), 3 * volume / 4);
  assert.equal(profil.diametre(75), 36);
  assert.equal(profil.balayer(bec, bec, 0, 50 * TOUR, bords), 0);
  proche(profil.volume, volume);
});

test("à l'arrêt, en sens inverse ou au simple effleurement, aucun copeau", () => {
  const { etat, axes, broche, profil } = atelier();
  assert.equal(broche.lancerPasse(4), false);

  for (const direction of ["off", "cw"]) {
    etat.direction = direction;
    assert.equal(axes.regler("transversalX", 18), false);
    broche.actualiser(1);
  }
  etat.direction = "ccw";
  broche.actualiser(1);
  axes.regler("transversalX", 22);
  broche.actualiser(1);
  assert.equal(profil.volume, 0);
});

function monter(a) {
  const { axes, etat } = a;
  assert.ok(axes.regler("transversalX", 20), "tangence au bord droit");
  assert.ok(axes.regler("fourreau", etat.fourreau + axes.ecartPointe()));
  assert.ok(axes.pointeSurPiece());
  actionnerLevier("verrouFourreau", etat);
}

test("régler une réduction et soutenir la pièce avant le lancement guidé", () => {
  const a = atelier();
  const { etat, axes, broche, profil } = a;
  assert.equal(broche.lancerPasse(4), false);
  assert.equal(etat.direction, "off");
  assert.ok(axes.regler("fourreau", etat.fourreau + axes.ecartPointe()));
  actionnerLevier("verrouFourreau", etat);
  assert.equal(broche.verifierDepart(4), "");
  axes.regler("transversalX", 20);
  assert.equal(broche.lancerPasse(0), false);
  assert.equal(broche.lancerPasse(40), false);
  assert.ok(broche.lancerPasse(4));
  assert.equal(etat.direction, "ccw");
  assert.equal(etat.engagement, "off");
  // 6 mm de dégagement et 2 mm de prise de passe hors pièce.
  broche.actualiser(80 * 60 / etat.vitesse);
  proche(etat.trainardZ, 596);
  proche(etat.transversalX, 18);
  proche(profil.volume, 0);
  assert.equal(etat.engagement, "rod");
  broche.actualiser(70 * 60 / etat.vitesse);
  proche(etat.trainardZ, 589);
  proche(etat.transversalX, 18);
  assert.ok(profil.volume > 0);
});

test("la passe rejoint le départ depuis une position dégagée sans chercher un point exact", () => {
  for (const [axial, radial] of [[590, 22], [580, 22], [590.3, 21], [590.02, 20.01]]) {
    const { axes, etat, broche, profil } = atelier();
    axes.regler("trainardZ", axial);
    axes.regler("transversalX", radial);
    axes.regler("fourreau", etat.fourreau + axes.ecartPointe());
    actionnerLevier("verrouFourreau", etat);
    assert.ok(broche.lancerPasse(4), etat.message);
    // Avant d’atteindre la face droite, le retour reste hors matière.
    broche.actualiser(8);
    proche(profil.volume, 0);
    broche.actualiser(500);
    assert.match(etat.message, /Fin de la longueur usinable/);
    for (let i = Math.round(axes.coupe.finUsinable / BRUT.pas); i <= profil.dernier; i++) {
      for (let j = 0; j < BRUT.secteurs; j++) proche(profil.rayons[i * BRUT.secteurs + j], 18);
    }
    proche(profil.diametre(22.5), 40);
  }
});

test("un bec déjà engagé dans la matière demande un dégagement avant le retour", () => {
  const { axes, etat, broche, profil } = atelier();
  axes.regler("fourreau", etat.fourreau + axes.ecartPointe());
  actionnerLevier("verrouFourreau", etat);
  // État injecté pour représenter un repositionnement externe incohérent.
  etat.transversalX = 19;
  axes.actualiser();
  assert.equal(broche.lancerPasse(4), false);
  assert.match(etat.message, /Dégager le bec/);
  proche(profil.volume, 0);
  assert.equal(etat.direction, "off");
});

test("la contre-pointe rejoint sa portée sans déplacer la plaquette déjà tangente", () => {
  const a = atelier();
  const { axes, etat, machine } = a;
  assert.ok(axes.regler("transversalX", 20));
  const avant = axes.coupe.position();
  assert.ok(axes.regler("fourreau", etat.fourreau + axes.ecartPointe()));
  assert.deepEqual(axes.coupe.position(), avant);
  assert.ok(axes.pointeSurPiece());
  assert.equal(axes.regler("fourreau", 80), false);
  // Vérifier aussi le petit chariot aligné et le volant en bout de sa vis.
  const volant = machine.elements.volantSuperieur;
  assert.ok(volant.position.x > 67);
  const q = volant.quaternion.clone();
  assert.ok(axes.regler("petitChariot", -1));
  proche(avant.x - axes.coupe.position().x, 1);
  proche(avant.r, axes.coupe.position().r);
  assert.ok(volant.quaternion.angleTo(q) > 3.1);
  assert.ok(axes.pointeSurPiece());
});

test("toute la portée exposée atteint le diamètre demandé, indépendamment du temps entre images", () => {
  const rapide = atelier(), fin = atelier();
  for (const a of [rapide, fin]) {
    monter(a);
    a.etat.avance = 0.4;
    assert.ok(a.broche.lancerPasse(4));
  }
  rapide.broche.actualiser(1000);
  for (let i = 0; i < 2000 && fin.etat.passe; i++) fin.broche.actualiser(0.12);
  assert.equal(fin.etat.passe, null);
  assert.match(fin.etat.message, /Fin de la longueur usinable/);
  assert.equal(fin.etat.direction, "ccw");
  assert.equal(fin.etat.engagement, "off");
  assert.ok(fin.axes.pointeSurPiece());
  const xFin = fin.axes.coupe.finUsinable;
  proche(fin.axes.coupe.position().x, xFin);
  proche(BRUT.longueur - xFin, 120);
  for (let k = 0; k < fin.profil.rayons.length; k++) {
    const x = Math.floor(k / BRUT.secteurs) * BRUT.pas;
    if (x >= xFin) proche(fin.profil.rayons[k], 18);
    if (x <= 22.5) proche(fin.profil.rayons[k], 20);
    proche(fin.profil.rayons[k], rapide.profil.rayons[k]);
  }
  proche(fin.profil.volume, rapide.profil.volume);
  const couronne = Math.PI * (400 - 324) * 120;
  assert.ok(fin.profil.volume >= couronne && fin.profil.volume < couronne * 1.01);
  fin.machine.elements.piece.actualiserSurface();
  const positions = fin.machine.getObjectByName("workpieceBlank").geometry.getAttribute("position");
  proche(positions.getZ(100 / BRUT.pas * BRUT.secteurs), 18);
});

test("une trajectoire qui toucherait la contre-pointe est refusée avant le démarrage", () => {
  const a = atelier();
  monter(a);
  const avant = a.axes.coupe.position();
  assert.equal(a.broche.lancerPasse(20), false);
  assert.match(a.etat.message, /Trajet bloqué.*contre-pointe/);
  assert.equal(a.etat.direction, "off");
  assert.deepEqual(a.axes.coupe.position(), avant);
  assert.equal(a.profil.volume, 0);
});

test("le porte-outil atteint la fin de course à Ø 32 et les mors arrêtent ensuite l’avance manuelle", () => {
  const a = atelier();
  monter(a);
  assert.ok(a.broche.lancerPasse(8));
  a.broche.actualiser(500);
  assert.match(a.etat.message, /Fin de la longueur usinable/);
  proche(a.profil.diametre(a.axes.coupe.finUsinable), 32);
  actionnerLevier("avance", a.etat);
  a.broche.actualiser(500);
  assert.equal(a.etat.engagement, "off");
  assert.match(a.etat.message, /Contact/);
  assert.ok(a.axes.coupe.position().x > 22.5);
  proche(a.profil.diametre(22.5), 40);
});

test("une nouvelle passe retranche la réduction au diamètre actuel", () => {
  const a = atelier();
  monter(a);
  const { broche, axes, profil, etat } = a;
  assert.ok(broche.lancerPasse(4));
  broche.actualiser(500);
  reglerDirection("off", etat);
  assert.ok(axes.regler("transversalX", 22));
  assert.ok(axes.regler("trainardZ", 590));
  assert.ok(axes.regler("transversalX", 18));
  assert.ok(broche.lancerPasse(2));
  broche.actualiser(500);
  proche(profil.diametre(100), 34);
  proche(profil.diametre(150), 34);
});

test("un arrêt d’urgence en coupe immobilise le traînard et préserve le profil", () => {
  const a = atelier();
  monter(a);
  const { broche, etat, profil } = a;
  assert.ok(broche.lancerPasse(4));
  broche.actualiser(60);
  const avant = profil.volume, position = etat.trainardZ;
  assert.ok(avant > 0);
  actionnerLevier("arret", etat);
  broche.actualiser(10);
  assert.equal(etat.passe, null);
  assert.equal(etat.direction, "off");
  proche(profil.volume, avant);
  proche(etat.trainardZ, position);
});

test("le volant et la barre restent utilisables en chariotage manuel", () => {
  const { etat, axes, broche, profil } = atelier();
  actionnerLevier("direction", etat);
  assert.ok(axes.regler("transversalX", 18));
  broche.actualiser(1);
  actionnerLevier("avance", etat);
  broche.actualiser(10 * 60 / etat.vitesse);
  proche(etat.trainardZ, 589);
  proche(etat.transversalX, 18);
  actionnerLevier("avance", etat);
  broche.actualiser(1);
  proche(profil.diametre(149), 36);
  assert.equal(etat.passe, null);
});

test("le rendu des copeaux cumule les petits volumes et cesse d'émettre en l'air", () => {
  const { machine } = atelier();
  const copeaux = creerCopeaux(machine);
  copeaux.actualiser(0.01, 0.75 * VOLUME_FRAGMENT, 200);
  assert.equal(copeaux.objet.count, 0);
  copeaux.actualiser(0.01, 2.25 * VOLUME_FRAGMENT, 200);
  assert.equal(copeaux.objet.count, 3);
  copeaux.actualiser(2, 0, 200);
  assert.equal(copeaux.objet.count, 0);
  copeaux.dispose();
});
