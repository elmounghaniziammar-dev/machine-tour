import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";

import { creerMachine } from "../src/machine/Machine.js";
import { creerEtatMachine } from "../src/mecanique/EtatMachine.js";
import { creerDeplacements } from "../src/mecanique/Deplacements.js";
import { creerBroche } from "../src/mecanique/Broche.js";
import { materials } from "../src/utils/geometry.js";

const EPSILON = 1e-4;

function machineEnEtat() {
  const machine = creerMachine();
  const etat = creerEtatMachine();
  const deplacements = creerDeplacements(machine.elements, etat);
  const broche = creerBroche(machine.elements, etat, deplacements);
  return { machine, etat, deplacements, broche };
}

function limitesMonde(machine, nom) {
  const objet = machine.getObjectByName(nom);
  assert.ok(objet, `Missing machine part: ${nom}`);
  machine.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(objet, true);
}

function pasDePenetration(machine, nomA, nomB) {
  const a = limitesMonde(machine, nomA);
  const b = limitesMonde(machine, nomB);
  const profondeur = ["x", "y", "z"].map((axe) =>
    Math.min(a.max[axe], b.max[axe]) - Math.max(a.min[axe], b.min[axe]),
  );
  assert.ok(
    profondeur.some((valeur) => valeur <= EPSILON),
    `${nomA} penetrates ${nomB}: overlap ${profondeur.map((n) => n.toFixed(3)).join(", ")} mm`,
  );
}

function matriceRelative(parent, enfant) {
  parent.updateWorldMatrix(true, true);
  return parent.matrixWorld.clone().invert().multiply(enfant.matrixWorld);
}

function memesMatrices(a, b) {
  for (let i = 0; i < 16; i++)
    assert.ok(Math.abs(a.elements[i] - b.elements[i]) < 1e-8, `matrix element ${i} changed`);
}

test("initial workpiece, live center, and cutting tip touch without penetration", () => {
  const { machine } = machineEnEtat();
  const piece = limitesMonde(machine, "workpieceBlank");
  const pointe = limitesMonde(machine, "liveCenterPoint");
  assert.ok(Math.abs(piece.max.x - pointe.min.x) <= EPSILON);
  pasDePenetration(machine, "workpieceBlank", "liveCenterPoint");
  pasDePenetration(machine, "workpieceBlank", "carbideInsert");
});

test("quill and tailstock cannot push the live center into the workpiece", () => {
  const { machine, etat, deplacements } = machineEnEtat();
  etat.poupeeBloquee = false;
  assert.equal(deplacements.pointeSurPiece(), true);

  assert.equal(deplacements.regler("fourreau", 80), false);
  pasDePenetration(machine, "workpieceBlank", "liveCenterPoint");

  assert.equal(deplacements.regler("poupeeZ", 1000), true);
  assert.equal(deplacements.pointeSurPiece(), false);
  assert.equal(deplacements.regler("fourreau", 80), true);
  assert.equal(deplacements.regler("poupeeZ", 780), false);
  pasDePenetration(machine, "workpieceBlank", "liveCenterPoint");
  assert.equal(deplacements.pointeSurPiece(), true);

  const piece = limitesMonde(machine, "workpieceBlank");
  const pointe = limitesMonde(machine, "liveCenterPoint");
  assert.ok(pointe.min.x >= piece.max.x - EPSILON);
});

test("repeated sub-micron quill steps cannot bypass an existing contact", () => {
  const { machine, etat, deplacements } = machineEnEtat();

  for (let i = 0; i < 50; i++) {
    assert.equal(deplacements.regler("fourreau", etat.fourreau + 5e-7), false);
    assert.equal(etat.fourreau, 50);
  }
  assert.equal(deplacements.regler("fourreau", 80), false);
  assert.equal(etat.fourreau, 50);
  pasDePenetration(machine, "workpieceBlank", "liveCenterPoint");
});

test("the live center rotates only while it touches the workpiece", () => {
  const { machine, etat, deplacements, broche } = machineEnEtat();
  assert.equal(deplacements.regler("fourreau", 49.9), true);
  assert.equal(deplacements.pointeSurPiece(), false);
  etat.direction = "cw";
  broche.actualiser(1);
  assert.equal(machine.elements.pointe.rotation.x, 0);

  assert.equal(deplacements.regler("fourreau", 50), true);
  assert.equal(deplacements.pointeSurPiece(), true);
  broche.actualiser(1);
  assert.notEqual(machine.elements.pointe.rotation.x, 0);
});

test("carriage and tailstock bodies cannot pass through each other", () => {
  const { machine, etat, deplacements } = machineEnEtat();

  // Longitudinal travel along the stock surface remains possible before contact.
  assert.equal(deplacements.regler("trainardZ", 570), true);
  assert.equal(deplacements.regler("trainardZ", 1060), false);
  pasDePenetration(machine, "saddle", "tailstockLowerShoe");

  etat.poupeeBloquee = false;
  assert.equal(deplacements.regler("poupeeZ", 780), false);
  pasDePenetration(machine, "saddle", "tailstockLowerShoe");
});

test("cross-slide and carriage stop before the tool enters stock or live center", () => {
  const { machine, etat, deplacements } = machineEnEtat();

  assert.equal(deplacements.regler("transversalX", 0), false);
  pasDePenetration(machine, "carbideInsert", "workpieceBlank");

  etat.poupeeBloquee = false;
  assert.equal(deplacements.regler("poupeeZ", 1000), true);
  assert.equal(deplacements.regler("fourreau", 80), true);
  assert.equal(deplacements.regler("trainardZ", 800), false);
  pasDePenetration(machine, "carbideInsert", "liveCenterPoint");
});

test("angled compound slide approaches stock, stops at contact, then withdraws", () => {
  const { machine, etat, deplacements } = machineEnEtat();
  const base = machine.getObjectByName("compoundRest");
  base.rotation.y = Math.PI / 6;
  machine.updateMatrixWorld(true);

  // À 30°, la plaquette s'écarte du brut : les 2 premiers mm restent libres.
  assert.equal(deplacements.regler("petitChariot", -2), true);
  assert.equal(etat.petitChariot, -2);
  pasDePenetration(machine, "carbideInsert", "workpieceBlank");

  // Un grand geste s'arrête au premier contact, puis le retrait reste possible.
  assert.equal(deplacements.regler("petitChariot", -40), false);
  assert.ok(etat.petitChariot < -2 && etat.petitChariot > -40);
  pasDePenetration(machine, "carbideInsert", "workpieceBlank");
  assert.equal(deplacements.regler("petitChariot", 0), true);
  assert.equal(etat.petitChariot, 0);
});

test("angled compound bounds follow cross-slide before carriage travel", () => {
  const { machine, etat, deplacements } = machineEnEtat();
  machine.getObjectByName("compoundRest").rotation.y = Math.PI / 6;
  assert.equal(deplacements.regler("transversalX", 100), true);
  // La boîte de l'outil doit suivre son parent avant le geste suivant.
  assert.equal(deplacements.regler("trainardZ", 600), true);
  assert.equal(etat.trainardZ, 600);
  pasDePenetration(machine, "carbideInsert", "liveCenterPoint");
});

test("a large automatic-feed step stops at contact instead of tunneling", () => {
  const { machine, etat, broche } = machineEnEtat();
  etat.direction = "ccw";
  etat.engagement = "rod";

  broche.actualiser(1000);
  assert.equal(etat.engagement, "off");
  assert.ok(etat.trainardZ > 565 && etat.trainardZ < 1060);
  pasDePenetration(machine, "saddle", "tailstockLowerShoe");
  pasDePenetration(machine, "carbideInsert", "liveCenterPoint");
});

test("feed drives rotate only for the carriage distance actually traveled", () => {
  for (const [mode, nom, angleAttendu] of [
    ["rod", "barre", Math.PI],
    ["screw", "visMere", Math.PI / 3],
  ]) {
    const { machine, etat, deplacements, broche } = machineEnEtat();
    deplacements.regler("transversalX", 100);
    deplacements.regler("trainardZ", 600);
    const axe = machine.elements[nom];
    const avant = axe.quaternion.clone();
    etat.direction = "ccw";
    etat.engagement = mode;

    broche.actualiser(10);
    assert.equal(etat.trainardZ, 601);
    assert.equal(etat.engagement, "off");
    assert.ok(Math.abs(avant.angleTo(axe.quaternion) - angleAttendu) < EPSILON);
  }
});

test("movable assemblies retain their rigid child transforms", () => {
  const { machine, etat, deplacements, broche } = machineEnEtat();
  const paires = [
    ["spindle", "workpieceBlank"],
    ["carriage", "saddle"],
    ["tailstock", "tailstockCasting"],
    ["quill", "quillShaft"],
  ];
  const avant = paires.map(([parent, enfant]) =>
    matriceRelative(machine.getObjectByName(parent), machine.getObjectByName(enfant)),
  );

  etat.poupeeBloquee = false;
  deplacements.regler("poupeeZ", 1000);
  deplacements.regler("fourreau", 80);
  deplacements.regler("trainardZ", 600);
  etat.direction = "cw";
  broche.actualiser(1);

  paires.forEach(([parent, enfant], i) =>
    memesMatrices(
      avant[i],
      matriceRelative(machine.getObjectByName(parent), machine.getObjectByName(enfant)),
    ),
  );
});

test("all visible machine parts retain valid physically based materials", () => {
  const { machine } = machineEnEtat();
  assert.equal(machine.getObjectByName("carbideInsert").material, materials.carbide);
  let nombre = 0;
  machine.traverse((objet) => {
    if (!objet.isMesh) return;
    nombre++;
    const materiaux = Array.isArray(objet.material) ? objet.material : [objet.material];
    assert.ok(materiaux.length > 0, `${objet.name} has no material`);
    for (const materiau of materiaux) {
      assert.ok(
        materiau?.isMeshStandardMaterial || materiau?.isMeshPhysicalMaterial,
        `${objet.name} lacks a physically based surface material`,
      );
      assert.ok(Number.isFinite(materiau.metalness) && materiau.metalness >= 0 && materiau.metalness <= 1);
      assert.ok(Number.isFinite(materiau.roughness) && materiau.roughness >= 0 && materiau.roughness <= 1);
    }
  });
  assert.ok(nombre > 300, "the material check did not cover the full machine");
});
