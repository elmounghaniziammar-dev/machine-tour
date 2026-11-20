// PORTE-OUTIL : le bloc de fixation, la poignée et l’outil.
// La plaquette est un petit triangle auquel on donne une épaisseur.

import * as THREE from "three";
import { group, box, cylinder, mesh, materials } from "../../utils/geometry.js";
export function creerPorteOutil() {
  const toolPost = group(
    "toolPost",
    "Tool post",
    "Clamps the turning tool at spindle center height.",
  );
  toolPost.position.set(0, 43, 0);
  box(toolPost, "toolPostBlock", [58, 64, 58], [0, 35, 0], materials.dark);
  cylinder(toolPost, "toolPostStud", 8, 18, [0, 75, 0], materials.steel, "y");
  box(
    toolPost,
    "toolPostClampHandle",
    [65, 8, 12],
    [22, 88, 0],
    materials.steel,
  );
  const tool = group(
    "tool",
    "Turning tool",
    "Presents a single carbide insert to the workpiece.",
  );
  tool.position.set(0, 42, -30);
  toolPost.add(tool);
  box(tool, "toolShank", [16, 10, 65], [0, 0, 20], materials.steel);
  // Dessiner un triangle en 2D, puis lui donner une épaisseur en 3D.
  const insertShape = new THREE.Shape();
  insertShape.moveTo(0, -30);
  insertShape.lineTo(9, -12);
  insertShape.lineTo(-9, -12);
  insertShape.closePath();
  const insert = mesh(
    tool,
    "carbideInsert",
    new THREE.ExtrudeGeometry(insertShape, { depth: 4, bevelEnabled: false }),
    materials.carbide,
    [0, 5, 0],
  );
  insert.rotation.x = Math.PI / 2;
  // Point de repère placé au bout de l’outil, à 200 mm de hauteur.
  const toolTip = group(
    "toolTip",
    "Tool tip",
    "Exact reference point for future cutting calculations.",
  );
  toolTip.position.set(0, 5, -30);
  tool.add(toolTip);
  return { toolPost, toolTip };
}
