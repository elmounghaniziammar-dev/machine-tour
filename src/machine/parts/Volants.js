// VOLANTS ET LEVIERS : formes réutilisées sur plusieurs parties.
// Un volant est composé d’un anneau, de trois branches et d’une poignée.

import * as THREE from "three";
import { TAMBOUR_TRANSVERSAL, PAS } from "../../mecanique/Limites.js";
import { digits } from "./Details.js";
import {
  group,
  box,
  cylinder,
  mesh,
  materials,
  annotate,
} from "../../utils/geometry.js";
export function handwheel(name, radius) {
  const root = group(
    name,
    name.replace(/([A-Z])/g, " $1"),
    "Manual rotation drives the corresponding linear axis.",
  );
  mesh(
    root,
    `${name}Rim`,
    new THREE.TorusGeometry(radius, 4, 8, 40),
    materials.steel,
  );
  cylinder(root, `${name}Hub`, 10, 20, [0, 0, 0], materials.steel, "z");
  // Répéter la même forme trois fois autour du centre.
  for (let i = 0; i < 3; i++) {
    const s = box(
      root,
      `${name}Spoke${i}`,
      [radius, 5, 6],
      [0, 0, 0],
      materials.steel,
    );
    const a = (i * Math.PI * 2) / 3;
    s.position.set((Math.cos(a) * radius) / 2, (Math.sin(a) * radius) / 2, 0);
    s.rotation.z = a;
  }
  cylinder(root, `${name}Crank`, 6, 28, [radius, 0, 17], materials.dark, "z");
  return root;
}
export function lever(name, label, length = 40) {
  const root = group(
    name,
    label,
    "Selects a discrete mechanical control state.",
  );
  cylinder(root, `${name}Pivot`, 12, 10, [0, 0, 0], materials.steel, "z");
  cylinder(
    root,
    `${name}Stem`,
    3,
    length,
    [0, length / 2, 8],
    materials.steel,
    "y",
  );
  mesh(
    root,
    `${name}Knob`,
    new THREE.SphereGeometry(9, 12, 8),
    materials.dark,
    [0, length, 8],
  );
  return root;
}
export function crossDial() {
  const { divisions } = TAMBOUR_TRANSVERSAL;
  const root = group(
    "crossSlideDial",
    "Tambour transversal",
    "Bague graduée réglable en millimètres de déplacement radial.",
  );
  cylinder(root, "crossDialDrum", 31, 18, [0, 0, 0], materials.brass, "z");
  const ticks = annotate(
    new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      materials.dark,
      divisions,
    ),
    "crossDialGraduations",
    "Dial graduations",
    "100 engraved divisions",
    "One turn represents 5 mm radial travel.",
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < divisions; i++) {
    const angle = (i * Math.PI * 2) / divisions,
      len = i % 10 === 0 ? 7 : i % 5 === 0 ? 5 : 3;
    dummy.position.set(
      -Math.sin(angle) * (30 - len / 2),
      Math.cos(angle) * (30 - len / 2),
      9.2,
    );
    dummy.rotation.z = angle;
    dummy.scale.set(0.65, len, 0.5);
    dummy.updateMatrix();
    ticks.setMatrixAt(i, dummy.matrix);
  }
  root.add(ticks);
  // Le chiffre rejoint le repère fixe à midi après chaque millimètre de pénétration.
  for (let mm = 0; mm < PAS.transversalX; mm++) {
    const angle = mm * 2 * Math.PI / PAS.transversalX;
    const marque = digits(root, `crossDialMm${mm}`, String(mm),
      [-19 * Math.sin(angle), 19 * Math.cos(angle), 9.3], 5.5);
    marque.rotation.z = angle;
    for (const segment of marque.children) segment.material = materials.dark;
  }
  return root;
}
