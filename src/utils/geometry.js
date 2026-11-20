// OUTILS DE MODÉLISATION : fonctions communes pour éviter de répéter du code.
// Toutes les dimensions et positions sont en millimètres.
// Exemple : box(parent, "socle", [200, 30, 100], [0, 15, 0], materials.paint)
// crée un bloc de 200 × 30 × 100, centré à la position (0, 15, 0).

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
// Les matériaux définissent la couleur, la brillance et la rugosité.
export const materials = {
  paint: new THREE.MeshStandardMaterial({
    color: 0x607e70,
    metalness: 0.15,
    roughness: 0.42,
  }),
  bed: new THREE.MeshStandardMaterial({
    color: 0x495455,
    metalness: 0.65,
    roughness: 0.42,
  }),
  steel: new THREE.MeshStandardMaterial({
    color: 0xb7c2c6,
    metalness: 0.85,
    roughness: 0.28,
  }),
  dark: new THREE.MeshStandardMaterial({
    color: 0x232d32,
    metalness: 0.55,
    roughness: 0.42,
  }),
  brass: new THREE.MeshStandardMaterial({
    color: 0xc4a366,
    metalness: 0.75,
    roughness: 0.3,
  }),
  carbide: new THREE.MeshStandardMaterial({
    color: 0x747b7b,
    metalness: 0.65,
    roughness: 0.36,
    transparent: false,
  }),
  red: new THREE.MeshStandardMaterial({ color: 0xae493c, roughness: 0.4 }),
};
// Donner un nom et une description à une pièce pour la retrouver facilement.
export function annotate(
  o,
  name,
  label,
  description = label,
  functionText = `Supports the ${label.toLowerCase()} assembly.`,
) {
  o.name = name;
  o.userData = { label, description, functionText };
  return o;
}
// Un groupe rassemble plusieurs pièces : il ne se voit pas lui-même.
export function group(name, label, functionText) {
  return annotate(new THREE.Group(), name, label, label, functionText);
}
// Un Mesh est la combinaison d’une forme (géométrie) et d’un matériau.
export function mesh(
  parent,
  name,
  geometry,
  material,
  pos = [0, 0, 0],
  label = name.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
  fn,
) {
  const m = annotate(
    new THREE.Mesh(geometry, material),
    name,
    label,
    label,
    fn,
  );
  m.position.set(...pos);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
// Bloc avec des arêtes légèrement arrondies : taille [X, Y, Z].
export function box(p, n, size, pos, mat = materials.paint) {
  return mesh(
    p,
    n,
    new RoundedBoxGeometry(...size, 2, Math.min(3, ...size.map((x) => x / 8))),
    mat,
    pos,
  );
}
// Cylindre : rayon, longueur, position et axe (x, y ou z).
// Si les deux rayons sont différents, on obtient un cône tronqué.
export function cylinder(
  p,
  n,
  r,
  len,
  pos,
  mat = materials.steel,
  axis = "x",
  r2 = r,
) {
  const m = mesh(p, n, new THREE.CylinderGeometry(r, r2, len, 40), mat, pos);
  if (axis === "x") m.rotation.z = -Math.PI / 2;
  if (axis === "z") m.rotation.x = Math.PI / 2;
  return m;
}
