// Unité : 1 unité Three.js = 1 mm. X longe le banc, Z est transversal.
// Un tour de volant déplace le groupe guidé du pas indiqué ci-dessous.
export const PAS = {
  trainardZ: 25,
  transversalX: 5, // 100 divisions de 0,05 mm sur le rayon.
  petitChariot: 2,
  fourreau: 4,
  visMere: 6,
  barre: 2,
};

// Courses des glissières. Collisions.js ajoute les contacts entre assemblages.
// Les anciens noms d'état trainardZ et transversalX sont conservés ; leurs axes
// réels sont respectivement X et Z dans la scène.
export const LIMITES = {
  trainardZ: [460, 1060],
  transversalX: [0, 200],
  petitChariot: [-40, 40],
  poupeeZ: [780, 1180],
  fourreau: [0, 80],
};
export function limiter(axe, valeur) {
  if (!LIMITES[axe] || !Number.isFinite(valeur))
    throw new Error("Invalid axis or position");
  const [minimum, maximum] = LIMITES[axe];
  return Math.max(minimum, Math.min(maximum, valeur));
}
