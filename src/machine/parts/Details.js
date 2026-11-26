// DÉTAILS : fonctions réutilisables pour les boulons et les plaques.
// Les chiffres sont dessinés avec de petites barres, comme un afficheur.

import * as THREE from "three";
import { Font } from "three/addons/loaders/FontLoader.js";
import policePlaque from "three/examples/fonts/helvetiker_regular.typeface.json" with { type: "json" };
import { box, cylinder, group, mesh, materials } from "../../utils/geometry.js";
const police = new Font(policePlaque);
const encreClaire = new THREE.MeshStandardMaterial({
  color: 0xf5efda, roughness: 0.85, metalness: 0,
});

// Lettrage plan sur la face avant. Les dimensions et le centrage sont en mm.
export function inscription(plaque, nom, texte, position, hauteur) {
  const trace = new THREE.ShapeGeometry(police.generateShapes(texte, hauteur), 3);
  trace.center();
  const lettres = mesh(plaque, nom, trace, encreClaire, position, texte);
  lettres.castShadow = false;
  return lettres;
}
export function bolt(p, n, pos, axis = "y", r = 4) {
  const g = group(
    n,
    "Hexagonal fixing bolt",
    "Secures the adjoining mechanical components.",
  );
  g.position.set(...pos);
  p.add(g);
  cylinder(g, `${n}Washer`, r * 1.45, 1.5, [0, 0, 0], materials.steel, axis);
  const head = mesh(
    g,
    `${n}Head`,
    new THREE.CylinderGeometry(r, r, r * 0.9, 6),
    materials.steel,
  );
  if (axis === "x") {
    head.rotation.z = -Math.PI / 2;
    head.position.x = r * 0.45;
  } else if (axis === "z") {
    head.rotation.x = Math.PI / 2;
    head.position.z = r * 0.45;
  } else head.position.y = r * 0.45;
  return g;
}
export function plate(p, n, size, pos) {
  const g = group(
    n,
    "Machine plate",
    "Identifies the machine or carries setting information.",
  );
  g.position.set(...pos);
  p.add(g);
  box(
    g,
    `${n}Border`,
    [size[0] + 3, size[1] + 3, 2],
    [0, 0, 0],
    materials.steel,
  );
  box(g, `${n}Face`, [size[0], size[1], 2], [0, 0, 1.4], materials.dark);
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      cylinder(
        g,
        `${n}Rivet${x === 1 ? "Right" : "Left"}${y === 1 ? "Top" : "Bottom"}`,
        1.4,
        1,
        [x * (size[0] / 2 - 4), y * (size[1] / 2 - 4), 3],
        materials.steel,
        "z",
      );
  return g;
}
// Construire les chiffres avec sept segments, sans police externe.
export function digits(p, n, text, pos, h = 8) {
  const g = group(
    n,
    "Engraved numerical scale",
    "Provides a visual reference for machine settings.",
  );
  g.position.set(...pos);
  p.add(g);
  const patterns = {
    0: "abcdef",
    1: "bc",
    2: "abged",
    3: "abgcd",
    4: "fgbc",
    5: "afgcd",
    6: "afgecd",
    7: "abc",
    8: "abcdefg",
    9: "abfgcd",
  };
  const segs = {
    a: [0, 0.5, 0.4, 0.07],
    b: [0.23, 0.25, 0.07, 0.4],
    c: [0.23, -0.25, 0.07, 0.4],
    d: [0, -0.5, 0.4, 0.07],
    e: [-0.23, -0.25, 0.07, 0.4],
    f: [-0.23, 0.25, 0.07, 0.4],
    g: [0, 0, 0.4, 0.07],
  };
  [...text].forEach((char, i) => {
    if (char === ".") {
      box(g, `${n}Decimal`, [h * 0.12, h * 0.12, 0.25],
        [(i - (text.length - 1) / 2) * h * 0.7, -0.45 * h, 0], materials.steel);
    }
    for (const s of patterns[char] ?? "") {
      const [x, y, w, t] = segs[s];
      box(
        g,
        `${n}Digit${i}${s.toUpperCase()}`,
        [w * h, t * h, 0.25],
        [(i - (text.length - 1) / 2) * h * 0.7 + x * h, y * h, 0],
        materials.steel,
      );
    }
  });
  return g;
}
export function taperedCasting(p, n, points, depth, pos) {
  const shape = new THREE.Shape(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
  );
  return mesh(
    p,
    n,
    new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 4,
      bevelSize: 4,
      bevelSegments: 3,
      steps: 1,
    }),
    materials.paint,
    pos,
  );
}
