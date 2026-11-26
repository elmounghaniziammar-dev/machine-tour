import { limiter, PAS, SENS_VOLANT, TAMBOUR_TRANSVERSAL } from "./Limites.js";
import { creerCollisions } from "./Collisions.js";
import { creerCoupe } from "./Coupe.js";

export function creerDeplacements(elements, etat) {
  const tour = 2 * Math.PI;
  // Les volants à droite du petit chariot et du fourreau tournent autour de X.
  const orientationFourreau = elements.volantFourreau.quaternion.clone();
  const orientationSuperieur = elements.volantSuperieur.quaternion.clone();
  let collisions;
  const coupe = creerCoupe(elements, etat);
  etat.zeroTambour ??= etat.transversalX;
  const angleParMm = SENS_VOLANT.transversalX * tour / PAS.transversalX;

  function lireTambour() {
    // Positif vers l’axe. Éliminer seulement le bruit numérique des déplacements successifs.
    const deplacement = Math.round((etat.zeroTambour - etat.transversalX) * 1e9) / 1e9 || 0;
    const lecture = deplacement - Math.floor(deplacement / PAS.transversalX) * PAS.transversalX;
    return { deplacement, lecture, division: lecture / TAMBOUR_TRANSVERSAL.mmParDivision };
  }
  function peutMettreTambourAZero() {
    return !etat.passe;
  }
  function mettreTambourAZero() {
    if (!peutMettreTambourAZero()) {
      etat.message = "Interrompre la passe pour régler le zéro du tambour.";
      return false;
    }
    etat.zeroTambour = etat.transversalX;
    elements.tambourTransversal.rotation.z = -angleParMm * etat.zeroTambour;
    etat.message = "Tambour transversal à zéro.";
    return true;
  }

  function actualiser() {
    // On déplace les parents : tous leurs enfants suivent naturellement.
    elements.trainard.position.x = etat.trainardZ;
    elements.transversal.position.z = etat.transversalX;
    elements.chariotSuperieur.position.x = etat.petitChariot;
    elements.poupee.position.x = etat.poupeeZ;
    elements.fourreau.position.x = -110 - etat.fourreau;

    // Une course correspond à une rotation mécanique, même en avance automatique.
    elements.volantTrainard.rotation.z = SENS_VOLANT.trainardZ * (etat.trainardZ - 590) / PAS.trainardZ * tour;
    elements.volantTransversal.rotation.z = angleParMm * etat.transversalX;
    elements.tambourTransversal.rotation.z = -angleParMm * etat.zeroTambour;
    elements.volantSuperieur.quaternion.copy(orientationSuperieur);
    elements.volantSuperieur.rotateZ(SENS_VOLANT.petitChariot * etat.petitChariot / PAS.petitChariot * tour);
    elements.volantFourreau.quaternion.copy(orientationFourreau);
    elements.volantFourreau.rotateZ(SENS_VOLANT.fourreau * (etat.fourreau - 42) / PAS.fourreau * tour);
  }

  function regler(axe, valeur, automatique = false) {
    if (etat.passe && !automatique) {
      etat.message = "Arrêter la passe avant de déplacer un axe à la main.";
      return false;
    }
    if (axe === "poupeeZ" && etat.poupeeBloquee) {
      etat.message = "Débloquer la poupée mobile avant de la déplacer.";
      return false;
    }
    if (axe === "fourreau" && etat.fourreauBloque) {
      etat.message = "Débloquer le fourreau avant de tourner son volant.";
      return false;
    }
    if (axe === "trainardZ" && etat.engagement !== "off" && !automatique) {
      etat.message =
        "Débrayer l’avance avant d’utiliser ce volant.";
      return false;
    }
    const course = limiter(axe, valeur);
    const { position, contact } = collisions.borner(axe, course);
    const avant = coupe.active() ? coupe.position() : null;
    etat[axe] = position;
    actualiser();
    if (avant) coupe.enregistrer(avant);
    const limiteAtteinte = position !== valeur;
    if (automatique && !limiteAtteinte && etat.passe) return true;
    const noms = {
      trainardZ: "Position du traînard",
      transversalX: "Position du transversal",
      petitChariot: "Course du petit chariot",
      poupeeZ: "Position de la poupée mobile",
      fourreau: "Sortie du fourreau",
    };
    etat.message = contact
      ? `Contact entre ${contact}.`
      : limiteAtteinte
        ? "Butée de course atteinte."
      : `${noms[axe]}: ${position.toFixed(2)} mm`;
    if (axe === "transversalX" && !limiteAtteinte) {
      const { deplacement, lecture } = lireTambour();
      etat.message = `Déplacement radial ${deplacement.toFixed(2).replace(".", ",")} mm · Tambour ${lecture.toFixed(2).replace(".", ",")} mm`;
    }
    return !limiteAtteinte;
  }
  actualiser();
  collisions = creerCollisions(elements, etat, coupe);
  return { regler, actualiser, lireTambour, peutMettreTambourAZero, mettreTambourAZero,
    obstacleSurTrajet: collisions.obstacleSurTrajet,
    pointeSurPiece: collisions.pointeSurPiece, ecartPointe: collisions.ecartPointe, coupe };
}
