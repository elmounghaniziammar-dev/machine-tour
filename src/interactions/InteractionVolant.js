import * as THREE from "three";

// Évite un saut quand l'angle passe de +180° à -180°.
export function differenceAngle(nouveau, ancien) {
  return Math.atan2(Math.sin(nouveau - ancien), Math.cos(nouveau - ancien));
}

// On projette la souris dans le plan du volant : il suit le geste circulaire.
export function commencerRotation(objet, rayon) {
  objet.updateWorldMatrix(true, false);
  const inverse = objet.matrixWorld.clone().invert();
  const centre = objet.getWorldPosition(new THREE.Vector3());
  const normale = new THREE.Vector3(0, 0, 1).transformDirection(
    objet.matrixWorld,
  );
  const plan = new THREE.Plane().setFromNormalAndCoplanarPoint(normale, centre);
  const point = new THREE.Vector3();
  function angle(ray) {
    // Une vue presque de profil ne permet pas de lire correctement le cercle.
    if (Math.abs(ray.direction.dot(normale)) < 0.08) return null;
    if (!ray.intersectPlane(plan, point)) return null;
    point.applyMatrix4(inverse);
    if (Math.hypot(point.x, point.y) < 6) return null;
    return Math.atan2(point.y, point.x);
  }
  let precedent = angle(rayon);
  if (precedent === null) return null;
  return {
    tourner(ray) {
      const suivant = angle(ray);
      if (suivant === null) return 0;
      const variation = differenceAngle(suivant, precedent);
      precedent = suivant;
      return variation;
    },
  };
}

// Pour déplacer la poupée déverrouillée : glisser sa fonte suivant le banc.
export function commencerTranslation(objet, rayon, camera, machine) {
  const axe = new THREE.Vector3(1, 0, 0).transformDirection(
    machine.matrixWorld,
  );
  const normale = camera.getWorldDirection(new THREE.Vector3());
  normale.addScaledVector(axe, -normale.dot(axe));
  if (normale.lengthSq() < 0.01) return null;
  normale.normalize();
  const plan = new THREE.Plane().setFromNormalAndCoplanarPoint(
    normale,
    objet.getWorldPosition(new THREE.Vector3()),
  );
  const debut = rayon.intersectPlane(plan, new THREE.Vector3());
  if (!debut) return null;
  const inverse = machine.matrixWorld.clone().invert();
  const xInitial = debut.clone().applyMatrix4(inverse).x;
  return {
    distance(ray) {
      const p = ray.intersectPlane(plan, new THREE.Vector3());
      return p ? p.applyMatrix4(inverse).x - xInitial : null;
    },
  };
}
