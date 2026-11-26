// Rayons en mm dans le repère tournant de la pièce. Chaque échantillon
// représente un secteur angulaire et une bande axiale centrée sur son abscisse.
export const BRUT = Object.freeze({ longueur: 150, rayon: 20, pas: 0.25, secteurs: 48 });
export const TOUR = 2 * Math.PI;
// Profil de la plaquette à charioter, en X (axial) et Z (radial) depuis le bec.
// L'arête de finition de 0,8 mm recouvre l'avance maximale de 0,4 mm/tr.
export const PLAQUETTE = [[-5, 18], [0, 0], [0.8, 0], [9, 18]];
export const CENTRAGE = { profondeur: 3, pente: Math.tan(Math.PI / 6) };

export function creerProfil() {
  const { longueur, rayon, pas, secteurs } = BRUT;
  const dernier = Math.round(longueur / pas);
  const rayons = new Float64Array((dernier + 1) * secteurs).fill(rayon);
  let volume = 0;
  const contact = { x: 0, r: rayon };
  let debutModifie = Infinity;
  let finModifie = -1;

  function diametre(x) {
    if (x < 0 || x > longueur) return null;
    const i = Math.round(x / pas) * secteurs;
    // Diamètre d'enveloppe : une révolution partielle laisse des secteurs bruts.
    let maxi = 0;
    for (let j = 0; j < secteurs; j++) maxi = Math.max(maxi, rayons[i + j]);
    return 2 * maxi;
  }

  // Les arêtes de coupe et de finition suivent l’orientation du petit chariot.
  function couperSecteur(j, x, r, aretes) {
    let enleve = 0;
    for (const bord of aretes) {
      if (Math.abs(bord.x) < 1e-10) continue;
      const debut = x + bord.debutX;
      const xFin = debut + bord.x;
      const min = Math.max(0, Math.ceil(Math.min(debut, xFin) / pas));
      const max = Math.min(dernier, Math.floor(Math.max(debut, xFin) / pas));
      for (let i = min; i <= max; i++) {
        const apres = Math.max(0, r + bord.debutZ + (i * pas - debut) * bord.z / bord.x);
        const k = i * secteurs + j;
        const avant = rayons[k];
        if (apres >= avant) continue;
        rayons[k] = apres;
        contact.x = i * pas;
        contact.r = apres;
        const largeur = i === 0 || i === dernier ? pas / 2 : pas;
        enleve += Math.PI / secteurs * largeur * (avant * avant - apres * apres);
        debutModifie = Math.min(debutModifie, i);
        finModifie = Math.max(finModifie, i);
      }
    }
    return enleve;
  }

  // Sur la face avant, l'angle matériel au contact est l'angle de broche.
  // Interpoler la position du bec à chaque passage préserve la trace hélicoïdale.
  function balayer(depart, fin, angle, rotation, aretes) {
    if (rotation <= 0 || Math.min(depart.r, fin.r) >= rayon &&
        aretes.every(bord => Math.min(bord.debutZ, bord.debutZ + bord.z) >= 0)) return 0;
    const unite = TOUR / secteurs;
    const phase = angle / unite;
    const balayage = rotation / unite;
    let premier = Math.floor(phase + 1e-9) + 1;
    const dernierSecteur = Math.floor(phase + balayage + 1e-9);
    if (depart.x === fin.x && depart.r === fin.r)
      premier = Math.max(premier, dernierSecteur - secteurs + 1);
    let enleve = 0;
    for (let s = premier; s <= dernierSecteur; s++) {
      const t = Math.min(1, (s - phase) / balayage);
      const j = ((s % secteurs) + secteurs) % secteurs;
      enleve += couperSecteur(j, depart.x + (fin.x - depart.x) * t,
        depart.r + (fin.r - depart.r) * t, aretes);
    }
    volume += enleve;
    return enleve;
  }

  function prendreModifications() {
    if (finModifie < 0) return null;
    const plage = [debutModifie, finModifie];
    debutModifie = Infinity;
    finModifie = -1;
    return plage;
  }
  return { rayons, dernier, diametre, balayer, prendreModifications, contact, get volume() { return volume; } };
}
