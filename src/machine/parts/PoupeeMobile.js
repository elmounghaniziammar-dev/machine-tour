// POUPÉE MOBILE : le support à droite de la pièce.
// Le fourreau et la pointe sont alignés avec le centre du mandrin.

import { group, box, cylinder, materials } from "../../utils/geometry.js";
import { taperedCasting, bolt } from "./Details.js";
import { handwheel, lever } from "./Volants.js";
export function createTailstock() {
  const root = group(
    "tailstock",
    "Tailstock",
    "Supports the free end of the workpiece with a live center.",
  );
  box(root, "tailstockLowerShoe", [220, 25, 266], [0, 12.5, 0], materials.bed);
  box(root, "tailstockUpperBase", [205, 18, 225], [0, 34, 0], materials.steel);
  taperedCasting(
    root,
    "tailstockCasting",
    [
      [-87, 45],
      [78, 45],
      [78, 172],
      [40, 215],
      [-65, 215],
      [-91, 176],
    ],
    132,
    [0, 0, -66],
  );
  cylinder(root, "tailstockBarrel", 47, 195, [0, 200, 0], materials.paint);
  cylinder(root, "tailstockRearCap", 45, 8, [101, 200, 0], materials.bed);
  cylinder(root, "quillFrontBushing", 32, 13, [-103, 200, 0], materials.steel);
  // Le fourreau est le cylindre qui sort de la poupée mobile.
  const quill = group(
    "quill",
    "Quill",
    "Steel sliding sleeve supporting the center taper.",
  );
  quill.position.set(-160, 200, 0);
  root.add(quill);
  cylinder(quill, "quillShaft", 24, 150, [65, 0, 0]);
  for (let i = 0; i < 9; i++)
    box(
      quill,
      `quillGraduation${i}`,
      [0.6, 2, i % 2 ? 5 : 9],
      [i * 5 + 5, 24, 0],
      materials.dark,
    );
  // La pointe conique soutient le bout de la pièce.
  const liveCenter = group(
    "liveCenter",
    "Live center",
    "Conical support aligned with the spindle axis.",
  );
  quill.add(liveCenter);
  cylinder(
    liveCenter,
    "liveCenterBearing",
    29,
    28,
    [-19, 0, 0],
    materials.dark,
  );
  cylinder(liveCenter, "liveCenterCollar", 25, 7, [-36, 0, 0], materials.steel);
  cylinder(
    liveCenter,
    "liveCenterPoint",
    25,
    40,
    [-56, 0, 0],
    materials.steel,
    "x",
    0,
  );
  const wheel = handwheel("tailstockHandwheel", 38);
  wheel.position.set(145, 200, 0);
  wheel.rotation.y = Math.PI / 2;
  root.add(wheel);
  cylinder(root, "tailstockHandwheelShaft", 10, 45, [122, 200, 0]);
  const lock = lever("tailstockLockLever", "Tailstock bed lock", 62);
  lock.position.set(32, 104, 79);
  lock.rotation.z = -0.75;
  root.add(lock);
  const quillLock = lever("quillLockLever", "Quill clamp", 36);
  quillLock.position.set(-30, 222, 37);
  quillLock.rotation.z = 0.6;
  root.add(quillLock);
  for (const [i, x] of [-72, 68].entries())
    bolt(root, `tailstockBaseBolt${i}`, [x, 44, 88], "y", 5);
  cylinder(
    root,
    "tailstockSetoverScrew",
    8,
    12,
    [0, 33, 124],
    materials.steel,
    "z",
  );
  return { root, quill };
}
