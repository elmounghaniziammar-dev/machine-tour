// PORTE-OUTIL : le bloc de fixation, la poignée et l’outil.

import * as THREE from "three";
import { group, box, cylinder, mesh, materials } from "../../utils/geometry.js";
import { PLAQUETTE } from "../../mecanique/ProfilPiece.js";
export function creerPorteOutil() {
  const toolPost = group(
    "toolPost",
    "Tool post",
    "Clamps the turning tool at spindle center height.",
  );
  toolPost.position.set(-14, 43, -20);
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
  tool.position.set(-12, 42, -30);
  toolPost.add(tool);
  box(tool, "toolShank", [16, 10, 65], [2, 0, 20], materials.steel);
  // Extruder le même profil que celui utilisé pour l’enlèvement de matière.
  const insertShape = new THREE.Shape();
  insertShape.moveTo(PLAQUETTE[0][0], PLAQUETTE[0][1] - 30);
  for (const [x, z] of PLAQUETTE.slice(1)) insertShape.lineTo(x, z - 30);
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
    "Reference point on the cutting edge at spindle centre height.",
  );
  toolTip.position.set(0, 5, -30);
  tool.add(toolTip);
  return { toolPost, toolTip };
}
