import { VITESSES, AVANCES } from "../mecanique/EtatMachine.js";

// L'index correspond à un cran physique du sélecteur de broche.
export function reglerVitesseIndex(index, etat) {
  if (!Number.isFinite(index)) throw new Error("Invalid speed selector index");
  if (etat.direction !== "off") {
    etat.message = "Arrêter la broche avant de changer de régime.";
    return false;
  }
  if (etat.urgence) {
    etat.message = "Réarmer l’arrêt d’urgence avant de changer de régime.";
    return false;
  }
  const cran = Math.max(0, Math.min(VITESSES.length - 1, Math.round(index)));
  etat.vitesse = VITESSES[cran];
  etat.message = `Broche à ${etat.vitesse} tr/min`;
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
  etat.message = `Avance de ${etat.avance} mm/tr`;
  return true;
}

export function afficherSelecteurs(elements, etat) {
  const index = VITESSES.indexOf(etat.vitesse);
  elements.selecteurVitesse.rotation.z =
    -0.9 + (Math.max(0, index) / (VITESSES.length - 1)) * 1.8;
  elements.selecteurAvance.rotation.z =
    -0.75 + (AVANCES.indexOf(etat.avance) / (AVANCES.length - 1)) * 1.5;
  for (const valeur of elements.selecteurAvance.lectureAvance.children)
    valeur.visible = valeur.userData.avance === etat.avance;

  // Les chiffres gravés proches du levier montrent uniquement le cran actif.
  const afficheur =
    elements.selecteurVitesse.parent.getObjectByName("selectorNumber0");
  if (afficheur)
    for (const chiffres of afficheur.children)
      chiffres.visible = chiffres.userData.rpm === etat.vitesse;
}
