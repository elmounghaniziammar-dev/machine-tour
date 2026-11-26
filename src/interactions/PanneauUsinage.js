import { SENS_COUPE } from "../mecanique/EtatMachine.js";
import { PAS } from "../mecanique/Limites.js";
import { BRUT } from "../mecanique/ProfilPiece.js";
import { vitesseAvanceLongitudinale } from "../mecanique/Broche.js";

function mesure(valeur, unite, precision = 2) {
  if (valeur === null) return "—";
  const arrondie = Number(valeur.toFixed(precision));
  return arrondie.toFixed(precision).replace(".", ",") + " " + unite;
}

export function installerPanneau(etat, axes) {
  const panneau = document.querySelector("#atelier");
  const champs = Object.fromEntries([...panneau.querySelectorAll("[id]")].map(el => [el.id, el]));
  const { coupe } = axes;
  let recence = 0;
  function afficher(id, texte) {
    if (champs[id].textContent !== texte) champs[id].textContent = texte;
  }
  function actualiser(dt, volume) {
    const p = coupe.position();
    const diametre = coupe.profil.diametre(p.x);
    const tambour = axes.lireTambour();
    const tourne = !etat.urgence && etat.direction !== "off";
    recence = volume > 0 ? 0.16 : Math.max(0, recence - dt);
    const enCoupe = coupe.active() && recence > 0;
    const sens = etat.direction === SENS_COUPE ? "Marche avant" : "Marche arrière";
    afficher("etat-coupe", etat.urgence ? "Arrêt d’urgence" : tourne ?
      sens + (enCoupe ? " · En coupe" : " · Sans enlèvement") : "Broche arrêtée");
    champs["etat-coupe"].classList.toggle("en-coupe", enCoupe);
    const diametreRegle = 2 * Math.abs(p.r);
    afficher("diametre-regle", mesure(diametreRegle, "mm"));
    afficher("reduction-brut", mesure(Math.max(0, 2 * BRUT.rayon - diametreRegle), "mm"));
    afficher("mesure-diametre", diametre === null ? "Hors pièce" : mesure(diametre, "mm"));
    const derriere = diametre !== null && coupe.profil.volume > 0 ?
      coupe.profil.diametre(p.x + etat.avance + BRUT.pas) : null;
    afficher("diametre-usine", mesure(derriere, "mm"));
    afficher("volume", mesure(coupe.profil.volume / 1000, "cm³", 3));
    afficher("vc", mesure(diametre === null ? null : tourne ? Math.PI * diametre * etat.vitesse / 1000 : 0, "m/min", 1));
    afficher("regime", mesure(etat.vitesse, "tr/min", Number.isInteger(etat.vitesse) ? 0 : 1));
    afficher("avance", mesure(etat.avance, "mm/tr"));
    afficher("embrayage", etat.engagement === "rod" ? "Embrayée" : "Débrayée");
    afficher("position-z", mesure(p.x - BRUT.longueur, "mm"));
    afficher("vitesse-z", mesure(vitesseAvanceLongitudinale(etat), "mm/min", 1));
    afficher("lecture-tambour", mesure(Math.round(tambour.lecture * 100) / 100 % PAS.transversalX, "mm"));
    afficher("course-transversale", mesure(tambour.deplacement, "mm"));
    afficher("ecart", mesure(axes.ecartPointe(), "mm"));
  }
  actualiser(0, 0);
  panneau.hidden = false;
  return { actualiser, dispose() { panneau.hidden = true; } };
}
