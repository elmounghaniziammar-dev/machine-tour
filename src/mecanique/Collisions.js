import * as THREE from "three";
import { CENTRAGE } from "./ProfilPiece.js";

// Les pièces guidées restent rigides : chaque commande translate un groupe entier.
// On conserve une boîte par maillage, puis on cherche le premier contact sur l'axe
// du geste. Les ajustements internes (banc/trainard, fourreau/poupée) sont exclus.
const EPSILON = 1e-6;

function estDans(objet, parent) {
  for (let courant = objet; courant; courant = courant.parent)
    if (courant === parent) return true;
  return false;
}

function maillages(groupe) {
  const objets = [];
  groupe.traverse((objet) => {
    if (objet.isMesh) objets.push(objet);
  });
  return objets;
}

export function creerCollisions(elements, etat, coupe) {
  const reference = {
    trainardZ: etat.trainardZ,
    transversalX: etat.transversalX,
    petitChariot: etat.petitChariot,
    poupeeZ: etat.poupeeZ,
    fourreau: etat.fourreau,
  };
  const centreBroche = elements.broche.getWorldPosition(new THREE.Vector3());
  const groupes = {
    fixe: elements.broche.parent,
    trainard: elements.trainard,
    poupee: elements.poupee,
  };

  function creerBoite(objet, corps) {
    objet.updateWorldMatrix(true, false);
    const boite = new THREE.Box3().setFromObject(objet);
    let rayonBalaye = null;
    // Les mors tournent autour de X. Leur enveloppe circulaire empêche de
    // placer un chariot sur leur trajectoire entre deux images d'animation.
    // Le brut est déjà un cylindre de révolution : sa boîte initiale est exacte.
    if (
      corps === "fixe" &&
      estDans(objet, elements.broche) &&
      objet.name !== "workpieceBlank"
    ) {
      const sommets = objet.geometry.getAttribute("position");
      const point = new THREE.Vector3();
      let rayon = 0;
      for (let i = 0; i < sommets.count; i++) {
        point.fromBufferAttribute(sommets, i).applyMatrix4(objet.matrixWorld);
        rayon = Math.max(rayon, Math.hypot(point.y - centreBroche.y, point.z - centreBroche.z));
      }
      rayonBalaye = rayon;
      boite.min.y = centreBroche.y - rayon;
      boite.max.y = centreBroche.y + rayon;
      boite.min.z = centreBroche.z - rayon;
      boite.max.z = centreBroche.z + rayon;
    }
    return {
      objet,
      id: objet.name,
      nom: ({ carbideInsert: "plaquette", toolShank: "corps de l’outil",
        liveCenterPoint: "contre-pointe", workpieceBlank: "pièce" })[objet.name] ||
        (objet.name.startsWith("jawGrippingStep") ? "mors" : objet.userData.label || objet.name),
      min: boite.min.toArray(),
      max: boite.max.toArray(),
      corps,
      rayonBalaye,
      transversal: estDans(objet, elements.transversal),
      superieur: estDans(objet, elements.chariotSuperieur),
      fourreau: estDans(objet, elements.fourreau),
    };
  }

  const boites = Object.fromEntries(
    Object.entries(groupes).map(([nom, groupe]) => [
      nom,
      maillages(groupe).flatMap((objet) => {
        const b = creerBoite(objet, nom);
        if (b.id !== "liveCenterPoint") return [b];
        // Enveloppe du cône par tranches de 1 mm, valable même à fourreau mobile.
        const n = Math.ceil(b.max[0] - b.min[0]);
        return Array.from({ length: n }, (_, i) => {
          const pas = (b.max[0] - b.min[0]) / n;
          const r = (i + 1) * pas * CENTRAGE.pente;
          return { ...b, min: [b.min[0] + i * pas, centreBroche.y - r, centreBroche.z - r],
            max: [b.min[0] + (i + 1) * pas, centreBroche.y + r, centreBroche.z + r] };
        });
      }),
    ]),
  );
  const mobiles = {
    trainardZ: boites.trainard,
    transversalX: boites.trainard.filter((boite) => boite.transversal),
    petitChariot: boites.trainard.filter((boite) => boite.superieur),
    poupeeZ: boites.poupee,
    fourreau: boites.poupee.filter((boite) => boite.fourreau),
  };
  const axes = {
    trainardZ: [0, 1],
    transversalX: [2, 1],
    petitChariot: [0, 1],
    poupeeZ: [0, 1],
    fourreau: [0, -1],
  };

  function baseOrientee() {
    // Le petit chariot pivote autour de Y sur sa semelle fixe.
    return Math.abs(elements.chariotSuperieur.parent.rotation.y) > EPSILON;
  }

  function boiteActuelle(boite, pose = etat) {
    // La base du petit chariot peut tourner : sa boîte doit suivre sa vraie pose.
    if (boite.superieur && baseOrientee()) {
      boite.objet.updateWorldMatrix(true, false);
      const actuelle = new THREE.Box3().setFromObject(boite.objet);
      actuelle.translate(new THREE.Vector3(pose.trainardZ - etat.trainardZ, 0, pose.transversalX - etat.transversalX));
      return { min: actuelle.min.toArray(), max: actuelle.max.toArray() };
    }
    const dx =
      (boite.corps === "trainard"
        ? pose.trainardZ - reference.trainardZ
        : boite.corps === "poupee"
          ? etat.poupeeZ - reference.poupeeZ
          : 0) -
      (boite.fourreau ? etat.fourreau - reference.fourreau : 0) +
      (boite.superieur ? etat.petitChariot - reference.petitChariot : 0);
    const dz =
      (boite.transversal ? pose.transversalX - reference.transversalX : 0);
    return {
      min: [boite.min[0] + dx, boite.min[1], boite.min[2] + dz],
      max: [boite.max[0] + dx, boite.max[1], boite.max[2] + dz],
    };
  }

  function chevauchementHorsAxe(a, b, axe) {
    for (let i = 0; i < 3; i++) {
      if (i === axe) continue;
      if (
        Math.min(a.max[i], b.max[i]) - Math.max(a.min[i], b.min[i]) <=
        EPSILON
      )
        return false;
    }
    return true;
  }

  // Cherche le premier contact des boîtes sur une trajectoire oblique.
  function fractionContact(a, b, delta) {
    let entree = -Infinity;
    let sortie = Infinity;
    for (let i = 0; i < 3; i++) {
      const mouvement = delta.getComponent(i);
      if (Math.abs(mouvement) < 1e-12) {
        if (
          Math.min(a.max[i], b.max[i]) - Math.max(a.min[i], b.min[i]) <=
          EPSILON
        )
          return null;
        continue;
      }
      const t1 = (b.min[i] - a.max[i]) / mouvement;
      const t2 = (b.max[i] - a.min[i]) / mouvement;
      entree = Math.max(entree, Math.min(t1, t2));
      sortie = Math.min(sortie, Math.max(t1, t2));
      if (entree > sortie) return null;
    }
    if (sortie <= 0 || entree >= 1) return null;
    if (entree >= 0) return entree;

    // Si deux boîtes se recouvrent déjà, on permet le mouvement de retrait.
    let versObstacle = 0;
    for (let i = 0; i < 3; i++) {
      const centreA = (a.min[i] + a.max[i]) / 2;
      const centreB = (b.min[i] + b.max[i]) / 2;
      versObstacle += (centreB - centreA) * delta.getComponent(i);
    }
    return versObstacle > 0 ? 0 : null;
  }

  function contactDeCoupe(mobile, obstacle, enPasse = false) {
    return mobile.id === "carbideInsert" && obstacle.id === "workpieceBlank" &&
      (enPasse || coupe.active() || coupe.profil.volume > 0);
  }

  function bornerPetitChariot(depart, demande, obstacles) {
    const base = elements.chariotSuperieur.parent;
    base.updateWorldMatrix(true, false);
    const delta = new THREE.Vector3(1, 0, 0)
      .transformDirection(base.matrixWorld)
      .multiplyScalar(demande - depart);
    let libre = 1;
    let contact = null;
    for (const mobile of mobiles.petitChariot) {
      const a = boiteActuelle(mobile);
      for (const obstacle of obstacles) {
        if (contactDeCoupe(mobile, obstacle.objet)) continue;
        const fraction = fractionContact(a, obstacle.bounds, delta);
        if (fraction !== null && fraction < libre) {
          libre = Math.max(0, fraction);
          contact = `${mobile.nom} / ${obstacle.objet.nom}`;
        }
      }
    }
    return { position: depart + (demande - depart) * libre, contact };
  }

  // La distance au premier contact est mesurée depuis la position actuelle.
  // Un grand mouvement de souris ne peut donc pas traverser puis ressortir d'un objet.
  function borner(axe, demande, pose = etat) {
    const depart = pose[axe];
    const amplitude = Math.abs(demande - depart);
    if (amplitude === 0) return { position: demande, contact: null };

    const fixes =
      axe === "poupeeZ" || axe === "fourreau"
        ? [...boites.fixe, ...boites.trainard]
        : [...boites.fixe, ...boites.poupee];
    const obstacles = fixes.map((boite) => ({
      objet: boite,
      bounds: boiteActuelle(boite, pose),
    }));
    if (axe === "petitChariot" && baseOrientee())
      return bornerPetitChariot(depart, demande, obstacles);

    const [dimension, sensAxe] = axes[axe];
    const sens = Math.sign(demande - depart) * sensAxe;
    let libre = amplitude;
    let contact = null;

    for (const mobile of mobiles[axe]) {
      const a = boiteActuelle(mobile, pose);
      for (const obstacle of obstacles) {
        if (contactDeCoupe(mobile, obstacle.objet, pose !== etat)) continue;
        let b = obstacle.bounds;
        if (mobile.id === "liveCenterPoint" && obstacle.objet.id === "workpieceBlank") {
          // Le sommet entre dans le centre déjà percé. Les deux cônes de 60°
          // s'appuient lorsque le sommet atteint le fond de cette portée.
          b = { min: b.min, max: [b.max[0] - CENTRAGE.profondeur, b.max[1], b.max[2]] };
        }
        if (dimension === 0 && obstacle.objet.rayonBalaye !== null) {
          const ry = Math.max(0, a.min[1] - centreBroche.y, centreBroche.y - a.max[1]);
          const rz = Math.max(0, a.min[2] - centreBroche.z, centreBroche.z - a.max[2]);
          if (Math.hypot(ry, rz) >= obstacle.objet.rayonBalaye) continue;
        }
        if (!chevauchementHorsAxe(a, b, dimension)) continue;
        let ecart =
          sens > 0
            ? a.max[dimension] <= b.min[dimension] + EPSILON
              ? b.min[dimension] - a.max[dimension]
              : null
            : a.min[dimension] >= b.max[dimension] - EPSILON
              ? a.min[dimension] - b.max[dimension]
              : null;
        // Si un état externe a déjà placé deux boîtes en intersection,
        // interdire au moins de pousser plus loin vers le centre de l'obstacle.
        if (
          ecart === null &&
          a.min[dimension] < b.max[dimension] &&
          a.max[dimension] > b.min[dimension]
        ) {
          const centreA = (a.min[dimension] + a.max[dimension]) / 2;
          const centreB = (b.min[dimension] + b.max[dimension]) / 2;
          if ((centreB - centreA) * sens > 0) ecart = 0;
        }
        if (ecart !== null && ecart < libre) {
          libre = Math.max(0, ecart);
          contact = `${mobile.nom} / ${obstacle.objet.nom}`;
        }
      }
    }
    return {
      position: contact === null ? demande : depart + Math.sign(demande - depart) * libre,
      contact,
    };
  }

  const brut = boites.fixe.find((boite) => boite.id === "workpieceBlank");
  const pointe = boites.poupee.find((boite) => boite.id === "liveCenterPoint");
  if (!brut || !pointe)
    throw new Error("Missing workpiece or live-center collision mesh");
  const ecartPointe = () => boiteActuelle(pointe).min[0] - (brut.max[0] - CENTRAGE.profondeur);
  const pointeSurPiece = () => Math.abs(ecartPointe()) <= EPSILON;

  function bornerAvecProfil(axe, demande) {
    const limite = borner(axe, demande);
    if (coupe.active() || coupe.profil.volume === 0 ||
        axe === "poupeeZ" || axe === "fourreau") return limite;
    const depart = etat[axe];
    const d = limite.position - depart;
    const angle = elements.chariotSuperieur.parent.rotation.y;
    const dx = axe === "trainardZ" ? d : axe === "petitChariot" ? d * Math.cos(angle) : 0;
    const dz = axe === "transversalX" ? d : axe === "petitChariot" ? -d * Math.sin(angle) : 0;
    const fraction = coupe.fractionObstacle(dx, dz);
    if (fraction === 1) return limite;
    return { position: depart + d * fraction, contact: "plaquette / pièce usinée" };
  }
  // Vérifier les jeux aux poses successives sans déplacer la machine ni toucher au brut.
  function obstacleSurTrajet(phases) {
    const pose = { ...etat };
    for (const { axe, cible } of phases) {
      if (!axe) continue;
      const { contact } = borner(axe, cible, pose);
      if (contact) return contact;
      pose[axe] = cible;
    }
    return null;
  }
  return { borner: bornerAvecProfil, obstacleSurTrajet, pointeSurPiece, ecartPointe };
}
