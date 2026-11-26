import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";

import { creerMachine } from "../src/machine/Machine.js";
import { creerEtatMachine, VITESSES } from "../src/mecanique/EtatMachine.js";
import { creerDeplacements } from "../src/mecanique/Deplacements.js";
import { creerBroche } from "../src/mecanique/Broche.js";
import { actionnerLevier, afficherLeviers, reglerDirection } from "../src/interactions/InteractionLevier.js";
import { afficherSelecteurs, reglerVitesseIndex } from "../src/interactions/InteractionSelecteur.js";
import { commencerRotation } from "../src/interactions/InteractionVolant.js";

const EPSILON = 1e-6;

function preparer() {
  const machine = creerMachine();
  const etat = creerEtatMachine();
  const deplacements = creerDeplacements(machine.elements, etat);
  const broche = creerBroche(machine.elements, etat, deplacements);
  return { machine, etat, deplacements, broche };
}

function positionMonde(objet) {
  objet.updateWorldMatrix(true, false);
  return objet.getWorldPosition(new THREE.Vector3());
}

function proche(reel, attendu, message) {
  assert.ok(Math.abs(reel - attendu) < EPSILON, `${message}: ${reel} au lieu de ${attendu}`);
}

test("un geste circulaire reste continu au passage de 180 degrés", () => {
  const volant = new THREE.Group();
  function rayon(degres) {
    const angle = THREE.MathUtils.degToRad(degres);
    return new THREE.Ray(
      new THREE.Vector3(30 * Math.cos(angle), 30 * Math.sin(angle), 100),
      new THREE.Vector3(0, 0, -1),
    );
  }
  const geste = commencerRotation(volant, rayon(170));
  assert.ok(geste);
  proche(geste.tourner(rayon(179)), THREE.MathUtils.degToRad(9), "premier secteur");
  proche(geste.tourner(rayon(-179)), THREE.MathUtils.degToRad(2), "passage du demi-tour");
  proche(geste.tourner(rayon(-170)), THREE.MathUtils.degToRad(9), "dernier secteur");
});

test("le levier de broche montre trois positions et impose l'arrêt avant l'inversion", () => {
  const { machine, etat } = preparer();
  const angles = [];
  for (const position of ["cw", "off", "ccw"]) {
    reglerDirection(position, etat);
    assert.equal(etat.direction, position);
    afficherLeviers(machine.elements, etat);
    angles.push(machine.elements.levierDirection.rotation.z);
  }
  assert.equal(new Set(angles).size, 3);

  reglerDirection("cw", etat); // Depuis ccw, le premier geste passe par l'arrêt.
  assert.equal(etat.direction, "off");
  reglerDirection("cw", etat);
  assert.equal(etat.direction, "cw");
  reglerDirection("ccw", etat);
  assert.equal(etat.direction, "off");
  reglerDirection("ccw", etat);
  assert.equal(etat.direction, "ccw");
});

test("les régimes lisibles sur la plaque SN 40 restent bloqués lorsque la broche tourne", () => {
  const { machine, etat } = preparer();
  assert.deepEqual(VITESSES, [22.4, 31.5, 45, 63, 90, 125, 180, 250, 355, 500, 710, 1000, 1400, 2000]);
  assert.equal(machine.getObjectByName("sn40Cell5_1").userData.label, "-");
  const afficheur = machine.getObjectByName("selectorNumber0");
  assert.ok(machine.getObjectByName("selectorNumber0Digit0A"));
  const angles = [];
  for (let index = 0; index < VITESSES.length; index++) {
    reglerVitesseIndex(index, etat);
    assert.equal(etat.vitesse, VITESSES[index]);
    afficherSelecteurs(machine.elements, etat);
    angles.push(machine.elements.selecteurVitesse.rotation.z);
    const visibles = afficheur.children.filter((chiffres) => chiffres.visible);
    assert.ok(visibles.length > 0);
    assert.ok(visibles.every((chiffres) => chiffres.userData.rpm === etat.vitesse));
  }
  assert.equal(new Set(angles).size, VITESSES.length);
  reglerDirection("cw", etat);
  reglerVitesseIndex(0, etat);
  assert.equal(etat.vitesse, 2000);
});

test("l'arrêt d'urgence reste engagé, coupe la marche et exige un réarmement", () => {
  const { machine, etat, broche } = preparer();
  reglerDirection("cw", etat);
  actionnerLevier("avance", etat);
  actionnerLevier("arret", etat);
  assert.equal(etat.urgence, true);
  assert.equal(etat.direction, "off");
  assert.equal(etat.engagement, "off");
  afficherLeviers(machine.elements, etat);
  const enfonce = machine.elements.arret.position.z;
  reglerDirection("cw", etat);
  assert.equal(etat.direction, "off");
  const angle = machine.elements.broche.rotation.x;
  broche.actualiser(1);
  assert.equal(machine.elements.broche.rotation.x, angle);

  actionnerLevier("arret", etat);
  assert.equal(etat.urgence, false);
  assert.equal(etat.direction, "off");
  afficherLeviers(machine.elements, etat);
  assert.notEqual(machine.elements.arret.position.z, enfonce);
  reglerDirection("cw", etat);
  assert.equal(etat.direction, "cw");
});

test("les verrous empêchent le glissement de la poupée et la sortie du fourreau", () => {
  const { etat, deplacements } = preparer();
  assert.equal(deplacements.regler("poupeeZ", 900), false);
  assert.equal(etat.poupeeZ, 826);
  actionnerLevier("verrouPoupee", etat);
  assert.equal(etat.poupeeBloquee, false);
  assert.equal(deplacements.regler("poupeeZ", 900), true);
  actionnerLevier("verrouPoupee", etat);
  assert.equal(deplacements.regler("poupeeZ", 910), false);
  assert.equal(etat.poupeeZ, 900);

  actionnerLevier("verrouFourreau", etat);
  assert.equal(etat.fourreauBloque, true);
  assert.equal(deplacements.regler("fourreau", 40), false);
  assert.equal(etat.fourreau, 42);
  actionnerLevier("verrouFourreau", etat);
  assert.equal(deplacements.regler("fourreau", 40), true);
  assert.equal(etat.fourreau, 40);
  assert.equal(deplacements.regler("fourreau", 90), false);
  assert.equal(etat.fourreau, 80);
});

test("chaque déplacement suit le bon parent et l'axe local du petit chariot", () => {
  const { machine, etat, deplacements } = preparer();
  const e = machine.elements;
  const outil = machine.getObjectByName("carbideInsert");
  const semelle = machine.getObjectByName("compoundSwivelBase");
  const selle = machine.getObjectByName("saddle");

  const outilAvant = positionMonde(outil);
  const selleAvant = positionMonde(selle);
  assert.equal(deplacements.regler("trainardZ", etat.trainardZ + 5), true);
  proche(positionMonde(outil).x - outilAvant.x, 5, "outil avec traînard");
  proche(positionMonde(selle).x - selleAvant.x, 5, "selle avec traînard");

  const outilTransversal = positionMonde(outil);
  const selleTransversal = positionMonde(selle);
  assert.equal(deplacements.regler("transversalX", etat.transversalX + 5), true);
  proche(positionMonde(outil).z - outilTransversal.z, 5, "outil avec transversal");
  proche(positionMonde(selle).z - selleTransversal.z, 0, "selle fixe au transversal");

  // La rotation de la base oriente l'axe local du coulisseau supérieur.
  const base = machine.getObjectByName("compoundRest");
  base.rotation.y = Math.PI / 6;
  const outilPetit = positionMonde(outil);
  const semelleAvant = positionMonde(semelle);
  const axeLocal = new THREE.Vector3(1, 0, 0).applyQuaternion(base.getWorldQuaternion(new THREE.Quaternion()));
  etat.petitChariot = 5;
  deplacements.actualiser();
  const delta = positionMonde(outil).sub(outilPetit);
  proche(delta.x, axeLocal.x * 5, "outil sur l'axe local X");
  proche(delta.z, axeLocal.z * 5, "outil sur l'axe local Z");
  proche(positionMonde(semelle).distanceTo(semelleAvant), 0, "semelle fixe");
});
