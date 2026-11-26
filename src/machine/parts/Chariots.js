// CHARIOTS : le chariot transversal et le petit chariot supérieur.
// Le porte-outil est ajouté comme enfant du petit chariot.

import { group, box, cylinder, materials } from "../../utils/geometry.js";
import { creerPorteOutil } from "./PorteOutil.js";
export function creerChariots() {
  const crossSlide = group(
    "crossSlide",
    "Cross-slide",
    "Moves the tool radially along machine Z.",
  );
  box(
    crossSlide,
    "crossSlideTable",
    [115, 35, 220],
    [13, 87, 65],
    materials.bed,
  );
  const compoundRest = group(
    "compoundRest",
    "Compound rest",
    "Rotates the top-slide assembly about the vertical axis.",
  );
  compoundRest.position.set(26, 110, 80);
  crossSlide.add(compoundRest);
  cylinder(
    compoundRest,
    "compoundSwivelBase",
    47,
    15,
    [0, 0, 0],
    materials.steel,
    "y",
  );
  box(compoundRest, "compoundSlide", [110, 28, 76], [12, 22, 0]);
  const { toolPost, toolTip } = creerPorteOutil();
  compoundRest.add(toolPost);
  return { crossSlide, compoundRest, toolPost, toolTip };
}
