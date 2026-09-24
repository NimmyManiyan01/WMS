import { useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { JourneyStage } from "./data/journeyStages";

interface JourneyCameraProps {
  stages: JourneyStage[];
  scrollProgress: number; // 0 to 1
  mouseOffset: { x: number; y: number };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

// Precision camera waypoints that guarantee the truck is always in full view
const CAMERA_KEYFRAMES: {
  p: number;
  pos: [number, number, number];
  target: [number, number, number];
}[] = [
    // 1. Stage 1: Gate Entry approach - Gate arm rises UP, truck moves forward (p = 0.00)
    { p: 0.0000, pos: [-7.0, 4.5, 29.0], target: [0.8, 1.8, 18.0] },
    // 2. Tracking truck passing under raised gate arm (p = 0.035)
    { p: 0.0350, pos: [-6.5, 4.5, 26.5], target: [0.8, 1.8, 15.0] },
    // 3. Tracking truck through portal into warehouse (p = 0.070)
    { p: 0.0700, pos: [-4.8, 4.2, 16.5], target: [0.0, 1.8, 6.0] },
    // 4. Following truck into warehouse apron setup (p = 0.105)
    { p: 0.1050, pos: [-3.0, 4.2, 4.0], target: [0.5, 1.8, -5.0] },
    // 5. Viewing truck shift into reverse & back into dock (p = 0.135)
    { p: 0.1350, pos: [5.0, 4.5, -3.0], target: [-4.0, 1.8, -13.0] },
    // 6. Stage 2: GRN Dock 02 - Truck parked, doors open (p = 0.1667)
    { p: 0.1667, pos: [7.5, 3.8, -13.0], target: [-7.5, 1.8, -19.5] },
    // 6a. Dock Inspector checking goods list manifest & scanning cartons (p = 0.200)
    { p: 0.2000, pos: [-3.5, 3.2, -20.5], target: [-7.2, 1.8, -23.8] },
    // 6b. Goods list verified & released - Forklift approaches dock and slides forks under pallet (p = 0.240)
    { p: 0.2400, pos: [-1.8, 3.8, -19.0], target: [-8.0, 1.6, -24.5] },
    // 6c. Forklift lifts pallet off dock platform & backs out into turn area (p = 0.275)
    { p: 0.2750, pos: [-0.5, 3.8, -24.0], target: [-6.5, 1.6, -30.0] },
    // 6d. Forklift turns and enters high-bay storage aisle (p = 0.315)
    { p: 0.3150, pos: [-3.0, 3.6, -36.0], target: [0.0, 1.6, -50.0] },
    // 6e. Forklift cruising down storage aisle toward destination (p = 0.345)
    { p: 0.3450, pos: [-4.0, 3.6, -56.0], target: [3.5, 1.6, -68.0] },
    // 7. Stage 3: Store / Putaway - Forklift turning to face Right Storage Rack (p = 0.365)
    { p: 0.3650, pos: [-4.5, 3.4, -63.0], target: [5.5, 2.0, -68.0] },
    // 7a. Forklift elevates mast and slots pallet squarely into Bin 01 (p = 0.390)
    { p: 0.3900, pos: [-1.5, 3.2, -64.0], target: [7.8, 1.9, -68.0] },
    // 7b. Putaway complete, barcode verified, overview of stocked rack (p = 0.420)
    { p: 0.4200, pos: [-3.5, 3.8, -66.0], target: [4.0, 2.2, -74.0] },
    // 8. Stage 4: High Inventory Matrix Overview (p = 0.5000)
    { p: 0.5000, pos: [11.0, 8.5, -112.0], target: [0.0, 3.0, -118.0] },
    // 9. Stage 5: Robotic Assembly Station (p = 0.6667)
    { p: 0.6667, pos: [-6.8, 3.6, -157.0], target: [0.1, 1.6, -165.0] },
    // 10. Stage 6: Outbound Dispatch Loading Bay (p = 0.8333)
    { p: 0.8333, pos: [8.0, 4.0, -202.0], target: [-3.0, 2.0, -212.0] },
    // 11. Stage 7: Departure Gate Exit (p = 1.0000)
    { p: 1.0000, pos: [-7.0, 4.2, -240.0], target: [1.0, 2.0, -255.0] },
  ];

export function JourneyCamera({
  stages: _stages,
  scrollProgress,
  mouseOffset,
}: JourneyCameraProps) {
  const { camera } = useThree();
  const currentLookAt = useRef(new THREE.Vector3(0.8, 1.8, 18.0));

  useFrame(() => {
    const p = clamp(scrollProgress, 0, 1);

    // Find the bounding keyframe segment
    let idx = 0;
    for (let i = 0; i < CAMERA_KEYFRAMES.length - 1; i++) {
      if (p >= CAMERA_KEYFRAMES[i].p && p <= CAMERA_KEYFRAMES[i + 1].p) {
        idx = i;
        break;
      }
    }
    const k1 = CAMERA_KEYFRAMES[idx];
    const k2 = CAMERA_KEYFRAMES[idx + 1];
    const t = smoothstep(k1.p, k2.p, p);

    const desiredPos = new THREE.Vector3(
      lerp(k1.pos[0], k2.pos[0], t),
      lerp(k1.pos[1], k2.pos[1], t),
      lerp(k1.pos[2], k2.pos[2], t)
    );

    const desiredTarget = new THREE.Vector3(
      lerp(k1.target[0], k2.target[0], t),
      lerp(k1.target[1], k2.target[1], t),
      lerp(k1.target[2], k2.target[2], t)
    );

    // Apply subtle mouse parallax to camera position
    desiredPos.x += mouseOffset.x * 0.45;
    desiredPos.y += mouseOffset.y * 0.35;

    // Smooth lerp camera position
    camera.position.lerp(desiredPos, 0.09);

    // Smooth lerp camera lookAt target
    currentLookAt.current.lerp(desiredTarget, 0.09);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}
