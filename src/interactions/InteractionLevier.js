// Les trois crans du levier correspondent à la position visible de la broche.
export function reglerDirection(position, etat) {
  if (!["off", "cw", "ccw"].includes(position))
    throw new Error("Invalid spindle lever position");
  if (etat.urgence && position !== "off") {
    etat.message = "Release the emergency stop before starting the spindle.";
    return false;
  }
  // Une inversion demande deux gestes : arrêt, puis choix du nouveau sens.
  if (
    position !== "off" &&
    etat.direction !== "off" &&
    etat.direction !== position
  ) {
    etat.direction = "off";
    etat.message = "Spindle stopped. Select the opposite direction again.";
    return false;
  }
  etat.direction = position;
  etat.message =
    position === "off"
      ? "Spindle stopped."
      : `Spindle running ${position === "cw" ? "forward" : "reverse"}.`;
  return true;
}

export function actionnerLevier(nom, etat) {
  if (nom === "direction" || nom === "inverse") {
    const sens = nom === "direction" ? "cw" : "ccw";
    return reglerDirection(etat.direction === sens ? "off" : sens, etat);
  }
  if (nom === "arret") {
    // Un second clic libère le bouton, sans relancer la broche.
    etat.urgence = !etat.urgence;
    etat.direction = "off";
    etat.engagement = "off";
    etat.message = etat.urgence
      ? "Emergency stop engaged. Motorized motion stopped."
      : "Emergency stop released. Spindle remains stopped.";
    return true;
  }
  if (nom === "avance" || nom === "demiNoix") {
    if (etat.urgence) {
      etat.message = "Release the emergency stop before engaging feed.";
      return false;
    }
    const mode = nom === "avance" ? "rod" : "screw";
    etat.engagement = etat.engagement === mode ? "off" : mode;
    etat.message = `Automatic feed: ${etat.engagement}`;
    return true;
  }
  if (nom === "verrouPoupee") {
    etat.poupeeBloquee = !etat.poupeeBloquee;
    etat.message = `Tailstock ${etat.poupeeBloquee ? "locked" : "unlocked: drag its casting along the bed"}.`;
    return true;
  }
  if (nom === "verrouFourreau") {
    etat.fourreauBloque = !etat.fourreauBloque;
    etat.message = `Quill ${etat.fourreauBloque ? "locked" : "unlocked"}.`;
    return true;
  }
  return false;
}

export function afficherLeviers(elements, etat) {
  elements.levierDirection.rotation.z =
    etat.direction === "off" ? 0 : etat.direction === "cw" ? -0.65 : 0.65;
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
