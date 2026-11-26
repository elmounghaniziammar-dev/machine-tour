import { AVANCES, SENS_COUPE, VITESSES } from "../mecanique/EtatMachine.js";
import { BRUT } from "../mecanique/ProfilPiece.js";
import { VITESSES_SN40 } from "../mecanique/PlaqueSN40.js";
import { LIMITES, PAS, TAMBOUR_TRANSVERSAL } from "../mecanique/Limites.js";
import { vitesseAvanceLongitudinale } from "../mecanique/Broche.js";
import { reglerVitesseIndex } from "./InteractionSelecteur.js";
import { actionnerLevier, motifBlocageAvanceLongitudinale, reglerDirection } from "./InteractionLevier.js";

export function installerPanneau(etat, broche, axes, cadrer) {
  const { coupe } = axes;
  const ui = Object.fromEntries([...document.querySelectorAll("#atelier [id], #atelier")]
    .map(element => [element.id, element]));
  const ecoute = new AbortController();
  const options = { signal: ecoute.signal };
  ui["photo-originale"].href = ui["photo-originale"].querySelector("img").src;
  const format = (n, precision = 2) => (Math.abs(n) < 0.5 * 10 ** -precision ? 0 : n).toFixed(precision).replace(".", ",");
  function afficher(element, texte) {
    if (element.textContent !== texte) element.textContent = texte;
  }
  let recence = 0;
  let diametreDepart;
  let refusDepart = "";
  function changerVue(vue) {
    ui.cadrage.value = vue;
    cadrer(vue);
  }
  function changerCommandes() {
    const manuel = ui["mode-manuel"].checked;
    const plaque = ui["mode-plaque"].checked;
    ui["commande-manuelle"].hidden = !manuel;
    ui["commande-passe"].hidden = manuel || plaque;
    ui["plaque-sn40"].hidden = !plaque;
    ui.atelier.classList.toggle("mesures-reduites", manuel || plaque);
    changerVue(plaque ? "plaque" : manuel ? "trainard" : etat.passe ? "coupe" : "ensemble");
  }
  for (const mode of document.querySelectorAll('.modes input'))
    mode.addEventListener("change", changerCommandes, options);
  const casesRegime = [];
  for (const ligne of VITESSES_SN40) {
    const rangee = ui["regimes-photo"].insertRow();
    for (const vitesse of ligne) {
      const cellule = rangee.insertCell();
      cellule.textContent = vitesse === null ? "—" : vitesse.toLocaleString("fr-FR", { useGrouping: false });
      if (vitesse !== null) casesRegime.push({ cellule, vitesse });
    }
  }
  let regimeAffiche;
  const { mmParDivision, divisions } = TAMBOUR_TRANSVERSAL;
  afficher(ui["echelle-tambour"], `${PAS.transversalX} mm par tour · ${divisions} divisions de ${format(mmParDivision)} mm`);
  ui["division-plus"].addEventListener("click", () => axes.regler("transversalX", etat.transversalX - mmParDivision), options);
  ui["division-moins"].addEventListener("click", () => axes.regler("transversalX", etat.transversalX + mmParDivision), options);
  ui["zero-tambour"].addEventListener("click", () => axes.mettreTambourAZero(), options);
  ui.embrayage.addEventListener("click", () => actionnerLevier("avance", etat), options);

  ui.vitesse.replaceChildren(...VITESSES.map(v => new Option(v.toLocaleString("fr-FR", { useGrouping: false }), v)));
  ui.avance.replaceChildren(...AVANCES.map(f => new Option(format(f), f)));
  ui.vitesse.addEventListener("change", () => reglerVitesseIndex(ui.vitesse.selectedIndex, etat), options);
  ui.avance.addEventListener("change", () => { etat.avance = AVANCES[ui.avance.selectedIndex]; }, options);
  ui.cadrage.addEventListener("change", () => changerVue(ui.cadrage.value), options);
  ui.reduction.addEventListener("input", () => { refusDepart = ""; }, options);
  ui.fourreau.addEventListener("click", () => {
    if (!axes.pointeSurPiece()) axes.regler("fourreau", etat.fourreau + axes.ecartPointe());
    if (axes.pointeSurPiece() && !etat.fourreauBloque) actionnerLevier("verrouFourreau", etat);
  }, options);
  ui.approcher.addEventListener("click", () => {
    const p = coupe.position();
    const d = coupe.profil.diametre(p.x);
    const course = d === null ? 1 : Math.max(0, Math.min(1, p.r - d / 2));
    axes.regler("transversalX", etat.transversalX - course);
  }, options);
  ui.reculer.addEventListener("click", () => axes.regler("transversalX", etat.transversalX + 1), options);
  ui.bord.addEventListener("click", () => {
    axes.regler("trainardZ", etat.trainardZ + BRUT.longueur - coupe.position().x);
  }, options);
  ui.moteur.addEventListener("click", () => {
    if (etat.passe) broche.arreterPasse();
    reglerDirection(etat.direction === "off" ? SENS_COUPE : "off", etat);
  }, options);
  ui.lancer.addEventListener("click", () => {
    if (etat.passe) broche.arreterPasse();
    else {
      diametreDepart = coupe.profil.diametre(BRUT.longueur);
      if (broche.lancerPasse(ui.reduction.valueAsNumber)) {
        refusDepart = "";
        changerVue("coupe");
      } else refusDepart = etat.message;
    }
  }, options);

  function actualiser(dt, volume) {
    const enPasse = Boolean(etat.passe);
    ui.atelier.classList.toggle("en-passe", enPasse);
    afficher(ui["titre-montage"], enPasse ? "Montage en place" : "Préparer le montage");
    const tourne = etat.direction !== "off" && !etat.urgence;
    const p = coupe.position(), d = coupe.profil.diametre(p.x);
    if (!ui["commande-manuelle"].hidden) {
      const tambour = axes.lireTambour();
      const lectureAffichee = (Math.round(tambour.lecture * 100) % (PAS.transversalX * 100)) / 100;
      afficher(ui["lecture-tambour"], format(lectureAffichee) + " mm");
      afficher(ui["course-transversale"], format(tambour.deplacement) + " mm");
      ui["division-plus"].disabled = ui["division-moins"].disabled = enPasse;
      ui["zero-tambour"].disabled = !axes.peutMettreTambourAZero();
      const embrayee = etat.engagement === "rod";
      const motif = motifBlocageAvanceLongitudinale(etat);
      ui.embrayage.disabled = Boolean(motif);
      afficher(ui.embrayage, embrayee ? "Débrayer l’avance Z" : "Embrayer l’avance Z");
      afficher(ui["etat-levier"], motif || (embrayee ?
        (tourne ? (etat.direction === SENS_COUPE ? "Embrayée · vers le mandrin" : "Embrayée · vers la contre-pointe") :
          "Embrayée · en attente de la broche") : "Débrayée"));
      afficher(ui["position-z"], format(p.x - BRUT.longueur) + " mm");
      afficher(ui["vitesse-z"], format(vitesseAvanceLongitudinale(etat), 1) + " mm/min");
    }
    const enBout = p.x <= BRUT.longueur && p.x >= BRUT.longueur - BRUT.pas / 2;
    const reduction = ui.reduction.valueAsNumber;
    const initial = (enPasse || !enBout) && diametreDepart !== undefined ?
      diametreDepart : coupe.profil.diametre(BRUT.longueur);
    const total = BRUT.longueur - coupe.finUsinable;
    ui.reduction.disabled = enPasse;
    afficher(ui.cible, reduction > 0 && reduction < initial ?
      "Profondeur radiale " + format(reduction / 2) + " mm · Ø final " + format(initial - reduction) + " mm" : "Vérifier la réduction demandée.");
    ui.vitesse.disabled = tourne || etat.urgence;
    if (Number(ui.vitesse.value) !== etat.vitesse) ui.vitesse.value = String(etat.vitesse);
    if (regimeAffiche !== etat.vitesse) {
      regimeAffiche = etat.vitesse;
      for (const { cellule, vitesse } of casesRegime)
        cellule.classList.toggle("selectionnee", vitesse === regimeAffiche);
    }
    if (Number(ui.avance.value) !== etat.avance) ui.avance.value = String(etat.avance);
    const appui = axes.pointeSurPiece();
    ui.fourreau.disabled = tourne || etat.fourreauBloque || !etat.poupeeBloquee;
    const ecart = axes.ecartPointe();
    const indicationAppui = appui ? "Contre-pointe en appui" + (etat.fourreauBloque ? " · Fourreau bloqué" : "") :
      !etat.poupeeBloquee ? "Bloquer la poupée mobile sur le banc." :
      etat.fourreauBloque ? "Libérer le verrou du fourreau pour avancer la pointe." :
      etat.fourreau + ecart > LIMITES.fourreau[1] ? "Rapprocher la poupée mobile sur le banc, puis la bloquer." :
      "Contre-pointe à " + format(ecart) + " mm de sa portée.";
    afficher(ui.appui, indicationAppui);
    const jeu = d === null ? null : p.r - d / 2;
    afficher(ui.tangence, enPasse ? "" :
      !enBout ? "La passe guidée rejoint automatiquement la face droite." :
      Math.abs(jeu) <= 0.005 ? "Bec tangent au bord droit." : "Écart radial " + format(jeu) + " mm · Approche guidée au lancement.");
    ui.approcher.disabled = ui.reculer.disabled = enPasse;
    ui.bord.hidden = enBout || enPasse;
    const raison = enPasse ? "" : broche.verifierDepart(reduction);
    ui.lancer.disabled = Boolean(raison);
    afficher(ui.lancer, enPasse ? "Interrompre l’avance" : "Lancer le chariotage");
    const finDeCourse = !enPasse && Math.abs(p.x - coupe.finUsinable) < 0.005;
    const phase = etat.passe === "Chariotage vers le mandrin" ?
      etat.passe + " · " + format(etat.avance * etat.vitesse, 1) + " mm/min" : etat.passe;
    afficher(ui.geste, refusDepart && refusDepart === etat.message ? refusDepart : enPasse ? phase : finDeCourse && etat.engagement === "off" ?
      "Fin de la longueur usinable · " + format(total, 1) + " mm." : raison || "Prêt pour une course de " + format(total, 1) + " mm.");
    ui.moteur.disabled = etat.urgence;
    afficher(ui.moteur, tourne ? "Arrêter la broche" : etat.engagement === "off" ? "Démarrer la broche seule" : "Démarrer la broche");
    recence = volume > 0 ? 0.16 : Math.max(0, recence - dt);
    const enCoupe = tourne && coupe.active() && recence > 0;
    const sens = etat.direction === SENS_COUPE ? "Marche avant" : "Marche arrière";
    afficher(ui["etat-coupe"], etat.urgence ? "Arrêt d’urgence" : tourne ?
      sens + " · " + etat.vitesse + " tr/min · " + (enCoupe ? "En coupe" : "Sans enlèvement") : "Broche arrêtée");
    ui["etat-coupe"].classList.toggle("en-coupe", enCoupe);
    afficher(ui.course, format(Math.max(0, BRUT.longueur - p.x), 1) + " / " + format(total, 1) + " mm");
    afficher(ui["mesure-diametre"], d === null ? "Hors pièce" : format(d) + " mm");
    // À droite du bec, une avance par tour et une maille assurent que la
    // section mesurée a entièrement passé l’arête de finition.
    const derriere = d !== null && coupe.profil.volume > 0 ?
      coupe.profil.diametre(p.x + etat.avance + BRUT.pas) : null;
    afficher(ui["diametre-usine"], derriere === null ? "—" : format(derriere) + " mm");
    afficher(ui.volume, format(coupe.profil.volume / 1000, 3) + " cm³");
    afficher(ui.vc, d === null ? "—" : format(tourne ? Math.PI * d * etat.vitesse / 1000 : 0, 1) + " m/min");
  }
  actualiser(0, 0);
  ui.atelier.hidden = false;
  return { actualiser, dispose() { ecoute.abort(); ui.atelier.hidden = true; } };
}
