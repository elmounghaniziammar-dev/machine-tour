import test from "node:test";
import assert from "node:assert/strict";
import { Matrix4, Vector3 } from "three";
import { creerMachine } from "../src/machine/Machine.js";
import { creerEtatMachine } from "../src/mecanique/EtatMachine.js";
import { creerDeplacements } from "../src/mecanique/Deplacements.js";
import { creerBroche } from "../src/mecanique/Broche.js";
import { PAS, TAMBOUR_TRANSVERSAL } from "../src/mecanique/Limites.js";

function montage() {
  const machine = creerMachine();
  const etat = creerEtatMachine();
  const axes = creerDeplacements(machine.elements, etat);
  return { machine, etat, axes };
}

function proche(reel, attendu) {
  assert.ok(Math.abs(reel - attendu) < 1e-8, `${reel} au lieu de ${attendu}`);
}

function verifierTrait(machine, division) {
  const traits = machine.getObjectByName("crossDialGraduations");
  const trait = new Matrix4();
  traits.getMatrixAt(division, trait);
  const pos = traits.localToWorld(new Vector3().setFromMatrixPosition(trait));
  const repere = machine.elements.repereTambour.getWorldPosition(new Vector3());
  const centre = machine.elements.tambourTransversal.getWorldPosition(new Vector3());
  assert.ok(Math.abs(pos.x - repere.x) < 1e-5);
  assert.ok(pos.y > centre.y);
}

test("les graduations sous l’index suivent la course radiale signée, y compris sur plusieurs tours", () => {
  const { machine, etat, axes } = montage();
  assert.equal(machine.getObjectByName("crossDialGraduations").count, TAMBOUR_TRANSVERSAL.divisions);
  assert.ok(axes.regler("transversalX", 50));
  axes.mettreTambourAZero();
  const angleInitial = machine.elements.volantTransversal.rotation.z;
  const rayonInitial = axes.coupe.position().r;
  for (const [deplacement, division] of [[0.05, 1], [1, 20], [5, 0], [11.25, 25], [-0.05, 99], [-5, 0]]) {
    assert.ok(axes.regler("transversalX", etat.zeroTambour - deplacement));
    const lecture = axes.lireTambour();
    proche(lecture.deplacement, rayonInitial - axes.coupe.position().r);
    proche(lecture.deplacement, deplacement);
    proche(lecture.lecture, division * TAMBOUR_TRANSVERSAL.mmParDivision);
    proche(lecture.division, division);
    proche(machine.elements.volantTransversal.rotation.z - angleInitial,
      -deplacement / PAS.transversalX * 2 * Math.PI);
    verifierTrait(machine, division);
  }
});

test("la mise à zéro tourne seulement la bague et conserve la position de tangence", () => {
  const { machine, etat, axes } = montage();
  axes.regler("transversalX", 0); // Le brut intercepte le bec à 20 mm de l’axe.
  proche(axes.lireTambour().deplacement, 2);
  verifierTrait(machine, 40);
  const angle = machine.elements.volantTransversal.rotation.z;
  const position = axes.coupe.position();
  const repere = machine.elements.repereTambour.getWorldPosition(new Vector3());
  etat.direction = "ccw"; // La rotation indépendante de la pièce n’entraîne pas le transversal.
  assert.ok(axes.peutMettreTambourAZero());
  assert.ok(axes.mettreTambourAZero());
  assert.deepEqual(axes.lireTambour(), { deplacement: 0, lecture: 0, division: 0 });
  assert.equal(machine.elements.volantTransversal.rotation.z, angle);
  assert.deepEqual(axes.coupe.position(), position);
  assert.deepEqual(machine.elements.repereTambour.getWorldPosition(new Vector3()), repere);
  verifierTrait(machine, 0);
});

test("la passe guidée garde le zéro et le tambour suit sa prise de profondeur", () => {
  const { machine, etat, axes } = montage();
  const broche = creerBroche(machine.elements, etat, axes);
  axes.regler("transversalX", 20);
  axes.mettreTambourAZero();
  axes.regler("fourreau", etat.fourreau + axes.ecartPointe());
  etat.fourreauBloque = true;
  assert.ok(broche.lancerPasse(4));
  broche.actualiser(80 * 60 / etat.vitesse);
  assert.equal(axes.peutMettreTambourAZero(), false);
  assert.equal(axes.mettreTambourAZero(), false);
  proche(axes.lireTambour().deplacement, 2);
  proche(axes.coupe.position().r, 18);
  verifierTrait(machine, 40);
  broche.arreterPasse();
  assert.ok(axes.peutMettreTambourAZero());
});
