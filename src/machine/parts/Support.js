// SUPPORT : les deux armoires et leurs pieds.
// La boucle construit une armoire à gauche et une à droite.

import { group, box, cylinder, materials } from "../../utils/geometry.js";
export function createStand() {
  const root = group(
    "stand",
    "Cabinet stand",
    "Supports the machine and provides workshop storage.",
  );
  for (const [i, x] of [110, 1165].entries()) {
    box(root, `cabinetBody${i}`, [300, 500, 380], [x, -422, 5]);
    box(root, `cabinetBase${i}`, [326, 45, 410], [x, -680, 5], materials.dark);
    box(
      root,
      `cabinetDoorGap${i}`,
      [253, 394, 4],
      [x, -419, 198],
      materials.dark,
    );
    box(root, `cabinetDoor${i}`, [242, 384, 8], [x, -419, 202]);
    box(
      root,
      `cabinetDoorHandle${i}`,
      [12, 70, 15],
      [x + 87, -342, 215],
      materials.dark,
    );
    for (let j = 0; j < 6; j++)
      box(
        root,
        `cabinetVent${i}Slot${j}`,
        [118, 4, 3],
        [x - 22, -510 - j * 10, 208],
        materials.dark,
      );
    for (const [j, z] of [-150, 160].entries())
      for (const [k, dx] of [-110, 110].entries()) {
        cylinder(
          root,
          `levelingFoot${i}${j}${k}`,
          27,
          14,
          [x + dx, -711, z],
          materials.dark,
          "y",
        );
        cylinder(
          root,
          `levelingStud${i}${j}${k}`,
          8,
          22,
          [x + dx, -697, z],
          materials.steel,
          "y",
        );
      }
  }
  box(
    root,
    "standRearBrace",
    [780, 100, 50],
    [640, -570, -160],
    materials.paint,
  );
  return root;
}
