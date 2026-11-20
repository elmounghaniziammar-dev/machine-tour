import { VITESSES, AVANCES } from "../mecanique/EtatMachine.js";

// L'index correspond à un cran physique du sélecteur de broche.
export function reglerVitesseIndex(index, etat) {
  if (!Number.isFinite(index)) throw new Error("Invalid speed selector index");
  if (etat.direction !== "off") {
    etat.message = "Stop the spindle before changing its speed.";
    return false;
  }
  if (etat.urgence) {
    etat.message = "Release the emergency stop before changing speed.";
    return false;
  }
  const cran = Math.max(0, Math.min(VITESSES.length - 1, Math.round(index)));
  etat.vitesse = VITESSES[cran];
  etat.message = `Spindle speed: ${etat.vitesse} rpm`;
  return true;
}

// Le sélecteur d'avance existant reste une commande distincte.
export function actionnerSelecteur(nom, etat, inverse = false) {
  if (nom === "vitesse") {
    const index = VITESSES.indexOf(etat.vitesse);
    return reglerVitesseIndex(
      (index + (inverse ? -1 : 1) + VITESSES.length) % VITESSES.length,
      etat,
    );
  }
  if (nom !== "avance") return false;
  const index = AVANCES.indexOf(etat.avance);
  etat.avance =
    AVANCES[(index + (inverse ? -1 : 1) + AVANCES.length) % AVANCES.length];
  etat.message = `Feed: ${etat.avance} mm/rev`;
  return true;
}

export function afficherSelecteurs(elements, etat) {
  const index = VITESSES.indexOf(etat.vitesse);
  elements.selecteurVitesse.rotation.z =
    -0.9 + (Math.max(0, index) / (VITESSES.length - 1)) * 1.8;
  elements.selecteurAvance.rotation.z =
    -0.75 + (AVANCES.indexOf(etat.avance) / (AVANCES.length - 1)) * 1.5;

  // Les chiffres gravés proches du levier montrent uniquement le cran actif.
  const afficheur =
    elements.selecteurVitesse.parent.getObjectByName("selectorNumber0");
  if (afficheur)
    for (const chiffres of afficheur.children)
      chiffres.visible = chiffres.userData.rpm === etat.vitesse;
}
