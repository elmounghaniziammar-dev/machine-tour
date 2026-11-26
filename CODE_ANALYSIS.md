# Code analysis: Tour parallèle

This report records the kinematic model before machining was added. For the current cutting model, operations and validation commands, see the [project README](README.md).

## Scope and summary

This report covers the unpacked Vite project in this directory. It is an interactive Three.js model of a conventional engine lathe. The scene has 441 objects, including 372 meshes. Its controls move machine assemblies, rotate the spindle, and drive a simplified automatic feed. It does not simulate material removal.

The code separates scene construction, mechanical state, collision constraints, and pointer interaction. The movable assemblies are rigid scene-graph groups. A swept contact check now prevents the demonstrated live-center/workpiece penetration and collisions between the major assemblies. This is a kinematic model rather than a mass-and-force physics simulation.

## Architecture

| Area | Responsibility | Main files |
| --- | --- | --- |
| Application | WebGL2 check, renderer, camera, lights, floor, animation loop | [`src/main.js`](src/main.js), [`index.html`](index.html) |
| Machine model | Assemble the lathe and expose named movable parts | [`src/machine/Machine.js`](src/machine/Machine.js), `src/machine/parts/` |
| Geometry | Shared materials and helpers for groups, boxes, cylinders, and meshes | [`src/utils/geometry.js`](src/utils/geometry.js) |
| Mechanical state | Speeds, feed rates, axis positions, locks, and travel bounds | [`src/mecanique/EtatMachine.js`](src/mecanique/EtatMachine.js), [`src/mecanique/Limites.js`](src/mecanique/Limites.js) |
| Collision constraints | Stop each guided axis at its first estimated cross-assembly contact | [`src/mecanique/Collisions.js`](src/mecanique/Collisions.js) |
| Motion | Apply axis positions and wheel rotations; advance spindle and feed with elapsed time | [`src/mecanique/Deplacements.js`](src/mecanique/Deplacements.js), [`src/mecanique/Broche.js`](src/mecanique/Broche.js) |
| Interaction | Raycast visible controls, handle pointer gestures and clicks, show help/status | [`src/interactions/Selection.js`](src/interactions/Selection.js), other files in `src/interactions/` |

`src/main.js:83-108` creates the machine, state, movement controller, spindle controller, and interaction controller in that order. Each animation frame advances the spindle, updates the camera and control display, and renders the scene. `Machine.js:49-72` collects named scene objects into `machine.elements`, which keeps the mechanical modules separate from the mesh construction files.

The model uses millimetres as Three.js units: scene X runs along the bed, Y is height, and Z is the transverse direction. The state tracks carriage, cross-slide, compound slide, tailstock, and quill positions. Pointer controls include four handwheels, tailstock dragging, speed and feed selectors, spindle direction, feed engagement, locks, and stop (`Selection.js:35-117`).

## Materials and physics findings

- The original penetration was a movement problem, not transparency: all 372 visible meshes use opaque, physically based Three.js surface materials. Those materials control appearance and lighting; they do not create colliders. The cutting insert now has its own grey `materials.carbide` preset rather than the brass preset (`src/utils/geometry.js`, `src/machine/parts/PorteOutil.js`).
- The live-center tip initially meets the workpiece face at world X = 590 mm. The old independent limits allowed the tip to reach X = 514 mm. `Collisions.js` now checks the path of each guided movement and stops the quill or tailstock at first contact, including very small or very large requested steps.
- The collision model compares the meshes of the headstock, carriage, and tailstock (306 of the 372 machine meshes) across these assemblies. It also protects the cutter against the workpiece and live center, the carriage against the tailstock, and the carriage against the rotating chuck's swept envelope. Bed, stand, and internal sliding fits are excluded because those parts intentionally meet within the assembled machine.
- Automatic feed disengages at a contact. The feed rod or lead screw turns only for the carriage distance actually traveled (`src/mecanique/Broche.js`). The live center rotates with the stock only when their faces meet.
- The boxes are conservative collision proxies. They can stop a movement before the rendered surfaces touch. There is no cutting, deformation, gravity, friction, or force calculation; every controlled axis remains guided by the machine.

## Remaining findings and recommended changes

| Priority | Finding | Evidence and impact | Recommendation |
| --- | --- | --- | --- |
| Medium | Automatic feed can update a live status region continuously. | `Selection.js:125-126` gives the help element `role="status"`. During feed, `Broche.js:18-27` calls `Deplacements.regler` each frame, which rewrites `etat.message` with the carriage position (`Deplacements.js:46-53`); `Selection.js:294-300` then changes the live region text. This can cause excessive screen-reader announcements and DOM updates. | Announce discrete events in the live region. Put continuously changing position in a separate readout and update it at a limited rate. |
| Medium | Machine controls have no keyboard interaction. | The controls are selected and activated through canvas pointer handlers (`Selection.js:173-292`); no focusable control or key handler is present. Keyboard-only users cannot operate the machine. | Add a keyboard-accessible control panel or focused control scheme with labels and state. |
| Low | Development hot-reload cleanup is incomplete. | `main.js:112-120` disposes several resources, but the anonymous `resize` listener registered at `main.js:122-126` cannot be removed. If the module is hot-replaced without a page reload, old callbacks retain disposed renderers; the old canvas also remains in `#app`. | Store the resize handler, remove it during disposal, and remove the canvas when replacing the module. |
| Low | The development server listens on every interface by default. | `package.json:6` runs `vite --host 0.0.0.0`. | Use Vite's local default for ordinary development, or document that LAN access is intentional. |

## Verification and coverage

- `npm.cmd run build` passed with Vite 7.3.8. The built JavaScript is 568.52 kB, or 148.55 kB gzip.
- A Node scene-construction check created 441 objects and 372 meshes, with the expected initial carriage, tailstock, and quill positions.
- `npm.cmd test` passed all 10 headless tests in [`test/physics.test.js`](test/physics.test.js). They check contact boundaries, large-motion tunneling, sub-micron steps, feed-drive distance, rigid child transforms, and material assignments.
- Browser rendering and pointer usability were not visually tested in this review. The app explicitly requires WebGL2 (`main.js:10-17`).

## Suggested order of work

1. Separate live announcements from the changing position display, and provide keyboard controls.
2. Check contact behavior visually in a WebGL2 browser and refine any boxes that stop movement too early.
3. Address the small development cleanup items.
