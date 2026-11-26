import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { creerMachine } from "./machine/Machine.js";
import "./style.css";
import { creerEtatMachine } from "./mecanique/EtatMachine.js";
import { creerDeplacements } from "./mecanique/Deplacements.js";
import { creerBroche } from "./mecanique/Broche.js";
import { installerInteractions } from "./interactions/Selection.js";
import { installerPanneau } from "./interactions/PanneauUsinage.js";
import { creerCopeaux } from "./machine/parts/Copeaux.js";
// 1. Créer la surface de dessin et vérifier la disponibilité de la 3D.
const canvas = document.createElement("canvas");
const vue = document.querySelector("#vue");
vue.append(canvas);
const context = canvas.getContext("webgl2", { antialias: true });
if (!context) {
  document.querySelector("#app").innerHTML =
    '<p class="notice">Ce simulateur nécessite WebGL2. Ouvrir la page dans un navigateur avec accélération graphique.</p>';
} else {
  // 2. La scène contient la machine, le sol et les lumières.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8eceb);
  // Le renderer dessine la scène dans le navigateur.
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    antialias: true,
  });
  renderer.setSize(vue.clientWidth, vue.clientHeight, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  // 3. La caméra représente notre point de vue.
  const camera = new THREE.PerspectiveCamera(
    36,
    vue.clientWidth / vue.clientHeight,
    1,
    15000,
  );
  camera.position.set(1810, 780, 1920);
  // OrbitControls permet de tourner autour avec la souris et de zoomer.
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(630, -180, 0);
  controls.enableDamping = true;
  controls.minDistance = 180;
  controls.maxDistance = 4500;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.update();
  // 4. Créer des reflets de studio sur le métal, sans image externe.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.05);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.8;
  room.dispose();
  pmrem.dispose();
  // 5. Éclairer la machine : lumière générale + lumière avec ombres.
  scene.add(new THREE.HemisphereLight(0xf8fcff, 0x6d7972, 1.7));
  const sun = new THREE.DirectionalLight(0xfff5e6, 3.5);
  sun.position.set(200, 1700, 1000);
  sun.target.position.set(650, -150, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -1100,
    right: 1100,
    top: 1000,
    bottom: -1000,
    near: 1,
    far: 4000,
  });
  sun.shadow.normalBias = 1;
  scene.add(sun, sun.target);
  // 6. Ajouter le sol sous les pieds de la machine.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    new THREE.MeshStandardMaterial({ color: 0xdce2df, roughness: 0.95 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -720;
  floor.receiveShadow = true;
  scene.add(floor);
  // 7. Récupérer les objets existants, puis brancher mécanique et interactions.
  const machine = creerMachine();
  scene.add(machine);
  const etat = creerEtatMachine();
  const deplacements = creerDeplacements(machine.elements, etat);
  const broche = creerBroche(machine.elements, etat, deplacements);
  const copeaux = creerCopeaux(machine);
  scene.add(copeaux.objet);
  const pointVue = new THREE.Vector3();
  let vueActive = "ensemble", xPrecedent = 0;
  const panneau = installerPanneau(etat, broche, deplacements, choix => {
    vueActive = choix;
    if (choix === "coupe") {
      machine.elements.bec.getWorldPosition(pointVue);
      xPrecedent = pointVue.x;
      controls.target.copy(pointVue).x -= 12;
      camera.position.copy(controls.target).add(new THREE.Vector3(32, 205, 72));
    } else if (choix === "trainard") {
      machine.elements.volantTransversal.getWorldPosition(controls.target);
      controls.target.add(new THREE.Vector3(12, 5, -90));
      camera.position.copy(controls.target).add(new THREE.Vector3(115, 140, 550));
    } else if (choix === "tambour") {
      machine.elements.tambourTransversal.getWorldPosition(controls.target);
      camera.position.copy(controls.target).add(new THREE.Vector3(59, 86, 184));
    } else if (choix === "plaque") {
      machine.getObjectByName("sn40Plates").getWorldPosition(controls.target);
      camera.position.copy(controls.target).add(new THREE.Vector3(0, 0, 430));
    } else {
      controls.target.set(630, -180, 0);
      camera.position.set(1810, 780, 1920);
    }
    controls.update();
  });
  const interactions = installerInteractions(
    machine,
    camera,
    canvas,
    controls,
    etat,
    deplacements,
  );
  const clock = new THREE.Clock();

  // 8. Les mouvements sont calculés avec le temps écoulé, en secondes.
  function frame() {
    const dt = clock.getDelta();
    if (!document.hidden) {
      const profil = machine.elements.piece.profil;
      const avant = profil.volume;
      broche.actualiser(dt);
      if (vueActive === "coupe") {
        machine.elements.bec.getWorldPosition(pointVue);
        camera.position.x += pointVue.x - xPrecedent;
        controls.target.x += pointVue.x - xPrecedent;
        xPrecedent = pointVue.x;
      }
      machine.elements.piece.actualiserSurface();
      const enleve = profil.volume - avant;
      const vitesseSurface = 2 * Math.PI * profil.contact.r * etat.vitesse / 60;
      copeaux.actualiser(dt, enleve, vitesseSurface);
      panneau.actualiser(dt, enleve);
    }
    // Pendant un geste mécanique, la caméra reste immobile.
    if (controls.enabled) controls.update();
    interactions.actualiser();
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);
  // Éviter un saut de position lorsqu'on revient sur l'onglet.
  const reprendre = () => clock.getDelta();
  document.addEventListener("visibilitychange", reprendre);
  const taille = new ResizeObserver(() => {
    camera.aspect = vue.clientWidth / Math.max(1, vue.clientHeight);
    // Garder la pièce et ses deux appuis visibles dans une vue étroite.
    camera.zoom = Math.min(1, camera.aspect / 1.25);
    camera.updateProjectionMatrix();
    renderer.setSize(vue.clientWidth, vue.clientHeight, false);
  });
  taille.observe(vue);
  if (import.meta.hot)
    import.meta.hot.dispose(() => {
      renderer.setAnimationLoop(null);
      interactions.dispose();
      panneau.dispose();
      copeaux.dispose();
      taille.disconnect();
      canvas.remove();
      controls.dispose();
      environment.dispose();
      renderer.dispose();
      document.removeEventListener("visibilitychange", reprendre);
    });
}
