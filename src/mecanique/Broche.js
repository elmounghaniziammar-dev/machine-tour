import { LIMITES, PAS } from "./Limites.js";

export function creerBroche(elements, etat, deplacements) {
  function actualiser(secondes) {
    if (!Number.isFinite(secondes) || secondes < 0)
      throw new Error("Invalid time delta");
    if (etat.direction === "off" || etat.urgence) return;
    // Horaire vu depuis la poupée mobile vers le mandrin = rotation X négative.
    const sens = etat.direction === "cw" ? -1 : 1;
    const tours = ((sens * etat.vitesse) / 60) * secondes;
    const angle = tours * 2 * Math.PI;
    elements.broche.rotation.x =
      (elements.broche.rotation.x + angle) % (2 * Math.PI);

    // La pointe tourne seulement si elle touche approximativement le bout de la pièce.
    if (deplacements.pointeSurPiece())
      elements.pointe.rotation.x =
        (elements.pointe.rotation.x + angle) % (2 * Math.PI);

    if (etat.engagement !== "off") {
      const distance = tours * etat.avance;
      const avant = etat.trainardZ;
      const libre = deplacements.regler(
        "trainardZ",
        etat.trainardZ + distance,
        true,
      );
      const parcouru = etat.trainardZ - avant;
      if (etat.engagement === "screw")
        elements.visMere.rotation.x += (parcouru / PAS.visMere) * 2 * Math.PI;
      else elements.barre.rotateY((parcouru / PAS.barre) * 2 * Math.PI);
      if (!libre || LIMITES.trainardZ.includes(etat.trainardZ)) {
        const raison = etat.message;
        etat.engagement = "off";
        etat.message = `Automatic feed disengaged. ${raison}`;
      }
    }
  }
  return { actualiser };
}
