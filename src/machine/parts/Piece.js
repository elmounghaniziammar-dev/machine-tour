import * as THREE from "three";
import { group, mesh, materials } from "../../utils/geometry.js";
import { BRUT, TOUR, CENTRAGE, creerProfil } from "../../mecanique/ProfilPiece.js";

export function creerPiece() {
  const piece = group("workpiece", "Round workpiece");
  const profil = creerProfil();
  const { rayon, secteurs, pas } = BRUT;
  const { dernier, rayons } = profil;
  const flanc = rayons.length;
  const bague = flanc + 2 * (secteurs + 1);
  const taille = bague + 2 * secteurs;
  const geometrie = new THREE.BufferGeometry();
  const positions = new THREE.Float32BufferAttribute(taille * 3, 3);
  const normales = new THREE.Float32BufferAttribute(taille * 3, 3);
  const couleurs = new THREE.Float32BufferAttribute(taille * 3, 3);
  for (const [nom, attribut] of [["position", positions], ["normal", normales], ["color", couleurs]])
    geometrie.setAttribute(nom, attribut.setUsage(THREE.DynamicDrawUsage));
  const indices = [];
  const sinus = [], cosinus = [];
  for (let j = 0; j < secteurs; j++) {
    sinus.push(Math.sin(TOUR * j / secteurs));
    cosinus.push(Math.cos(TOUR * j / secteurs));
    const suivant = (j + 1) % secteurs;
    for (let i = 0; i < dernier; i++) {
      const a = i * secteurs + j, b = i * secteurs + suivant;
      indices.push(a, a + secteurs, b, b, a + secteurs, b + secteurs);
    }
  }
  // Faces indépendantes du flanc pour conserver une arête vive aux extrémités.
  for (const cote of [0, 1]) {
    const base = flanc + cote * (secteurs + 1);
    const centre = base + secteurs;
    positions.setXYZ(centre, cote * BRUT.longueur, 0, 0);
    normales.setXYZ(centre, 2 * cote - 1, 0, 0);
    couleurs.setXYZ(centre, 0.5, 0.52, 0.51);
    for (let j = 0; j < secteurs; j++) {
      const a = base + j, b = base + (j + 1) % secteurs;
      if (cote === 0) {
        indices.push(centre, a, b);
        continue;
      }
      // Face annulaire et portée conique prépercée à 60°.
      const u = bague + j, v = bague + (j + 1) % secteurs;
      const r = CENTRAGE.profondeur * CENTRAGE.pente;
      for (const k of [u, u + secteurs]) {
        positions.setXYZ(k, BRUT.longueur, r * sinus[j], r * cosinus[j]);
        couleurs.setXYZ(k, 0.45, 0.47, 0.48);
      }
      normales.setXYZ(u, 1, 0, 0);
      normales.setXYZ(u + secteurs, 0.5, -0.866 * sinus[j], -0.866 * cosinus[j]);
      positions.setXYZ(centre, BRUT.longueur - CENTRAGE.profondeur, 0, 0);
      indices.push(u, b, a, u, v, b, centre, v + secteurs, u + secteurs);
    }
  }
  geometrie.setIndex(indices);
  const acier = materials.steel.clone();
  acier.color.set(0xffffff);
  acier.vertexColors = true;
  mesh(piece, "workpieceBlank", geometrie, acier);
  const normale = new THREE.Vector3();

  function ecrire(debut, fin) {
    for (let i = debut; i <= fin; i++) {
      const gauche = Math.max(0, i - 1), droite = Math.min(dernier, i + 1);
      for (let j = 0; j < secteurs; j++) {
        const k = i * secteurs + j, r = rayons[k];
        const dy = sinus[j], dz = cosinus[j];
        const pente = (rayons[droite * secteurs + j] - rayons[gauche * secteurs + j]) /
          ((droite - gauche) * pas);
        const penteAngle = (rayons[i * secteurs + (j + 1) % secteurs] -
          rayons[i * secteurs + (j + secteurs - 1) % secteurs]) /
          (2 * TOUR / secteurs * Math.max(0.01, r));
        normale.set(-pente, dy - penteAngle * dz, dz + penteAngle * dy).normalize();
        positions.setXYZ(k, i * pas, r * dy, r * dz);
        normales.setXYZ(k, normale.x, normale.y, normale.z);
        // Le trait longitudinal du brut rend sa rotation lisible. Il disparaît à la coupe.
        const teinte = r < rayon - 1e-6 ? 0.73 : j === 4 || j === 5 ? 0.18 : 0.44;
        couleurs.setXYZ(k, teinte * 0.94, teinte, teinte * 1.02);
        if (i === 0 || i === dernier) {
          const face = flanc + (i === 0 ? 0 : secteurs + 1) + j;
          positions.setXYZ(face, i * pas, r * dy, r * dz);
          normales.setXYZ(face, i === 0 ? -1 : 1, 0, 0);
          couleurs.setXYZ(face, teinte * 0.94, teinte, teinte * 1.02);
        }
      }
    }
    for (const attribut of [positions, normales, couleurs]) {
      attribut.addUpdateRange(debut * secteurs * 3, (fin - debut + 1) * secteurs * 3);
      if (debut === 0 || fin === dernier) attribut.addUpdateRange(flanc * 3, (taille - flanc) * 3);
      attribut.needsUpdate = true;
    }
  }
  ecrire(0, dernier);
  geometrie.computeBoundingBox();
  geometrie.computeBoundingSphere();
  piece.profil = profil;
  piece.actualiserSurface = () => {
    const plage = profil.prendreModifications();
    if (plage) ecrire(Math.max(0, plage[0] - 1), Math.min(dernier, plage[1] + 1));
  };
  return piece;
}
