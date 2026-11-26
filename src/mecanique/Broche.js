import { LIMITES, PAS } from "./Limites.js";
import { BRUT, CENTRAGE, PLAQUETTE, TOUR } from "./ProfilPiece.js";
import { SENS_COUPE } from "./EtatMachine.js";

function regimeSigne(etat) {
  if (etat.direction === "off" || etat.urgence) return 0;
  return etat.direction === SENS_COUPE ? etat.vitesse : -etat.vitesse;
}

// Sur le tour, Z positif s’éloigne du mandrin. La barre en marche avant
// entraîne donc le traînard dans le sens négatif, à f mm par tour de pièce.
export function vitesseAvanceLongitudinale(etat) {
  const regime = regimeSigne(etat);
  return etat.engagement === "rod" && regime !== 0 ? -etat.avance * regime : 0;
}

export function creerBroche(elements, etat, deplacements) {
  const { coupe } = deplacements;
  let phases = [];
  function arreterPasse(message = "Chariotage interrompu. Avance débrayée.") {
    phases = [];
    etat.passe = null;
    if (etat.engagement === "rod") etat.engagement = "off";
    etat.message = message;
  }

  function verifierDepart(reduction) {
    const p = coupe.position();
    const diametre = coupe.profil.diametre(BRUT.longueur);
    if (etat.urgence) return "Réarmer l’arrêt d’urgence.";
    if (etat.direction === "cw") return "Arrêter la marche arrière.";
    if (etat.engagement !== "off") return "Débrayer l’avance pour préparer le départ.";
    if (!Number.isFinite(reduction) || reduction <= 0 ||
        diametre - reduction <= 2 * CENTRAGE.profondeur * CENTRAGE.pente)
      return "Régler une réduction positive qui conserve la portée de la contre-pointe.";
    if (!deplacements.pointeSurPiece() || !etat.poupeeBloquee)
      return "Bloquer la poupée mobile et mettre la contre-pointe en appui.";
    if (!etat.fourreauBloque) return "Bloquer le fourreau en appui.";
    const local = coupe.profil.diametre(p.x);
    if (local !== null && p.r < local / 2 - 0.005)
      return "Dégager le bec de la matière au transversal avant le retour guidé.";
    return "";
  }

  function lancerPasse(reduction) {
    const erreur = verifierDepart(reduction);
    if (erreur) {
      etat.message = erreur;
      return false;
    }
    const p = coupe.position();
    const face = etat.trainardZ + BRUT.longueur - p.x;
    const debord = 1 - Math.min(...PLAQUETTE.map(([x]) => x));
    const rayonFinal = (coupe.profil.diametre(BRUT.longueur) - reduction) / 2;
    const trajet = [
      { nom: "Dégagement en bout", axe: "trainardZ", cible: face + debord },
      { nom: "Prise de profondeur hors matière", axe: "transversalX", cible: etat.transversalX + rayonFinal - p.r },
      { nom: "Chariotage vers le mandrin", axe: "trainardZ", cible: face - BRUT.longueur + coupe.finUsinable, embrayee: true },
      { nom: "Finition en bout de course", tours: 1 },
    ];
    // Depuis une position quelconque, sortir au-dessus de l’enveloppe du brut
    // avant le retour axial. À la tangence du bord, conserver le trajet court.
    const auBord = Math.abs(p.x - BRUT.longueur) <= BRUT.pas / 2;
    if (!auBord || p.r > coupe.profil.diametre(BRUT.longueur) / 2 + 0.005) {
      trajet.unshift({ nom: "Dégagement radial avant retour", axe: "transversalX",
        cible: etat.transversalX + Math.max(p.r, BRUT.rayon + 2) - p.r });
    }
    const horsCourse = trajet.some(({ axe, cible }) => axe && (cible < LIMITES[axe][0] || cible > LIMITES[axe][1]));
    const obstacle = deplacements.obstacleSurTrajet(trajet);
    if (horsCourse || obstacle) {
      etat.message = horsCourse ? "Course insuffisante. Recentrer le petit chariot avant de tangenter." :
        "Trajet bloqué (" + obstacle + "). Vérifier le montage ou diminuer la réduction.";
      return false;
    }
    phases = trajet;
    etat.direction = SENS_COUPE;
    etat.passe = phases[0].nom;
    etat.message = "Chariotage automatique en cours.";
    return true;
  }

  function tourner(tours) {
    const angle = elements.broche.rotation.x;
    const rotation = tours * TOUR;
    coupe.tourner(angle, rotation);
    elements.broche.rotation.x = (angle + rotation) % TOUR;
    if (deplacements.pointeSurPiece())
      elements.pointe.rotation.x = (elements.pointe.rotation.x + rotation) % TOUR;
  }

  function entrainer(axe, cible) {
    const avant = etat[axe];
    const libre = deplacements.regler(axe, cible, true);
    const distance = etat[axe] - avant;
    if (etat.engagement === "screw")
      elements.visMere.rotation.x += distance / PAS.visMere * TOUR;
    else if (etat.engagement === "rod") elements.barre.rotateY(distance / PAS.barre * TOUR);
    return { libre, distance };
  }

  function avancerPasse(tours) {
    while (tours > 0 && phases.length) {
      const phase = phases[0];
      const restant = phase.axe ? Math.abs(phase.cible - etat[phase.axe]) / etat.avance : phase.tours;
      const utilise = Math.min(tours, restant);
      if (phase.axe && utilise > 0) {
        const debut = etat[phase.axe];
        const cible = utilise === restant ? phase.cible :
          debut + Math.sign(phase.cible - debut) * utilise * etat.avance;
        const { libre, distance } = entrainer(phase.axe, cible);
        if (!libre) {
          const parcouru = Math.abs(distance) / etat.avance;
          tourner(parcouru);
          arreterPasse(etat.message);
          tourner(tours - parcouru);
          return;
        }
      } else if (!phase.axe) phase.tours -= utilise;
      tourner(utilise);
      tours -= utilise;
      if (utilise === restant) {
        phases.shift();
        if (phases.length) {
          etat.passe = phases[0].nom;
          etat.engagement = phases[0].embrayee ? "rod" : "off";
        }
        else {
          arreterPasse("Fin de la longueur usinable. Avance débrayée, broche en rotation.");
          tourner(tours);
        }
      }
    }
  }

  function actualiser(secondes) {
    if (!Number.isFinite(secondes) || secondes < 0) throw new Error("Invalid time delta");
    // Le levier du tablier peut débrayer puis réembrayer entre deux images.
    // Dans ce cas la passe est terminée et le nouvel embrayage est manuel.
    if (phases.length && !etat.passe) phases = [];
    if (phases.length && (etat.direction !== SENS_COUPE ||
        etat.engagement !== (phases[0].embrayee ? "rod" : "off") || etat.urgence))
      arreterPasse(etat.urgence ? "Arrêt d’urgence." : "Passe interrompue.");
    if (phases.length && (!deplacements.pointeSurPiece() || !etat.poupeeBloquee || !etat.fourreauBloque))
      arreterPasse("Appui de la contre-pointe perdu. Avance débrayée.");
    if (etat.direction === "off" || etat.urgence) {
      coupe.tourner(0, 0);
      return;
    }
    if (!secondes) return;
    const tours = regimeSigne(etat) / 60 * secondes;
    if (phases.length) {
      avancerPasse(tours);
    } else if (etat.engagement !== "off") {
      const axe = "trainardZ";
      // En marche avant, la barre entraîne le traînard vers le mandrin.
      const avanceSignee = etat.engagement === "rod" ? -etat.avance : etat.avance;
      const { libre, distance } = entrainer(axe, etat[axe] + tours * avanceSignee);
      if (!libre || LIMITES[axe].includes(etat[axe])) {
        etat.engagement = "off";
        etat.message = `Avance débrayée. ${etat.message}`;
        const parcouru = distance / avanceSignee;
        tourner(parcouru);
        tourner(tours - parcouru);
      } else tourner(tours);
    } else tourner(tours);
  }
  return { actualiser, verifierDepart, lancerPasse, arreterPasse };
}
