// BROCHE ET MANDRIN : le mandrin possède trois mors identiques.
// On répartit les mors autour du centre avec un angle de 120 degrés.

import * as THREE from "three";
import { group, box, cylinder, mesh, materials } from "../../utils/geometry.js";
import { bolt } from "./Details.js";
import { creerPiece } from "./Piece.js";
export function creerMandrin() {
  const spindle = group(
    "spindle",
    "Spindle",
    "Horizontal support axis of the chuck and workpiece.",
  );
  spindle.position.set(310, 200, 0);
  cylinder(spindle, "spindleBearingCollar", 66, 24, [-5, 0, 0], materials.bed);
  cylinder(spindle, "spindleNose", 52, 35, [13, 0, 0]);
  // Le mandrin et ses mors appartiennent au groupe de la broche.
  const chuck = group(
    "chuck",
    "Three-jaw self-centering chuck",
    "Three stepped jaws clamp the round workpiece.",
  );
  spindle.add(chuck);
  cylinder(chuck, "chuckRearFlange", 94, 12, [35, 0, 0], materials.dark);
  cylinder(chuck, "chuckBody", 100, 63, [70, 0, 0]);
  cylinder(chuck, "chuckFace", 97, 3, [103, 0, 0], materials.steel);
  cylinder(chuck, "chuckCentralRecess", 28, 2, [105, 0, 0], materials.dark);
  for (const r of [36, 91]) {
    const ring = mesh(
      chuck,
      `chuckFaceRing${r}`,
      new THREE.TorusGeometry(r, 0.6, 4, 80),
      materials.dark,
      [105.2, 0, 0],
    );
    ring.rotation.y = Math.PI / 2;
  }
  // Répéter la même forme trois fois autour du centre.
  for (let i = 0; i < 3; i++) {
    const jaw = group(
      `chuckJaw${i}`,
      `Chuck jaw ${i + 1}`,
      "Stepped hardened steel jaw grips the workpiece.",
    );
    jaw.rotation.x = (i * Math.PI * 2) / 3;
    chuck.add(jaw);
    box(jaw, `jawGuideSlot${i}`, [2, 74, 24], [105, 60, 0], materials.dark);
    box(jaw, `jawBase${i}`, [20, 62, 22], [115, 57, 0], materials.bed);
    box(
      jaw,
      `jawMiddleStep${i}`,
      [17, 35, 21],
      [132, 43.5, 0],
      materials.steel,
    );
    box(
      jaw,
      `jawGrippingStep${i}`,
      [17, 14, 21],
      [144, 27, 0],
      materials.steel,
    );
    for (let j = 0; j < 5; j++)
      box(
        jaw,
        `jawSerration${i}Tooth${j}`,
        [0.8, 45, 0.7],
        [126, 38 + j * 7, 10.9],
        materials.dark,
      );
    cylinder(
      jaw,
      `chuckKeySocketRim${i}`,
      9,
      3,
      [70, 100, 0],
      materials.dark,
      "y",
    );
    box(jaw, `chuckKeySquare${i}`, [8, 1, 8], [70, 102, 0], materials.bed);
    bolt(jaw, `chuckFaceBolt${i}`, [106, 73, 30], "x", 4);
  }
  const workpiece = creerPiece();
  workpiece.position.x = 130;
  spindle.add(workpiece);
  return { spindle, workpiece };
}
