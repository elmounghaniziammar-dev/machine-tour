import * as THREE from "three";
import {
  commencerRotation,
  commencerTranslation,
} from "./InteractionVolant.js";
import {
  actionnerLevier,
  afficherLeviers,
  reglerDirection,
} from "./InteractionLevier.js";
import {
  actionnerSelecteur,
  afficherSelecteurs,
  reglerVitesseIndex,
} from "./InteractionSelecteur.js";
import { CRANS_BROCHE, SENS_COUPE, VITESSES } from "../mecanique/EtatMachine.js";
import { PAS, SENS_VOLANT, TAMBOUR_TRANSVERSAL } from "../mecanique/Limites.js";

// Le premier objet réellement visible doit être la commande : pas de clic à travers la fonte.
export function trouverCommande(machine, raycaster, commandes) {
  machine.updateWorldMatrix(true, true);
  // Une pièce cachée ne masque pas la surface réellement visible.
  const impact = raycaster
    .intersectObject(machine, true)
    .find(({ object }) => {
      for (let parent = object; parent; parent = parent.parent)
        if (!parent.visible) return false;
      return true;
    });
  if (!impact) return null;
  let objet = impact.object;
  while (objet && objet !== machine) {
    const commande = commandes.find((c) => c.objet === objet);
    if (commande) return commande;
    objet = objet.parent;
  }
  return null;
}

export function installerInteractions(
  machine,
  camera,
  canvas,
  controls,
  etat,
  deplacements,
) {
  const e = machine.elements;
  const mm = n => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const commandes = [
    {
      objet: e.volantTrainard,
      type: "volant",
      axe: "trainardZ",
      pas: PAS.trainardZ,
      nom: "Volant du traînard",
      valeur: () => `${etat.trainardZ.toFixed(2)} mm le long du banc`,
      geste: "Saisir la jante ou la poignée et tourner",
    },
    {
      objet: e.volantTransversal,
      type: "volant",
      axe: "transversalX",
      pas: PAS.transversalX,
      nom: "Volant du transversal",
      valeur: () => `Ø réglé au bec ${mm(2 * Math.abs(deplacements.coupe.position().r))} mm`,
      geste: "Tourner pour régler le diamètre. Clic : avancer d’une division. Maj + clic : reculer.",
    },
    {
      objet: e.tambourTransversal,
      type: "zero",
      nom: "Tambour transversal",
      valeur: () => `${mm(deplacements.lireTambour().deplacement)} mm depuis le zéro radial`,
      geste: "Cliquer sur la bague pour la mettre à zéro",
    },
    {
      objet: e.volantSuperieur,
      type: "volant",
      axe: "petitChariot",
      pas: PAS.petitChariot,
      nom: "Volant du petit chariot",
      valeur: () => `${etat.petitChariot.toFixed(2)} mm sur la glissière longitudinale`,
      geste: "Saisir la poignée et tourner",
    },
    {
      objet: e.volantFourreau,
      type: "volant",
      axe: "fourreau",
      pas: PAS.fourreau,
      nom: "Volant du fourreau",
      valeur: () => `${etat.fourreau.toFixed(2)} mm de sortie du fourreau`,
      geste: "Saisir la poignée et tourner",
    },
    {
      objet: e.corpsPoupee,
      type: "translation",
      nom: "Poupée mobile",
      valeur: () => `${etat.poupeeZ.toFixed(2)} mm · ${etat.poupeeBloquee ? "bloquée" : "libérée"}`,
      geste: "Débloquer le levier puis glisser le corps le long du banc",
    },
    {
      objet: e.selecteurVitesse,
      type: "vitesse",
      nom: "vitesse", titre: "Régime de broche",
      valeur: () => `${etat.vitesse} tr/min`,
      geste: "Arrêter la broche puis déplacer le levier entre les crans",
    },
    {
      objet: e.selecteurAvance,
      type: "selecteur",
      nom: "avance", titre: "Sélecteur d’avance (mm/tr)",
      valeur: () => `${etat.avance} mm/tr`,
      geste: "Cliquer pour avancer d’un cran · Maj + clic pour reculer",
    },
    {
      objet: e.levierDirection,
      type: "direction",
      nom: "direction", titre: "Sens de la broche",
      valeur: () => etat.direction === "off" ? "Arrêt" : etat.direction === SENS_COUPE ? "Marche avant · sens de coupe" : "Marche arrière",
      geste: "Cliquer pour démarrer en marche avant ou arrêter. Glisser pour choisir le sens.",
    },
    {
      objet: e.arret,
      type: "arret",
      nom: "arret", titre: "Arrêt d’urgence",
      valeur: () => etat.urgence ? "Enclenché" : "Réarmé",
      geste: "Cliquer pour arrêter · cliquer de nouveau pour réarmer",
    },
    {
      objet: e.levierAvance,
      type: "levier",
      nom: "avance", titre: "Levier d’avance longitudinale Z",
      valeur: () => etat.engagement === "rod" ? "Embrayé" : "Débrayé",
      geste: "Cliquer pour avancer depuis la position actuelle. Cliquer de nouveau pour débrayer.",
    },
    {
      objet: e.levierDemiNoix,
      type: "levier",
      nom: "demiNoix", titre: "Demi-noix de la vis mère",
      valeur: () => etat.engagement === "screw" ? "Embrayé" : "Débrayé",
      geste: "Cliquer pour embrayer ou débrayer",
    },
    {
      objet: e.verrouPoupee,
      type: "verrou",
      nom: "verrouPoupee", titre: "Verrou de la poupée mobile",
      valeur: () => etat.poupeeBloquee ? "Bloqué" : "Libéré",
      geste: "Déplacer le levier pour bloquer ou libérer",
    },
    {
      objet: e.verrouFourreau,
      type: "verrou",
      nom: "verrouFourreau", titre: "Verrou du fourreau",
      valeur: () => etat.fourreauBloque ? "Bloqué" : "Libéré",
      geste: "Déplacer le levier pour bloquer ou libérer",
    },
  ];
  const raycaster = new THREE.Raycaster();
  const souris = new THREE.Vector2();
  let survol = null;
  let geste = null;
  let materiaux = [];

  // Seul un bref retour d'état reste à l'écran ; les commandes sont en 3D.
  const aide = document.createElement("div");
  aide.setAttribute("role", "status");
  Object.assign(aide.style, {
    position: "absolute",
    left: "16px",
    bottom: "16px",
    maxWidth: "min(560px, calc(100vw - 32px))",
    background: "#ffffffd9",
    color: "#243b30",
    padding: "7px 10px",
    borderRadius: "5px",
    font: "12px Arial, sans-serif",
    pointerEvents: "none",
    zIndex: "10",
  });
  canvas.parentElement.append(aide);
  const infobulle = document.createElement("div");
  infobulle.setAttribute("role", "tooltip");
  Object.assign(infobulle.style, {
    position: "fixed",
    display: "none",
    maxWidth: "260px",
    padding: "6px 9px",
    borderRadius: "4px",
    background: "#20362de8",
    color: "#f7faf8",
    font: "12px/1.35 Arial, sans-serif",
    whiteSpace: "pre-line",
    pointerEvents: "none",
    zIndex: "11",
  });
  document.querySelector("#app").append(infobulle);

  function texteInfobulle(commande) {
    const titre = commande.titre || commande.nom;
    return `${titre} · ${commande.valeur()}\n${commande.geste}`;
  }
  function placerInfobulle(event) {
    if (!survol) return;
    infobulle.textContent = texteInfobulle(survol);
    infobulle.style.display = "block";
    const x = Math.min(event.clientX + 14, innerWidth - 275);
    const y = Math.min(event.clientY + 16, innerHeight - 65);
    infobulle.style.left = `${Math.max(8, x)}px`;
    infobulle.style.top = `${Math.max(8, y)}px`;
  }

  function rayon(event) {
    const r = canvas.getBoundingClientRect();
    souris.set(
      ((event.clientX - r.left) / r.width) * 2 - 1,
      (-(event.clientY - r.top) / r.height) * 2 + 1,
    );
    camera.updateMatrixWorld();
    raycaster.setFromCamera(souris, camera);
    return raycaster.ray;
  }
  function mettreEnValeur(commande) {
    if (survol === commande) return;
    // Les matériaux sont partagés par plusieurs pièces : on ne modifie que des copies.
    for (const [mesh, original, copie] of materiaux) {
      mesh.material = original;
      copie.dispose();
    }
    materiaux = [];
    survol = commande;
    if (commande)
      commande.objet.traverse((mesh) => {
        if (!mesh.isMesh || !mesh.material.emissive) return;
        const original = mesh.material;
        const copie = original.clone();
        copie.emissive.set(0x20684e);
        copie.emissiveIntensity = 0.35;
        mesh.material = copie;
        materiaux.push([mesh, original, copie]);
      });
    canvas.style.cursor = commande ? "pointer" : "grab";
    if (!commande) infobulle.style.display = "none";
  }
  function survoler(event) {
    rayon(event);
    mettreEnValeur(trouverCommande(machine, raycaster, commandes));
    placerInfobulle(event);
  }
  function debut(event) {
    if (geste) {
      event.stopImmediatePropagation();
      return;
    }
    if (event.button !== 0) return;
    rayon(event);
    const commande = trouverCommande(machine, raycaster, commandes);
    if (!commande) return; // OrbitControls gère un clic sur une zone ordinaire.
    event.preventDefault();
    event.stopImmediatePropagation();
    mettreEnValeur(commande);
    let rotation = null;
    let translation = null;
    if (["volant", "vitesse", "direction", "verrou"].includes(commande.type)) {
      rotation = commencerRotation(commande.objet, raycaster.ray);
      if (!rotation && commande.type !== "direction" && commande.axe !== "transversalX") {
        etat.message =
          "Se placer face à la commande et saisir sa poignée.";
        return;
      }
    }
    if (commande.type === "translation") {
      if (etat.poupeeBloquee) {
        etat.message = "Débloquer le levier de la poupée mobile.";
        return;
      }
      translation = commencerTranslation(
        commande.objet,
        raycaster.ray,
        camera,
        machine,
      );
      if (!translation) {
        etat.message = "Orienter la vue face au banc puis déplacer la poupée.";
        return;
      }
    }
    geste = {
      commande,
      rotation,
      translation,
      debutX: event.clientX,
      debutY: event.clientY,
      deplace: false,
      departPoupee: etat.poupeeZ,
      departAngle: commande.objet.rotation.z,
      angleCumule: 0,
      directionInitiale: etat.direction,
      pointer: event.pointerId,
      cameraActive: controls.enabled,
    };
    controls.enabled = false;
    // La capture garde le geste actif après la sortie du canvas.
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Le relâchement global remettra aussi la caméra en service.
    }
    canvas.style.cursor = "grabbing";
    placerInfobulle(event);
  }
  function bouger(event) {
    if (!geste) {
      survoler(event);
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.pointerId !== geste.pointer) return;
    if (Math.hypot(event.clientX - geste.debutX, event.clientY - geste.debutY) >= 5) geste.deplace = true;
    const ray = rayon(event),
      c = geste.commande;
    if (geste.rotation) {
      const variation = geste.rotation.tourner(ray);
      if (c.axe === "transversalX" && !geste.deplace) {
        geste.angleCumule += variation;
      } else if (c.type === "volant" && (variation !== 0 || geste.angleCumule !== 0)) {
        deplacements.regler(
          c.axe,
          etat[c.axe] + SENS_VOLANT[c.axe] * ((variation + geste.angleCumule) / (2 * Math.PI)) * c.pas,
        );
        geste.angleCumule = 0;
      } else if (c.type !== "volant") {
        geste.angleCumule += variation;
        const angle = geste.departAngle + geste.angleCumule;
        if (c.type === "vitesse") {
          // Un cran par régime identifiable sur la plaque.
          const borne = THREE.MathUtils.clamp(angle, -0.9, 0.9);
          const index = Math.round(((borne + 0.9) / 1.8) * (VITESSES.length - 1));
          if (VITESSES[index] !== etat.vitesse)
            reglerVitesseIndex(index, etat);
        } else if (c.type === "direction") {
          // Un geste parti en marche s'arrête au cran central avant l'inversion.
          const borne = THREE.MathUtils.clamp(angle, -0.65, 0.65);
          let position = CRANS_BROCHE[Math.round(borne / 0.65) + 1];
          if (
            geste.directionInitiale !== "off" &&
            position !== "off" &&
            position !== geste.directionInitiale
          )
            position = "off";
          if (position !== etat.direction) reglerDirection(position, etat);
        } else if (c.type === "verrou") {
          const verrouille = angle < 0;
          const actif = c.nom === "verrouPoupee" ? etat.poupeeBloquee : etat.fourreauBloque;
          if (verrouille !== actif) actionnerLevier(c.nom, etat);
        }
      }
    }
    if (geste.translation) {
      const distance = geste.translation.distance(ray);
      if (distance !== null)
        deplacements.regler("poupeeZ", geste.departPoupee + distance);
    }
    placerInfobulle(event);
  }
  function terminer(event, annuler = false) {
    if (
      !geste ||
      (event.pointerId !== undefined && event.pointerId !== geste.pointer)
    )
      return;
    event.stopImmediatePropagation?.();
    const ancien = geste;
    geste = null;
    controls.enabled = ancien.cameraActive;
    if (canvas.hasPointerCapture(ancien.pointer))
      canvas.releasePointerCapture(ancien.pointer);
    if (
      !annuler && !ancien.deplace &&
      Math.hypot(event.clientX - ancien.debutX, event.clientY - ancien.debutY) <
        5
    ) {
      const c = ancien.commande;
      if (c.type === "direction")
        reglerDirection(ancien.directionInitiale === "off" ? SENS_COUPE : "off", etat);
      if (c.axe === "transversalX")
        deplacements.regler(c.axe, etat[c.axe] + (event.shiftKey ? 1 : -1) * TAMBOUR_TRANSVERSAL.mmParDivision);
      if (c.type === "zero") deplacements.mettreTambourAZero();
      if (c.type === "selecteur")
        actionnerSelecteur(c.nom, etat, event.shiftKey);
      if (c.type === "levier" || c.type === "arret" || c.type === "verrou")
        actionnerLevier(c.nom, etat);
    }
    mettreEnValeur(null);
  }
  const annuler = (event) => terminer(event, true);
  const quitter = () => {
    if (!geste) mettreEnValeur(null);
  };
  const perdreFocus = () => {
    if (geste) terminer({}, true);
  };
  const perteVisibilite = () => {
    if (document.hidden) perdreFocus();
  };
  // Capture = traiter les commandes avant les événements de caméra d'OrbitControls.
  canvas.addEventListener("pointerdown", debut, true);
  canvas.addEventListener("pointermove", bouger, true);
  canvas.addEventListener("pointerup", terminer, true);
  canvas.addEventListener("pointercancel", annuler, true);
  canvas.addEventListener("lostpointercapture", annuler, true);
  canvas.addEventListener("pointerleave", quitter);
  window.addEventListener("pointerup", terminer);
  window.addEventListener("pointercancel", annuler);
  window.addEventListener("blur", perdreFocus);
  document.addEventListener("visibilitychange", perteVisibilite);

  return {
    actualiser() {
      afficherLeviers(e, etat);
      afficherSelecteurs(e, etat);
      if (survol && infobulle.style.display !== "none")
        infobulle.textContent = texteInfobulle(survol);
      const texte = etat.message;
      if (aide.textContent !== texte) aide.textContent = texte;
    },
    dispose() {
      perdreFocus();
      mettreEnValeur(null);
      aide.remove();
      infobulle.remove();
      canvas.removeEventListener("pointerdown", debut, true);
      canvas.removeEventListener("pointermove", bouger, true);
      canvas.removeEventListener("pointerup", terminer, true);
      canvas.removeEventListener("pointercancel", annuler, true);
      canvas.removeEventListener("lostpointercapture", annuler, true);
      canvas.removeEventListener("pointerleave", quitter);
      window.removeEventListener("pointerup", terminer);
      window.removeEventListener("pointercancel", annuler);
      window.removeEventListener("blur", perdreFocus);
      document.removeEventListener("visibilitychange", perteVisibilite);
    },
  };
}
