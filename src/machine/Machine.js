import { group } from "../utils/geometry.js";
import { createBed } from "./parts/Banc.js";
import { createStand } from "./parts/Support.js";
import { createHeadstock } from "./parts/PoupeeFixe.js";
import { createCarriage } from "./parts/Trainard.js";
import { createTailstock } from "./parts/PoupeeMobile.js";

// Cette fonction assemble les grandes parties de la machine.
// Chaque fonction importée construit une partie dans son propre fichier.
export function creerMachine() {
  const machine = group("machine", "Conventional engine lathe");

  // 1. Construire les différentes parties.
  const support = createStand();
  const banc = createBed();
  const poupeeFixe = createHeadstock();
  const trainard = createCarriage();
  const poupeeMobile = createTailstock();

  // 2. Placer les parties sur le banc. Les valeurs sont en millimètres.
  // X Three.js = longueur du banc ; Y = hauteur ; Z = profondeur.
  trainard.root.position.x = 565;
  trainard.crossSlide.position.z = 20;
  poupeeMobile.root.position.x = 826;

  // 3. Ajouter toutes les parties au même groupe.
  machine.add(support, banc, poupeeFixe.root, trainard.root, poupeeMobile.root);
  // Nouveau groupe mobile : la semelle circulaire du petit chariot reste fixe.
  const compound = machine.getObjectByName("compoundRest");
  const dessus = group("compoundMovingSlide", "Compound moving slide");
  compound.add(dessus);
  dessus.add(machine.getObjectByName("compoundSlide"));
  dessus.add(machine.getObjectByName("toolPost"));

  // La vis tourne autour de son propre axe, pas autour de l'origine du banc.
  const vis = group("leadScrewDrive", "Lead screw drive");
  vis.position.set(790, -61, 182);
  banc.add(vis);
  machine.updateMatrixWorld(true);
  vis.attach(machine.getObjectByName("leadScrewCore"));
  vis.attach(machine.getObjectByName("leadScrewHelix"));

  // Références aux objets existants : aucun fichier de parts à modifier.
  function trouver(nom) {
    const objet = machine.getObjectByName(nom);
    if (!objet) throw new Error(`Missing machine part: ${nom}`);
    return objet;
  }
  machine.elements = {
    broche: trouver("spindle"),
    trainard: trouver("carriage"),
    transversal: trouver("crossSlide"),
    chariotSuperieur: dessus,
    poupee: trouver("tailstock"),
    corpsPoupee: trouver("tailstockCasting"),
    fourreau: trouver("quill"),
    pointe: trouver("liveCenter"),
    visMere: vis,
    barre: trouver("feedRod"),
    volantTrainard: trouver("carriageHandwheel"),
    volantTransversal: trouver("crossSlideHandwheel"),
    volantSuperieur: trouver("compoundHandwheel"),
    volantFourreau: trouver("tailstockHandwheel"),
    selecteurVitesse: trouver("headstockSelector0"),
    levierDirection: trouver("headstockSelector1"),
    selecteurAvance: trouver("headstockSelector2"),
    arret: trouver("emergencyStopButton"),
    levierAvance: trouver("apronFeedLever"),
    levierDemiNoix: trouver("halfNutLever"),
    verrouPoupee: trouver("tailstockLockLever"),
    verrouFourreau: trouver("quillLockLever"),
  };
  machine.elements.levierDirection.userData.label =
    "Spindle start / stop / direction";
  machine.elements.levierDirection.userData.functionText =
    "Drag to forward, stop or reverse; release at stop before reversing.";
  machine.elements.selecteurVitesse.userData.label = "Spindle speed selector";
  machine.elements.selecteurAvance.userData.label = "Feed selector";
  return machine;
}
