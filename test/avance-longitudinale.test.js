import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { creerMachine } from "../src/machine/Machine.js";
import { creerEtatMachine } from "../src/mecanique/EtatMachine.js";
import { creerDeplacements } from "../src/mecanique/Deplacements.js";
import { creerBroche, vitesseAvanceLongitudinale } from "../src/mecanique/Broche.js";
import { actionnerLevier, afficherLeviers, motifBlocageAvanceLongitudinale, reglerDirection } from "../src/interactions/InteractionLevier.js";

function montage() {
  const { elements } = creerMachine();
  const etat = creerEtatMachine();
  const axes = creerDeplacements(elements, etat);
  return { elements, etat, axes, broche: creerBroche(elements, etat, axes) };
}

function proche(obtenu, attendu) {
  assert.ok(Math.abs(obtenu - attendu) < 1e-8, `${obtenu} au lieu de ${attendu}`);
}

test("le levier part de la position courante, avance dans le vide puis usine au diamètre du volant", () => {
  for (const depart of [580, 560]) {
    const { etat, axes, broche } = montage();
    assert.ok(axes.regler("trainardZ", depart));
    reglerDirection("ccw", etat);
    actionnerLevier("avance", etat);
    broche.actualiser(60 / etat.vitesse);
    proche(etat.trainardZ, depart - etat.avance);
    proche(axes.coupe.profil.volume, 0);
    actionnerLevier("avance", etat);
    assert.ok(axes.regler("transversalX", 18));
    broche.actualiser(60 / etat.vitesse);
    const debut = axes.coupe.position().x;
    actionnerLevier("avance", etat);
    broche.actualiser(50 * 60 / etat.vitesse);
    proche(axes.coupe.position().x, debut - 50 * etat.avance);
    proche(axes.coupe.profil.diametre(debut - 2), 36);
    assert.ok(axes.coupe.profil.volume > 0);
    actionnerLevier("avance", etat);
    const arret = etat.trainardZ;
    broche.actualiser(1);
    proche(etat.trainardZ, arret);
    assert.equal(etat.direction, "ccw");
  }
});

test("un levier enclenché à l’arrêt attend la broche puis entraîne la pointe de l’outil à f mm par tour", () => {
  const { elements, etat, broche } = montage();
  etat.vitesse = 250;
  etat.avance = 0.16;
  const position = () => elements.bec.getWorldPosition(new Vector3());
  const depart = position();
  const rotation = elements.broche.rotation.x;
  afficherLeviers(elements, etat);
  const levierAuRepos = elements.levierAvance.rotation.z;
  assert.ok(actionnerLevier("avance", etat));
  afficherLeviers(elements, etat);
  assert.notEqual(elements.levierAvance.rotation.z, levierAuRepos);
  assert.equal(vitesseAvanceLongitudinale(etat), 0);
  broche.actualiser(30);
  assert.deepEqual(position(), depart);
  reglerDirection("ccw", etat);
  assert.equal(vitesseAvanceLongitudinale(etat), -40);
  // Cinq quarts de tour, répartis sur des images de durées différentes.
  for (const dt of [0.02, 0.08, 0.2]) broche.actualiser(dt);
  const fin = position();
  proche(fin.x - depart.x, -1.25 * 0.16);
  proche(fin.y, depart.y);
  proche(fin.z, depart.z);
  proche(elements.broche.rotation.x - rotation, Math.PI / 2);
  assert.ok(actionnerLevier("avance", etat));
  afficherLeviers(elements, etat);
  assert.equal(elements.levierAvance.rotation.z, levierAuRepos);
  assert.equal(vitesseAvanceLongitudinale(etat), 0);
  broche.actualiser(0.12);
  assert.deepEqual(position(), fin);
  proche(elements.broche.rotation.x, 1.5 * Math.PI);
  assert.equal(etat.direction, "ccw");

  reglerDirection("off", etat);
  reglerDirection("cw", etat);
  etat.avance = 0.32;
  actionnerLevier("avance", etat);
  assert.equal(vitesseAvanceLongitudinale(etat), 80);
  broche.actualiser(60 / etat.vitesse);
  proche(position().x - fin.x, 0.32);
});

test("la barre et les demi-noix ont des enclenchements mutuellement exclusifs", () => {
  const etat = creerEtatMachine();
  actionnerLevier("demiNoix", etat);
  assert.match(motifBlocageAvanceLongitudinale(etat), /demi-noix/);
  assert.equal(actionnerLevier("avance", etat), false);
  assert.equal(etat.engagement, "screw");
  actionnerLevier("demiNoix", etat);
  assert.ok(actionnerLevier("avance", etat));
  assert.equal(actionnerLevier("demiNoix", etat), false);
  assert.equal(etat.engagement, "rod");
  actionnerLevier("arret", etat);
  assert.equal(actionnerLevier("avance", etat), false);
  assert.equal(etat.engagement, "off");
});

test("débrayer une passe au levier rend la main même en cas de réembrayage entre deux images", () => {
  const { etat, axes, broche } = montage();
  axes.regler("transversalX", 20);
  axes.regler("fourreau", etat.fourreau + axes.ecartPointe());
  actionnerLevier("verrouFourreau", etat);
  assert.ok(broche.lancerPasse(4));
  assert.equal(actionnerLevier("avance", etat), false);
  broche.actualiser(100 * 60 / etat.vitesse);
  assert.equal(etat.engagement, "rod");
  assert.equal(actionnerLevier("avance", etat), true);
  assert.equal(etat.passe, null);
  const depart = etat.trainardZ;
  assert.ok(actionnerLevier("avance", etat));
  broche.actualiser(60 / etat.vitesse);
  proche(etat.trainardZ - depart, -etat.avance);
  assert.equal(etat.engagement, "rod");
  assert.equal(etat.passe, null);
});
