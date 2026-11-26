import { CRANS_BROCHE, SENS_COUPE } from "../mecanique/EtatMachine.js";

export function reglerDirection(position, etat) {
  if (!CRANS_BROCHE.includes(position))
    throw new Error("Invalid spindle lever position");
  if (etat.urgence && position !== "off") {
    etat.message = "Réarmer l’arrêt d’urgence avant de démarrer la broche.";
    return false;
  }
  // Une inversion demande deux gestes : arrêt, puis choix du nouveau sens.
  if (
    position !== "off" &&
    etat.direction !== "off" &&
    etat.direction !== position
  ) {
    etat.direction = "off";
    etat.message = "Broche arrêtée. Sélectionner le nouveau sens de rotation.";
    return false;
  }
  etat.direction = position;
  etat.message =
    position === "off"
      ? "Broche arrêtée."
      : position === SENS_COUPE ? "Broche en marche avant." : "Broche en marche arrière.";
  return true;
}

export function motifBlocageAvanceLongitudinale(etat) {
  if (etat.engagement === "rod") return "";
  if (etat.urgence) return "Réarmer l’arrêt d’urgence avant d’embrayer l’avance.";
  if (etat.engagement === "screw") return "Ouvrir les demi-noix avant d’embrayer la barre d’avance.";
  if (etat.passe) return "Le cycle commande le positionnement du chariot.";
  return "";
}

export function actionnerLevier(nom, etat) {
  if (nom === "direction" || nom === "inverse") {
    const sens = nom === "direction" ? SENS_COUPE : "cw";
    return reglerDirection(etat.direction === sens ? "off" : sens, etat);
  }
  if (nom === "arret") {
    // Un second clic libère le bouton, sans relancer la broche.
    etat.urgence = !etat.urgence;
    etat.direction = "off";
    etat.engagement = "off";
    etat.message = etat.urgence
      ? "Arrêt d’urgence enclenché. Broche arrêtée et avance débrayée."
      : "Arrêt d’urgence réarmé. Broche à l’arrêt.";
    return true;
  }
  if (nom === "avance") {
    const blocage = motifBlocageAvanceLongitudinale(etat);
    if (blocage) {
      etat.message = blocage;
      return false;
    }
    if (etat.engagement === "rod") {
      etat.engagement = "off";
      etat.message = etat.passe ? "Passe interrompue au levier. Avance Z débrayée." : "Avance Z débrayée.";
      etat.passe = null;
    } else {
      etat.engagement = "rod";
      etat.message = etat.direction === "off" ? "Avance Z enclenchée. En attente de la broche." : "Avance Z enclenchée.";
    }
    return true;
  }
  if (nom === "demiNoix") {
    if (etat.engagement === "screw") {
      etat.engagement = "off";
      etat.message = "Demi-noix ouvertes.";
      return true;
    }
    if (etat.engagement === "rod" || etat.passe || etat.urgence) {
      etat.message = etat.urgence ? "Réarmer l’arrêt d’urgence." :
        "Débrayer l’avance et terminer le cycle avant de fermer les demi-noix.";
      return false;
    }
    etat.engagement = "screw";
    etat.message = "Demi-noix engagées sur la vis mère.";
    return true;
  }
  if (nom === "verrouPoupee") {
    etat.poupeeBloquee = !etat.poupeeBloquee;
    etat.message = etat.poupeeBloquee ? "Poupée mobile bloquée." : "Poupée mobile libérée. Glisser son corps le long du banc.";
    return true;
  }
  if (nom === "verrouFourreau") {
    etat.fourreauBloque = !etat.fourreauBloque;
    etat.message = etat.fourreauBloque ? "Fourreau bloqué." : "Fourreau libéré.";
    return true;
  }
  return false;
}

export function afficherLeviers(elements, etat) {
  elements.levierDirection.rotation.z = (CRANS_BROCHE.indexOf(etat.direction) - 1) * 0.65;
  elements.levierAvance.rotation.z = etat.engagement === "rod" ? -0.55 : 0.55;
  elements.levierDemiNoix.rotation.z =
    etat.engagement === "screw" ? 0.65 : -0.65;
  elements.verrouPoupee.rotation.z = etat.poupeeBloquee ? -0.75 : 0.75;
  elements.verrouFourreau.rotation.z = etat.fourreauBloque ? -0.6 : 0.6;

  const bouton = elements.arret;
  if (!Number.isFinite(bouton.userData.positionRelachee))
    bouton.userData.positionRelachee = bouton.position.z;
  // L'enfoncement suit l'axe du bouton et persiste jusqu'au réarmement.
  bouton.position.z = bouton.userData.positionRelachee - (etat.urgence ? 3 : 0);
}
