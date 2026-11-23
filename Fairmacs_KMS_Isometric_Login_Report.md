# Fairmacs KMS – Animated Isometric 3D Port Login Report

**Project:** Fairmacs Knowledge Management System (KMS)  
**Experience:** Full-Screen Animated Isometric 3D Container Port + Central High-Transparency Apple Liquid Glass Login  
**Engine:** Three.js (`three`) WebGL Orthographic Isometric Engine with ACES Filmic Tone Mapping & PCF Soft Shadows  
**Verification Status:** **All Browser Checks Passed • 0 Console Errors • Uninterrupted Video & Multi-Viewport Captures Verified**

---

## 1. System Architecture & Files

| File | Responsibility |
| :--- | :--- |
| [`frontend/src/components/Login.jsx`](file:///r:/lms/frontend/src/components/Login.jsx) | Top-level authentication controller preserving `useAuth()`, JWT session handling, credential validation, role-based redirects, and Forgot Password modal. |
| [`frontend/src/components/port3d/PortScene.jsx`](file:///r:/lms/frontend/src/components/port3d/PortScene.jsx) | True Isometric Orthographic camera (`THREE.OrthographicCamera`), terminal platforms & 4 finger piers, building & stack placement, 6 yellow gantry cranes, 7 cargo ships, 4 moving trucks, and `window.__FAIRMACS_ISOMETRIC_PORT__` telemetry. |
| [`frontend/src/components/port3d/IsometricAssets.js`](file:///r:/lms/frontend/src/components/port3d/IsometricAssets.js) | 3D miniature asset builders matched to the reference image palette (yellow lattice gantry cranes with orange-red machinery houses, colourful stepped 3D containers, wooden crates, blue-roofed curved warehouses, red-roofed double warehouse, white factories with red-and-white striped chimneys, cargo ships, and yellow/grey cargo trucks). |
| [`frontend/src/components/port3d/IsometricControllers.js`](file:///r:/lms/frontend/src/components/port3d/IsometricControllers.js) | Independent continuous controllers: `ShipNavigationController` (closed-loop Catmull-Rom water splines with tangent yaw & wakes), `TruckRoadController` (rounded-corner road waypoints with intersection turns & loading stops), `CraneOperationController` (phase-staggered 6-stage container handling), and `AmbientCloudOceanController` (turquoise waves, soft feathered clouds & shadows, `birdCount: 0`). |
| [`frontend/src/components/port3d/LoginGlassPanel.jsx`](file:///r:/lms/frontend/src/components/port3d/LoginGlassPanel.jsx) | Central compact, high-transparency Apple Liquid Glass authentication card (`320px × 330px`) with floating labels, animated focus rings, and official Fairmacs lockup. |
| [`frontend/src/components/port3d/port3d.css`](file:///r:/lms/frontend/src/components/port3d/port3d.css) | Centered layout (`justify-content: center; align-items: center`), high-transparency frosted glass (`rgba(245, 248, 252, 0.46)`, `backdrop-filter: blur(15px) saturate(185%)`), and responsive breakpoints across `1440×900`, `1280×800`, `768×1024`, `390×844`, and `375×667`. |

---

## 2. Measured Browser Telemetry Summary

| Metric | T+0.7s | T+6.1s | T+12.5s | Verification Result |
| :--- | :--- | :--- | :--- | :--- |
| **Ship #1 (Red/Black Container Carrier)** | `(-15.27, 5.58)` `121°` | `(-9.36, 3.59)` `90°` | `(-11.60, 7.94)` `-73°` | Smooth curved loop & natural turning yaw |
| **Ship #2 (Lower-Left White Feeder)** | `(-16.63, 14.79)` `84°` | `(-13.44, 18.40)` `-14°` | `(-18.69, 22.00)` `-85°` | Smooth lower-left basin rotation |
| **Ship #3 (Upper-Right Bulk Carrier)** | `(24.10, 0.43)` `-77°` | `(18.58, -1.11)` `-137°` | `(20.48, -6.50)` `111°` | Smooth upper-right basin rotation |
| **Truck #1 (Pier D Yellow Semi)** | `DRIVING` `(13.20, 18.83)` `180°` | `LOADING_PAUSE` `(13.22, 9.22)` | `DRIVING` `(14.94, 19.92)` `-2°` | Follows Pier D road, stops at Crane 6, turns $180^\circ$ |
| **Truck #2 (Lower Factory Yellow Semi)** | `DRIVING` `(8.54, 22.88)` `-91°` | `LOADING_PAUSE` `(-1.08, 22.82)` | `DRIVING` `(9.80, 24.55)` `91°` | Follows lower road, stops at Factory, turns cleanly |
| **6 Yellow Gantry Cranes** | 0 cycles completed | 4 cycles completed | 9 cycles completed | Continuous phase-staggered container handling |
| **Drifting Clouds (`sampleCloudPos`)** | `(-15.62, -10.12)` | `(-12.61, -11.11)` | `(-9.10, -12.26)` | Continuous independent atmospheric drift |
| **Flying Birds (`birdCount`)** | `0` | `0` | `0` | **0 birds** (strictly excluded per requirement) |
| **Measured Browser FPS** | **59 FPS** | **54 FPS** | **41–54 FPS** | Smooth real-time WebGL performance |
| **Console Errors** | `0` | `0` | `0` | Zero runtime or WebGL errors |
