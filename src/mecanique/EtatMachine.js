// Les nombres représentent les réglages de la machine, pas les objets 3D.
import { VITESSES_SN40 } from "./PlaqueSN40.js";
export const VITESSES = [...new Set(VITESSES_SN40.flat().filter(v => v !== null))].sort((a, b) => a - b);
export const AVANCES = [0.05, 0.08, 0.1, 0.16, 0.2, 0.32, 0.4];
// Ordre des crans du levier. En marche avant, la face avant de la pièce
// descend sur la plaquette (sens antihoraire vu depuis la contre-pointe).
export const CRANS_BROCHE = ["ccw", "off", "cw"];
export const SENS_COUPE = CRANS_BROCHE[0];
export function creerEtatMachine() {
  const transversalX = 22; // Bec à 2 mm de la surface initiale.
  return {
    vitesse: 250,
    direction: "off", // off, cw (horaire), ccw (antihoraire)
    avance: 0.1, // mm par tour de broche
    engagement: "off", // off, rod (barre), screw (vis mère)
    trainardZ: 590, // Au droit de la face libre du brut.
    transversalX,
    zeroTambour: transversalX,
    petitChariot: 0,
    poupeeZ: 826,
    fourreau: 42, // Sortie vers le mandrin, de 0 à 80 mm
    poupeeBloquee: true,
    fourreauBloque: false,
    urgence: false,
    passe: null,
    message: "Vues 1–5 : ensemble, broche, traînard, tambour, coupe. Régler le diamètre au volant transversal et embrayer l’avance au levier du tablier.",
  };
}
