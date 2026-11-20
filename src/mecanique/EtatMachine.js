// Les nombres représentent les réglages de la machine, pas les objets 3D.
export const VITESSES = [
  45, 63, 90, 125, 180, 250, 355, 500, 710, 1000, 1400, 2000,
];
export const AVANCES = [0.05, 0.08, 0.1, 0.16, 0.2, 0.32, 0.4];
export function creerEtatMachine() {
  return {
    vitesse: 250,
    direction: "off", // off, cw (horaire), ccw (antihoraire)
    avance: 0.1, // mm par tour de broche
    engagement: "off", // off, rod (barre), screw (vis mère)
    trainardZ: 565, // Ancien nom : position sur X, le long du banc.
    transversalX: 20, // Ancien nom : position radiale sur Z.
    petitChariot: 0,
    poupeeZ: 826,
    fourreau: 50, // Sortie vers le mandrin, de 0 à 80 mm
    poupeeBloquee: true,
    fourreauBloque: false,
    urgence: false,
    message: "Hover a 3D control to see its action.",
  };
}
