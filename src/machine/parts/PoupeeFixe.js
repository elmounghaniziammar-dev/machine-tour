// POUPÉE FIXE : le carter situé à gauche du tour.
// Certains boutons et leviers sont reliés aux interactions de la machine.

import { group, box, cylinder, materials } from "../../utils/geometry.js";
import { bolt, plate, digits } from "./Details.js";
import { lever } from "./Volants.js";
import { creerMandrin } from "./Mandrin.js";
import { VITESSES } from "../../mecanique/EtatMachine.js";
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
  const panel = plate(root, "speedSelectorPlate", [252, 110], [145, 215, 144]);
  for (const [i, x] of [-70, 15, 87].entries()) {
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
      ["Spindle speed lever", "Gear range lever", "Feed selector lever"][i],
      30,
    );
    l.position.set(x, -7, 14);
    l.rotation.z = [-0.7, 0.6, -0.25][i];
    panel.add(l);
    if (i === 0) {
      // Les segments 250 gardent leurs noms ; les autres valeurs partagent l'afficheur.
      const affichage = digits(panel, "selectorNumber0", "250", [x, 35, 4], 6);
      for (const segment of affichage.children) segment.userData.rpm = 250;
      for (const vitesse of VITESSES.filter((nombre) => nombre !== 250)) {
        const chiffres = digits(
          affichage,
          `selectorSpeedDigits${vitesse}`,
          String(vitesse),
          [0, 0, 0],
          6,
        );
        chiffres.userData.rpm = vitesse;
        chiffres.visible = false;
      }
    } else {
      digits(panel, `selectorNumber${i}`, ["250", "500", "1000"][i], [x, 35, 4], 6);
    }
  }
  const feed = plate(root, "feedChartPlate", [150, 43], [112, 73, 200]);
  for (let j = 0; j < 3; j++)
    box(
      feed,
      `chartHorizontal${j}`,
      [130, 0.4, 0.3],
      [0, 10 - j * 10, 3],
      materials.steel,
    );
  for (let j = 0; j < 6; j++)
    box(
      feed,
      `chartVertical${j}`,
      [0.4, 32, 0.3],
      [-61 + j * 24, 0, 3],
      materials.steel,
    );
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
    [258, 286, 146],
    materials.steel,
    "z",
  );
  cylinder(
    root,
    "spindleOilSightGlass",
    7,
    6,
    [258, 286, 149],
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
