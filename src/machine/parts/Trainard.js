// TRAINARD : la base qui porte les chariots et le tablier avant.
// Les positions des petites pièces sont relatives à cette base.

import { group, box, cylinder, materials } from "../../utils/geometry.js";
import { bolt } from "./Details.js";
import { handwheel, crossDial, lever } from "./Volants.js";
import { creerChariots } from "./Chariots.js";
export function createCarriage() {
  const root = group(
    "carriage",
    "Carriage",
    "Carries the complete tool assembly along machine X.",
  );
  box(root, "saddle", [230, 40, 310], [0, 20, 0], materials.bed);
  const apron = group(
    "apron",
    "Apron",
    "Houses the carriage drive and feed engagement.",
  );
  root.add(apron);
  box(apron, "apronHousing", [210, 130, 65], [0, -48, 185]);
  box(root, "crossSlideGuide", [125, 30, 295], [0, 55, 40], materials.steel);
  const { crossSlide, compoundRest, toolPost, toolTip } = creerChariots();
  root.add(crossSlide);
  // Ajouter les détails fixes : glissières, vis, volants et leviers.
  for (const [i, x] of [-67, 67].entries()) {
    box(
      root,
      `crossSlideDovetail${i}`,
      [9, 8, 280],
      [x, 70, 40],
      materials.steel,
    );
    for (let j = 0; j < 4; j++)
      bolt(root, `saddleGibBolt${i}${j}`, [x, 58, -60 + j * 55], "y", 3);
  }
  for (const [i, z] of [-122, 122].entries()) {
    box(root, `saddleWayWiper${i}`, [230, 6, 28], [0, 3, z], materials.dark);
    for (const [j, x] of [-95, 95].entries())
      bolt(root, `saddleFixing${i}${j}`, [x, 42, z], "y", 5);
  }
  for (const [i, x] of [-59, 59].entries())
    box(
      compoundRest,
      `compoundGuideEdge${i}`,
      [8, 8, 102],
      [x, 10, 0],
      materials.steel,
    );
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    const mark = box(
      compoundRest,
      `compoundAngleMark${i}`,
      [0.7, 1, 5],
      [Math.sin(a) * 60, 8, Math.cos(a) * 60],
      materials.dark,
    );
    mark.rotation.y = a;
  }
  for (let i = 0; i < 3; i++)
    bolt(toolPost, `toolClampBolt${i}`, [-18 + i * 18, 69, 0], "y", 5);
  const wheel = handwheel("carriageHandwheel", 49);
  wheel.position.set(-57, -56, 246);
  root.add(wheel);
  cylinder(
    root,
    "carriageHandwheelShaft",
    12,
    36,
    [-57, -56, 228],
    materials.steel,
    "z",
  );
  const crossWheel = handwheel("crossSlideHandwheel", 36);
  crossWheel.position.set(0, 61, 255);
  root.add(crossWheel);
  cylinder(
    root,
    "crossSlideScrewBearing",
    20,
    47,
    [0, 61, 218],
    materials.steel,
    "z",
  );
  const dial = crossDial();
  dial.position.z = -19;
  crossWheel.add(dial);
  box(root, "crossDialReference", [2, 7, 5], [0, 97, 238], materials.dark);
  const compoundWheel = handwheel("compoundHandwheel", 22);
  compoundWheel.position.set(0, 22, 91);
  compoundRest.add(compoundWheel);
  cylinder(
    compoundRest,
    "compoundScrewEnd",
    8,
    35,
    [0, 22, 70],
    materials.steel,
    "z",
  );
  const feedLever = lever("apronFeedLever", "Feed engagement lever", 32);
  feedLever.position.set(67, -25, 224);
  feedLever.rotation.z = 0.55;
  root.add(feedLever);
  const halfNut = lever("halfNutLever", "Half-nut lever", 35);
  halfNut.position.set(67, -79, 224);
  halfNut.rotation.z = -0.65;
  root.add(halfNut);
  for (const [i, x] of [-91, 91].entries())
    for (const [j, y] of [-98, -2].entries())
      bolt(apron, `apronCoverBolt${i}${j}`, [x, y, 220], "z", 4);
  cylinder(
    apron,
    "apronOilSightRim",
    9,
    5,
    [5, -65, 222],
    materials.steel,
    "z",
  );
  cylinder(
    apron,
    "apronOilSightGlass",
    6,
    6,
    [5, -65, 225],
    materials.brass,
    "z",
  );
  return { root, crossSlide, compoundRest, toolTip };
}
