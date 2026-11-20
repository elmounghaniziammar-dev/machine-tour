import { limiter, PAS } from "./Limites.js";
import { creerCollisions } from "./Collisions.js";

export function creerDeplacements(elements, etat) {
  const tour = 2 * Math.PI;
  // L'orientation du volant de fourreau est différente : son axe est X.
  const orientationFourreau = elements.volantFourreau.quaternion.clone();
  let collisions;

  function actualiser() {
    // On déplace les parents : tous leurs enfants suivent naturellement.
    elements.trainard.position.x = etat.trainardZ;
    elements.transversal.position.z = etat.transversalX;
    // Z est ici l'axe local de la base orientable, qui reste immobile.
    elements.chariotSuperieur.position.z = etat.petitChariot;
    elements.poupee.position.x = etat.poupeeZ;
    elements.fourreau.position.x = -110 - etat.fourreau;

    // Une course correspond à une rotation mécanique, même en avance automatique.
    elements.volantTrainard.rotation.z = (-(etat.trainardZ - 565) / PAS.trainardZ) * tour;
    elements.volantTransversal.rotation.z =
      (-(etat.transversalX - 20) / PAS.transversalX) * tour;
    elements.volantSuperieur.rotation.z = (-etat.petitChariot / PAS.petitChariot) * tour;
    elements.volantFourreau.quaternion.copy(orientationFourreau);
    elements.volantFourreau.rotateZ((-(etat.fourreau - 50) / PAS.fourreau) * tour);
  }

  function regler(axe, valeur, automatique = false) {
    if (axe === "poupeeZ" && etat.poupeeBloquee) {
      etat.message = "Unlock the tailstock before moving it.";
      return false;
    }
    if (axe === "fourreau" && etat.fourreauBloque) {
      etat.message = "Unlock the quill before turning its handwheel.";
      return false;
    }
    if (axe === "trainardZ" && etat.engagement !== "off" && !automatique) {
      etat.message =
        "Disengage the automatic feed before using this handwheel.";
      return false;
    }
    const course = limiter(axe, valeur);
    const { position, contact } = collisions.borner(axe, course);
    etat[axe] = position;
    actualiser();
    const limiteAtteinte = position !== valeur;
    const noms = {
      trainardZ: "Carriage position",
      transversalX: "Cross-slide position",
      petitChariot: "Compound travel",
      poupeeZ: "Tailstock position",
      fourreau: "Quill extension",
    };
    etat.message = contact
      ? `Contact limit: ${contact}.`
      : limiteAtteinte
        ? "Travel limit reached."
      : `${noms[axe]}: ${position.toFixed(2)} mm`;
    // Le volant transversal entraîne aussi le tambour gradué, déjà son enfant.
    if (axe === "transversalX" && !limiteAtteinte) {
      const radial = position - 20;
      etat.message = `Cross-slide radial travel: ${radial.toFixed(2)} mm | dial: ${(((radial % PAS.transversalX) + PAS.transversalX) % PAS.transversalX).toFixed(2)} mm`;
    }
    return !limiteAtteinte;
  }
  actualiser();
  collisions = creerCollisions(elements, etat);
  return { regler, actualiser, pointeSurPiece: collisions.pointeSurPiece };
}
