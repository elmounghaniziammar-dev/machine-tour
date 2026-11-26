import * as THREE from "three";
import { BRUT, PLAQUETTE } from "./ProfilPiece.js";
import { SENS_COUPE } from "./EtatMachine.js";

export function creerCoupe(elements, etat) {
  const { piece, bec } = elements;
  const origine = piece.getWorldPosition(new THREE.Vector3());
  const point = new THREE.Vector3();
  const orientation = new THREE.Quaternion();
  const coins = PLAQUETTE.map(() => new THREE.Vector3());
  const aretes = PLAQUETTE.slice(1).map(() => ({}));
  const profil = piece.profil;
  // Dégagement de 7,5 mm entre le bec et l'extrémité des mors, dont 5 mm
  // de débord axial de l'arête principale. La prise du brut reste intacte.
  const finUsinable = new THREE.Box3().setFromObject(elements.mors).max.x - origine.x + 7.5;
  let trajet = [];

  function position() {
    bec.getWorldPosition(point);
    return { x: point.x - origine.x, r: point.z - origine.z };
  }
  function bords() {
    bec.getWorldQuaternion(orientation);
    coins.forEach((v, i) => v.set(PLAQUETTE[i][0], 0, PLAQUETTE[i][1]).applyQuaternion(orientation));
    aretes.forEach((a, i) => {
      a.debutX = coins[i].x;
      a.debutZ = coins[i].z;
      a.x = coins[i + 1].x - a.debutX;
      a.z = coins[i + 1].z - a.debutZ;
    });
    return aretes;
  }
  function active() {
    return etat.direction === SENS_COUPE && etat.vitesse > 0 && !etat.urgence;
  }
  function enregistrer(avant) {
    const apres = position();
    const longueur = Math.hypot(apres.x - avant.x, apres.r - avant.r);
    if (longueur > 0) trajet.push({ avant, apres, longueur });
  }
  function tourner(angle, rotation) {
    let enleve = 0;
    if (active() && rotation > 0) {
      const aretes = bords();
      if (!trajet.length) {
        const p = position();
        enleve = profil.balayer(p, p, angle, rotation, aretes);
      } else {
        // Plusieurs gestes entre deux images gardent leur ordre et leur trajet.
        const total = trajet.reduce((somme, pas) => somme + pas.longueur, 0);
        for (const pas of trajet) {
          const arc = rotation * pas.longueur / total;
          enleve += profil.balayer(pas.avant, pas.apres, angle, arc, aretes);
          angle += arc;
        }
      }
    }
    trajet = [];
    return enleve;
  }

  // Le contact à l'arrêt utilise l'enveloppe résiduelle des sections axiales.
  function fractionObstacle(dx, dz) {
    const p = position();
    let libre = 1;
    for (const bord of bords()) {
      if (Math.abs(bord.x) < 1e-10) continue;
      const debut = p.x + bord.debutX;
      const xmin = debut + Math.min(0, dx) + Math.min(0, bord.x);
      const xmax = debut + Math.max(0, dx) + Math.max(0, bord.x);
      const premier = Math.max(0, Math.ceil(xmin / BRUT.pas));
      const dernier = Math.min(profil.dernier, Math.floor(xmax / BRUT.pas));
      const pente = bord.z / bord.x;
      const variation = dz - pente * dx;
      for (let i = premier; i <= dernier; i++) {
        const x = i * BRUT.pas;
        const relatif = x - debut;
        let entree = 0, sortie = libre;
        if (dx === 0) {
          const t = relatif / bord.x;
          if (t < 0 || t > 1) continue;
        } else {
          const a = relatif / dx, b = (relatif - bord.x) / dx;
          entree = Math.max(0, Math.min(a, b));
          sortie = Math.min(libre, Math.max(a, b));
          if (sortie <= entree) continue;
        }
        const surface = profil.diametre(x) / 2;
        const jeu = p.r + bord.debutZ + relatif * pente - surface;
        if (jeu + entree * variation < -1e-8) {
          if (entree > 0 || variation < 0) libre = entree;
        } else if (variation < 0 && jeu + sortie * variation < -1e-8) {
          libre = Math.min(libre, Math.max(entree, -jeu / variation));
        }
      }
    }
    return libre;
  }
  return { active, position, enregistrer, tourner, fractionObstacle, profil, finUsinable };
}
