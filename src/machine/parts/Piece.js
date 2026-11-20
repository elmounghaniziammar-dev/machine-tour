// PIÈCE : un cylindre représentant la matière à usiner.
// Il est seulement affiché : aucun usinage n’est simulé.

import { group, cylinder, materials } from "../../utils/geometry.js";
// La pièce est un simple cylindre de diamètre 40 mm et de longueur 150 mm.
export function creerPiece() {
  const piece = group(
    "workpiece",
    "Round workpiece",
    "Illustrates the stock held in the chuck.",
  );
  cylinder(piece, "workpieceBlank", 20, 150, [75, 0, 0], materials.steel);
  return piece;
}
