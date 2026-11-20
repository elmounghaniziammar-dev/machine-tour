// BANC : les deux glissières, les traverses, la vis mère et le bac.
// La vis mère utilise une courbe en hélice pour représenter son filet.

import * as THREE from "three";
import { group, box, cylinder, mesh, materials } from "../../utils/geometry.js";
import { bolt } from "./Details.js";
export function createBed() {
  const root = group(
    "bed",
    "Cast-iron bed",
    "Keeps the spindle, carriage and tailstock aligned.",
  );
  for (const [i, z] of [-105, 105].entries()) {
    box(
      root,
      `bedLongitudinalBeam${i}`,
      [1300, 95, 72],
      [650, -62, z],
      materials.paint,
    );
    const section = new THREE.Shape();
    section.moveTo(-20, -10);
    section.lineTo(20, -10);
    section.lineTo(20, 0);
    section.lineTo(0, 12);
    section.lineTo(-20, 0);
    section.closePath();
    const rail = mesh(
      root,
      `prismaticWay${i}`,
      new THREE.ExtrudeGeometry(section, { depth: 1280, bevelEnabled: false }),
      materials.steel,
      [10, -12, z],
    );
    rail.rotation.y = Math.PI / 2;
  }
  box(root, "bedLowerWeb", [1300, 20, 270], [650, -117, 0], materials.bed);
  for (let i = 0; i < 8; i++)
    box(
      root,
      `bedCrossRib${i}`,
      [25, 75, 230],
      [25 + i * 178, -70, 0],
      materials.paint,
    );
  cylinder(root, "leadScrewCore", 8, 1050, [790, -61, 182]);
  class ThreadCurve extends THREE.Curve {
    constructor() {
      super();
    }
    getPoint(t, target = new THREE.Vector3()) {
      const a = ((t * 1050) / 6) * Math.PI * 2;
      return target.set(
        265 + t * 1050,
        -61 + 9 * Math.cos(a),
        182 + 9 * Math.sin(a),
      );
    }
  }
  mesh(
    root,
    "leadScrewHelix",
    new THREE.TubeGeometry(new ThreadCurve(), 2800, 1.1, 4, false),
    materials.steel,
  );
  cylinder(root, "feedRod", 7, 1050, [790, -98, 182], materials.steel);
  for (const [i, x] of [275, 1285].entries()) {
    box(root, `shaftBearingBlock${i}`, [36, 70, 35], [x, -80, 182]);
    bolt(root, `shaftBearingBolt${i}`, [x, -80, 202], "z", 5);
  }
  // Le bac possède un fond et quatre rebords pour donner son épaisseur.
  box(root, "dripTray", [1430, 14, 510], [640, -160, 25], materials.bed);
  box(root, "trayFrontLip", [1430, 40, 12], [640, -146, 274], materials.paint);
  box(root, "trayRearLip", [1430, 55, 12], [640, -138, -224], materials.paint);
  for (const [i, x] of [-69, 1349].entries())
    box(root, `trayEndLip${i}`, [12, 40, 500], [x, -146, 25], materials.paint);
  return root;
}
