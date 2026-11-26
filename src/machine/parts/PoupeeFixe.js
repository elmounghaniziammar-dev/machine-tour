// POUPÉE FIXE : le carter situé à gauche du tour.
// Certains boutons et leviers sont reliés aux interactions de la machine.

import * as THREE from "three";
import { group, box, cylinder, mesh, materials } from "../../utils/geometry.js";
import { bolt, plate, digits, inscription } from "./Details.js";
import { lever } from "./Volants.js";
import { creerMandrin } from "./Mandrin.js";
import { AVANCES, CRANS_BROCHE, VITESSES, creerEtatMachine } from "../../mecanique/EtatMachine.js";
import { VITESSES_SN40 } from "../../mecanique/PlaqueSN40.js";

function creerTableauReglages(root) {
  const plaques = group("sn40Plates", "Plaques TRENS SN 40");
  plaques.position.set(145, 255, 144);
  root.add(plaques);
  const tableau = plate(plaques, "speedChartSN40", [178, 94], [-38, 0, 0]);
  inscription(tableau, "chartTitle", "SN 40", [-65, 37, 2.8], 7);
  inscription(tableau, "chartUnit", "tr/min", [-65, 24, 2.8], 4.4);
  inscription(tableau, "chartRange1", "Z1 / Z2", [-15, 34, 2.8], 6);
  inscription(tableau, "chartRange2", "Z2 / Z1", [51, 34, 2.8], 6);
  for (let i = 0; i <= 6; i++) {
    box(tableau, `chartRow${i}`, [166, 0.6, 0.2], [0, 20 - i * 10.5, 2.7], materials.steel);
  }
  for (let i = 0; i < 4; i++) {
    box(tableau, `chartColumn${i}`, [0.6, 63, 0.2], [-47 + 33 * i, -11.5, 2.7], materials.steel);
  }
  VITESSES_SN40.forEach((ligne, i) => {
    ligne.forEach((regime, j) => {
      const valeur = regime === null ? "-" : String(regime).replace(".", ",");
      inscription(tableau, `sn40Cell${i}_${j}`, valeur, [-30.5 + 33 * j, 15 - 10.5 * i, 2.9], 5);
    });
  });
  // Les pictogrammes de leviers et le fragment de filetage sont repris de la photo.
  const fragment = plate(plaques, "threadChartSN40", [60, 94], [92, 0, 0]);
  if (typeof document !== "undefined") {
    const texture = new THREE.TextureLoader().load(new URL("../../assets/reference-sn40.png", import.meta.url).href);
    texture.colorSpace = THREE.SRGBColorSpace;
    const photo = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    function reporterDetail(parent, nom, largeur, hauteur, position, coins) {
      const geo = new THREE.PlaneGeometry(largeur, hauteur);
      // Coins haut gauche, haut droit, bas gauche, bas droit dans la capture.
      coins.forEach(([x, y], i) => geo.attributes.uv.setXY(i, x / 834, 1 - y / 684));
      mesh(parent, nom, geo, photo, position);
    }
    reporterDetail(fragment, "sn40ThreadPhoto", 58, 92, [0, 0, 3.1],
      [[482, 224], [580, 229], [458, 530], [580, 551]]);
    reporterDetail(tableau, "sn40RowPositions", 36, 63, [-65, -11.5, 2.9],
      [[267, 264.5], [305.4, 269], [272, 339.3], [308.7, 343.5]]);
    reporterDetail(tableau, "sn40RangePositions", 132, 6.5, [19, 23.5, 2.9],
      [[306.4, 256.3], [440.3, 267], [306.8, 269], [439.9, 281.5]]);
  }
}

export function createHeadstock() {
  const root = group(
    "headstock",
    "Headstock",
    "Houses the spindle bearings and speed gearbox.",
  );
  box(root, "headstockFoot", [340, 28, 315], [145, 14, 0], materials.bed);
  box(root, "headstockCasting", [306, 285, 282], [145, 165, 0]);
  box(root, "headstockTopCover", [302, 14, 278], [145, 311, 0]);
  box(
    root,
    "headstockLeftCover",
    [12, 256, 266],
    [-14, 165, 0],
    materials.paint,
  );
  box(root, "gearboxLowerHousing", [305, 100, 72], [145, 55, 161]);
  const panel = plate(root, "speedSelectorPlate", [252, 104], [145, 153, 144]);
  const initial = creerEtatMachine();
  for (const [i, x] of [-82, 0, 82].entries()) {
    cylinder(
      panel,
      `selectorBezel${i}`,
      20,
      8,
      [x, -7, 7],
      materials.steel,
      "z",
    );
    const l = lever(
      `headstockSelector${i}`,
      ["Régime de broche", "Sens de rotation de la broche", "Avance par tour"][i],
      30,
    );
    l.position.set(x, -7, 14);
    panel.add(l);
    inscription(panel, `selectorLabel${i}`,
      ["Broche (tr/min)", "Sens broche", "Avance (mm/tr)"][i], [x, -39, 2.8], 5.5);
    const positions = [VITESSES, CRANS_BROCHE, AVANCES][i];
    const amplitude = [0.9, 0.65, 0.75][i];
    const courant = [initial.vitesse, initial.direction, initial.avance][i];
    l.rotation.z = -amplitude + 2 * amplitude * positions.indexOf(courant) / (positions.length - 1);
    positions.forEach((_, cran) => {
      const angle = -amplitude + 2 * amplitude * cran / (positions.length - 1);
      const repere = box(panel, `selectorMark${i}_${cran}`, [1.4, 5, 1],
        [x - 39 * Math.sin(angle), -7 + 39 * Math.cos(angle), 4], materials.steel);
      repere.rotation.z = angle;
    });
    if (i === 0) {
      // Les segments 250 gardent leurs noms ; les autres valeurs partagent l'afficheur.
      const affichage = digits(panel, "selectorNumber0", "250", [x, 43, 4], 7);
      for (const segment of affichage.children) segment.userData.rpm = 250;
      for (const vitesse of VITESSES.filter((nombre) => nombre !== 250)) {
        const chiffres = digits(
          affichage,
          `selectorSpeedDigits${vitesse}`,
          String(vitesse),
          [0, 0, 0],
          7,
        );
        chiffres.userData.rpm = vitesse;
        chiffres.visible = false;
      }
    } else if (i === 1) {
      const sens = { ccw: "AV", off: "0", cw: "AR" };
      CRANS_BROCHE.forEach((direction, cran) => {
        const angle = -amplitude + 2 * amplitude * cran / (CRANS_BROCHE.length - 1);
        inscription(panel, `selectorDirection${cran}`, sens[direction],
          [x - 49 * Math.sin(angle), -7 + 49 * Math.cos(angle), 3], 5);
      });
    } else {
      const lecture = group("selectorFeedReading", "Avance sélectionnée");
      panel.add(lecture);
      AVANCES.forEach((avance, cran) => {
        const texte = avance.toFixed(2).replace(".", ",");
        const valeur = inscription(lecture, `selectorFeedReading${cran}`, texte, [x, 43, 3], 7);
        valeur.userData.avance = avance;
        valeur.visible = avance === initial.avance;
      });
      l.lectureAvance = lecture;
    }
  }
  creerTableauReglages(root);
  cylinder(
    root,
    "powerSwitchBezel",
    18,
    10,
    [247, 70, 204],
    materials.dark,
    "z",
  );
  cylinder(
    root,
    "emergencyStopButton",
    13,
    17,
    [247, 70, 216],
    materials.red,
    "z",
  );
  cylinder(
    root,
    "spindleOilSightRim",
    11,
    5,
    [282, 275, 146],
    materials.steel,
    "z",
  );
  cylinder(
    root,
    "spindleOilSightGlass",
    7,
    6,
    [282, 275, 149],
    materials.brass,
    "z",
  );
  for (let i = 0; i < 7; i++)
    box(
      root,
      `motorVent${i}`,
      [75, 4, 2],
      [47, 135 + i * 8, 143],
      materials.dark,
    );
  for (const [i, x] of [15, 275].entries())
    for (const [j, z] of [-131, 131].entries())
      bolt(root, `headstockTopBolt${i}${j}`, [x, 320, z], "y", 4);
  const { spindle, workpiece } = creerMandrin();
  root.add(spindle);
  return { root, spindle, workpiece };
}
