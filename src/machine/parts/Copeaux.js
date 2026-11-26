import * as THREE from "three";

// Un fragment visuel représente 4 mm³ de métal. Le reliquat passe à l'image
// suivante. La courbure est illustrative, la quantité vient du profil usiné.
export const VOLUME_FRAGMENT = 4;
const CAPACITE = 120;

function ruban() {
  const points = [], indices = [];
  const n = 24, longueur = 4.5, rayon = 1.45, angle = 2.8 * Math.PI;
  const largeur = 1.2;
  const epaisseur = VOLUME_FRAGMENT / (largeur * Math.hypot(longueur, rayon * angle));
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * angle;
    for (const [w, h] of [[-1,-1], [1,-1], [1,1], [-1,1]]) {
      const r = rayon + h * epaisseur / 2;
      points.push(t * longueur + w * largeur / 2, r * Math.cos(a), r * Math.sin(a));
    }
    if (i === n) continue;
    for (let j = 0; j < 4; j++) {
      const k = 4 * i + j, l = 4 * i + (j + 1) % 4;
      indices.push(k, l, k + 4, l, l + 4, k + 4);
    }
  }
  const fin = n * 4;
  indices.push(0, 2, 1, 0, 3, 2, fin, fin + 1, fin + 2, fin, fin + 2, fin + 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function creerCopeaux(machine) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x456c85, metalness: 0.74,
    roughness: 0.36, side: THREE.DoubleSide });
  const nuage = new THREE.InstancedMesh(ruban(), mat, CAPACITE);
  nuage.count = 0;
  nuage.frustumCulled = false;
  nuage.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const actifs = [];
  const pose = new THREE.Object3D(), bec = new THREE.Vector3();
  let reste = 0;
  const supports = ["compoundSlide", "crossSlideTable", "saddle", "dripTray"].map(nom => {
    const objet = machine.getObjectByName(nom);
    objet.geometry.computeBoundingBox();
    return { objet, boite: new THREE.Box3() };
  });

  function actualiser(dt, volume, vitesseSurface) {
    reste += volume;
    const nombre = Math.floor(reste / VOLUME_FRAGMENT);
    reste -= nombre * VOLUME_FRAGMENT;
    const visibles = Math.min(CAPACITE, nombre);
    if (visibles > 0) {
      const piece = machine.elements.piece;
      piece.getWorldPosition(bec);
      bec.x += piece.profil.contact.x;
      bec.z += piece.profil.contact.r;
      if (visibles + actifs.length > CAPACITE) actifs.splice(0, visibles + actifs.length - CAPACITE);
      for (let i = 0; i < visibles; i++) {
        const v = Math.max(35, vitesseSurface * (0.45 + 0.25 * Math.random()));
        actifs.push({ p: bec.clone(), v: new THREE.Vector3(-0.85 * v, 0.75 * v, 0.6 * v),
          angle: 6 * Math.random(), age: 0, premierPas: dt * i / visibles,
          auSol: false, taille: Math.cbrt(nombre / visibles) });
      }
    }
    if (!actifs.length && nuage.count === 0) return;
    for (const { objet, boite } of supports) {
      objet.updateWorldMatrix(true, false);
      boite.copy(objet.geometry.boundingBox).applyMatrix4(objet.matrixWorld);
    }
    let index = 0;
    for (let i = actifs.length - 1; i >= 0; i--) {
      const c = actifs[i];
      const pas = c.premierPas ?? dt;
      c.premierPas = null;
      c.age += pas;
      if (c.age > 1.2) { actifs.splice(i, 1); continue; }
      if (!c.auSol) {
        const y = c.p.y;
        c.p.addScaledVector(c.v, pas);
        c.p.y -= 0.5 * 9810 * pas * pas;
        c.v.y -= 9810 * pas;
        for (const { boite } of supports) {
          if (y >= boite.max.y && c.p.y <= boite.max.y &&
              c.p.x >= boite.min.x && c.p.x <= boite.max.x &&
              c.p.z >= boite.min.z && c.p.z <= boite.max.z) {
            c.p.y = boite.max.y + 1.5;
            c.auSol = true;
            break;
          }
        }
        c.angle += 12 * pas;
      }
      pose.position.copy(c.p);
      pose.rotation.set(c.angle, 0.5 * c.angle, 0.8);
      pose.scale.setScalar(c.taille);
      pose.updateMatrix();
      nuage.setMatrixAt(index++, pose.matrix);
    }
    nuage.count = index;
    nuage.instanceMatrix.needsUpdate = true;
  }
  return { objet: nuage, actualiser, dispose() { nuage.dispose(); nuage.geometry.dispose(); mat.dispose(); } };
}
