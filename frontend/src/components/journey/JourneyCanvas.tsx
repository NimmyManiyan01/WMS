import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { JourneyStage } from "./data/journeyStages";
import { JourneyCamera } from "./JourneyCamera";
import { JourneyRoadmap3D } from "./JourneyRoadmap3D";
import { WarehouseBuilding } from "./models/WarehouseBuilding";
import { GateBarrier } from "./models/GateBarrier";
import { LogisticsTruck } from "./models/LogisticsTruck";
import { LoadingDock } from "./models/LoadingDock";
import { DockInspector } from "./models/DockInspector";
import { StorageRack } from "./models/StorageRack";
import { WarehouseForklift } from "./models/WarehouseForklift";
import { PalletAndCargo } from "./models/PalletAndCargo";
import { ConveyorSystem } from "./models/ConveyorSystem";
import { AssemblyStation } from "./models/AssemblyStation";

interface JourneyCanvasProps {
  stages: JourneyStage[];
  activeIndex: number;
  scrollProgress: number; // 0 to 1
  mouseOffset: { x: number; y: number };
  onSelectStage: (index: number) => void;
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

export function JourneyCanvas({
  stages,
  activeIndex,
  scrollProgress,
  mouseOffset,
  onSelectStage,
}: JourneyCanvasProps) {
  // ─── STAGE PROGRESS CALCULATIONS ───

  // 1. INBOUND LOGISTICS TRUCK (FL-8820): Real alley-dock maneuver (Drive forward -> Angle setup -> Reverse park into Dock 02)
  let truck1Pos: [number, number, number] = [0.8, 0, 20.5];
  let truck1Rot: [number, number, number] = [0, Math.PI, 0];
  let barrier1Open = 0;
  let dockDoorOpen = 0;
  let truck1Doors = 0;
  let wheelRot = 0;
  let isReversing = false;

  if (scrollProgress < 0.09) {
    // Stage 1 (Gate Entry): Gate barrier opens UP immediately, and truck FL-8820 moves forward along the road
    const t = smoothstep(0.00, 0.09, scrollProgress);
    // Gate arm swings smoothly upwards into the air (0 to 1) right at the beginning
    barrier1Open = smoothstep(0.00, 0.035, scrollProgress);
    truck1Pos = [
      lerp(0.8, 0.0, t),
      0,
      lerp(20.5, -4.0, t),
    ];
    truck1Rot = [0, Math.PI, 0];
    wheelRot = (20.5 - truck1Pos[2]) * 2.5;
  } else if (scrollProgress < 0.125) {
    // Phase 2: Pull forward and angle into yard apron (setup position for dock backing)
    const t = smoothstep(0.09, 0.125, scrollProgress);
    barrier1Open = 1;
    truck1Pos = [
      lerp(0.0, 1.2, t),
      0,
      lerp(-4.0, -9.5, t),
    ];
    truck1Rot = [0, lerp(Math.PI, Math.PI - 0.35, t), 0];
    wheelRot = (20.5 - truck1Pos[2]) * 2.5;
  } else if (scrollProgress < 0.1667) {
    // Phase 3: Shift into REVERSE, backup lights illuminate, arc backward into Dock 02
    const t = smoothstep(0.125, 0.1667, scrollProgress);
    isReversing = true;
    barrier1Open = 1;
    truck1Pos = [
      lerp(1.2, -8.5, t),
      0,
      lerp(-9.5, -17.5, t),
    ];
    // Smoothly rotates backward into alignment with dock slip (160 deg -> 0 deg)
    truck1Rot = [0, lerp(Math.PI - 0.35, 0, t), 0];
    // Reverse wheel rotation
    wheelRot = -t * 14.0;
    dockDoorOpen = Math.max(0, (t - 0.4) * 1.66);
  } else {
    // Stage 2: Parked squarely against Dock 02 bumpers, rear doors open, receiving cargo
    barrier1Open = 1;
    truck1Pos = [-8.5, 0, -17.5];
    truck1Rot = [0, 0, 0];
    wheelRot = 0;
    dockDoorOpen = 1;
    truck1Doors = clamp((scrollProgress - 0.1667) / 0.04, 0, 1);
  }

  // ─── SCENE 2: DOCK INSPECTOR (THE MAN CHECKING GOODS LIST BEFORE FORKLIFT PICK) ───
  let inspectorPos: [number, number, number] = [-6.6, 1.25, -23.8];
  let inspectorRot: [number, number, number] = [0, -Math.PI / 2, 0]; // facing pallet at X: -8.5
  let inspectProgress = 0;

  if (scrollProgress < 0.1667) {
    // Waiting for truck to dock
    inspectorPos = [-6.6, 1.25, -23.8];
    inspectorRot = [0, -Math.PI / 2, 0];
    inspectProgress = 0;
  } else if (scrollProgress < 0.220) {
    // Man actively checking goods list manifest, scanning cartons with handheld laser terminal
    inspectorPos = [-6.6, 1.25, -23.8];
    inspectorRot = [0, -Math.PI / 2, 0];
    inspectProgress = clamp((scrollProgress - 0.1667) / 0.045, 0, 1);
  } else {
    // GRN verified! Man steps to platform safety buffer and watches forklift pickup
    const stepT = clamp((scrollProgress - 0.220) / 0.025, 0, 1);
    inspectorPos = [
      lerp(-6.6, -5.8, stepT),
      1.25,
      lerp(-23.8, -22.5, stepT),
    ];
    inspectorRot = [0, lerp(-Math.PI / 2, -Math.PI / 3, stepT), 0];
    inspectProgress = 1;
  }

  // ─── SCENE 2 & 3: FORKLIFT & PALLET KINEMATICS (STARTS ONLY AFTER GOODS LIST IS CHECKED!) ───
  let forkliftPos: [number, number, number] = [-4.5, 0, -28.0];
  let forkliftRot: [number, number, number] = [0, 0, 0];
  let forkLiftProgress = 0;
  let palletPos: [number, number, number] = [-8.5, 1.25, -23.8];
  let palletRot: [number, number, number] = [0, 0, 0];

  if (scrollProgress < 0.225) {
    // Goods list is being checked by the inspector: Forklift waits in receiving buffer
    forkliftPos = [-4.5, 0, -28.0];
    forkliftRot = [0, 0, 0];
    forkLiftProgress = 0;
    palletPos = [-8.5, 1.25, -23.8];
    palletRot = [0, 0, 0];
  } else if (scrollProgress < 0.255) {
    // AFTER goods list checked: Forklift approaches Dock 02 and slides forks under pallet
    const t = smoothstep(0.225, 0.255, scrollProgress);
    forkliftPos = [
      lerp(-4.5, -8.5, t),
      0,
      lerp(-28.0, -25.3, t),
    ];
    forkliftRot = [0, 0, 0];
    forkLiftProgress = lerp(0.0, 0.415, t); // carriage elevates to match dock height (Y: 1.25)
    palletPos = [-8.5, 1.25, -23.8];
    palletRot = [0, 0, 0];
  } else if (scrollProgress < 0.275) {
    // Forklift raises forks, lifting pallet off dock platform
    const t = smoothstep(0.255, 0.275, scrollProgress);
    forkliftPos = [-8.5, 0, -25.3];
    forkliftRot = [0, 0, 0];
    forkLiftProgress = lerp(0.415, 0.520, t);
    palletPos = [-8.5, 0.15 + forkLiftProgress * 2.65, -23.8];
    palletRot = [0, 0, 0];
  } else if (scrollProgress < 0.305) {
    // Forklift backs out from dock, lowers to safe transit height, and rotates 180 deg
    const t = smoothstep(0.275, 0.305, scrollProgress);
    forkliftPos = [
      lerp(-8.5, -3.5, t),
      0,
      lerp(-25.3, -33.0, t),
    ];
    const rotY = lerp(0, Math.PI, t);
    forkliftRot = [0, rotY, 0];
    forkLiftProgress = lerp(0.520, 0.120, t);
    // Pallet follows forklift carriage rigidly
    palletPos = [
      forkliftPos[0] + Math.sin(rotY) * 1.5,
      0.15 + forkLiftProgress * 2.65,
      forkliftPos[2] + Math.cos(rotY) * 1.5,
    ];
    palletRot = [0, rotY, 0];
  } else if (scrollProgress < 0.345) {
    // Forklift transports pallet down the high-bay storage aisle toward Stage 03
    const t = smoothstep(0.305, 0.345, scrollProgress);
    forkliftPos = [
      lerp(-3.5, 3.8, t),
      0,
      lerp(-33.0, -68.0, t),
    ];
    forkliftRot = [0, Math.PI, 0];
    forkLiftProgress = 0.120;
    palletPos = [
      forkliftPos[0],
      0.15 + forkLiftProgress * 2.65,
      forkliftPos[2] - 1.5,
    ];
    palletRot = [0, Math.PI, 0];
  } else if (scrollProgress < 0.365) {
    // Forklift arrives at Bay 1 and turns 90 degrees to face Right Storage Rack
    const t = smoothstep(0.345, 0.365, scrollProgress);
    forkliftPos = [
      lerp(3.8, 4.2, t),
      0,
      -68.0,
    ];
    const rotY = lerp(Math.PI, Math.PI / 2, t);
    forkliftRot = [0, rotY, 0];
    forkLiftProgress = 0.120;
    palletPos = [
      forkliftPos[0] + Math.sin(rotY) * 1.5,
      0.15 + forkLiftProgress * 2.65,
      forkliftPos[2] + Math.cos(rotY) * 1.5,
    ];
    palletRot = [0, rotY, 0];
  } else if (scrollProgress < 0.390) {
    // Forklift raises mast, drives into Bay 1, and slots pallet onto shelf
    const t = smoothstep(0.365, 0.390, scrollProgress);
    forkliftRot = [0, Math.PI / 2, 0];
    if (t < 0.5) {
      const subT = t * 2;
      forkLiftProgress = lerp(0.120, 0.620, subT);
      forkliftPos = [
        lerp(4.2, 5.8, subT),
        0,
        -68.0,
      ];
      palletPos = [
        forkliftPos[0] + 1.5,
        0.15 + forkLiftProgress * 2.65,
        -68.0,
      ];
    } else {
      const subT = (t - 0.5) * 2;
      forkliftPos = [
        lerp(5.8, 6.5, subT),
        0,
        -68.0,
      ];
      forkLiftProgress = lerp(0.620, 0.580, subT);
      palletPos = [
        lerp(7.3, 8.0, subT),
        lerp(1.79, 1.68, subT),
        -68.0,
      ];
    }
    palletRot = [0, Math.PI / 2, 0];
  } else {
    // Stage 03+: Putaway completed. Pallet stays permanently stored in Bay 1.
    // Forklift pulls forks back out to aisle clearance.
    const t = clamp((scrollProgress - 0.390) / 0.035, 0, 1);
    forkliftPos = [
      lerp(6.5, 4.5, t),
      0,
      -68.0,
    ];
    forkliftRot = [0, Math.PI / 2, 0];
    forkLiftProgress = lerp(0.580, 0.120, t);
    palletPos = [8.0, 1.68, -68.0];
    palletRot = [0, Math.PI / 2, 0];
  }

  // 3. Scene 5: Robotic assembly kinematics (progress 0.64 to 0.76)
  const robotProgress = clamp((scrollProgress - 0.64) / 0.11, 0, 1);

  // 4. Scene 7: Outbound departure truck driving through exit gate (progress 0.86 to 1.0)
  let truckExitPos: [number, number, number] = [0.8, 0, -244];
  let barrier2Open = 0;

  if (scrollProgress < 0.86) {
    truckExitPos = [0.8, 0, -244];
    barrier2Open = 0;
  } else if (scrollProgress < 0.90) {
    const t = (scrollProgress - 0.86) / 0.04;
    barrier2Open = t;
    truckExitPos = [0.8, 0, -244 - t * 2];
  } else {
    const t = clamp((scrollProgress - 0.90) / 0.10, 0, 1);
    barrier2Open = 1;
    truckExitPos = [0.8, 0, -246 - t * 20]; // drives out through exit barrier
  }

  return (
    <div className="absolute inset-0 -z-10 bg-slate-950 overflow-hidden">
      <Canvas
        camera={{ position: [-7.0, 4.5, 29.0], fov: 48, near: 0.1, far: 380 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        shadows
      >
        <color attach="background" args={["#020617"]} />
        <fog attach="fog" args={["#020617", 20, 110]} />

        {/* ─── LIGHTING RIG ─── */}
        <ambientLight intensity={0.9} color="#cbd5e1" />
        <directionalLight
          position={[14, 28, 20]}
          intensity={1.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={160}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
          color="#f8fafc"
        />

        {/* Key Operational Luminaires */}
        {/* Gate Entry Perimeter Illumination */}
        <pointLight position={[2, 6, 22]} intensity={3.5} color="#38bdf8" distance={25} />
        {/* Receiving Dock Illumination */}
        <pointLight position={[-4, 7, -22]} intensity={3.5} color="#38bdf8" distance={25} />
        {/* Storage Aisle Illumination */}
        <pointLight position={[-10, 8, -50]} intensity={2.5} color="#06b6d4" distance={35} />
        {/* Inventory High Matrix Illumination */}
        <pointLight position={[10, 12, -120]} intensity={3.0} color="#38bdf8" distance={45} />
        {/* Robotic Workcell Illumination */}
        <pointLight position={[-8, 6, -180]} intensity={2.5} color="#2dd4bf" distance={35} />
        {/* Outbound Dispatch Dock Illumination */}
        <pointLight position={[-4, 7, -210]} intensity={3.5} color="#38bdf8" distance={25} />
        {/* Exit Gate Illumination */}
        <pointLight position={[2, 6, -248]} intensity={3.5} color="#38bdf8" distance={25} />

        <Suspense fallback={null}>
          {/* Continuous Camera Trajectory Controller */}
          <JourneyCamera
            stages={stages}
            scrollProgress={scrollProgress}
            mouseOffset={mouseOffset}
          />

          {/* Continuous 3D Cyan Roadmap Spline */}
          <JourneyRoadmap3D
            stages={stages}
            activeIndex={activeIndex}
            scrollProgress={scrollProgress}
            onSelectStage={onSelectStage}
          />

          {/* ─── 3D WAREHOUSE ENVIRONMENT OBJECTS ─── */}
          <WarehouseBuilding />

          {/* ─── SCENE 1: INBOUND GATE ENTRY ─── */}
          <GateBarrier
            position={[0, 0, 15]}
            barrierOpenProgress={barrier1Open}
          />

          {/* ─── SCENE 1 & 2: INBOUND LOGISTICS TRUCK (FL-8820) ─── */}
          {/* Alley-dock maneuver: Drives forward, sets up in apron, reverses & parks into Dock 02 */}
          <LogisticsTruck
            position={truck1Pos}
            rotation={truck1Rot}
            doorsOpenProgress={truck1Doors}
            wheelRotation={wheelRot}
            isReversing={isReversing}
          />

          {/* ─── SCENE 2: INBOUND RECEIVING DOCK & GRN INSPECTION ─── */}
          <LoadingDock
            position={[-8.5, 0, -25]}
            doorOpenProgress={dockDoorOpen}
            doorNumber="DOCK 02"
          />

          {/* Warehouse Inspector: The man checking the goods list before forklift pick */}
          <DockInspector
            position={inspectorPos}
            rotation={inspectorRot}
            inspectionProgress={inspectProgress}
          />

          {/* ─── SCENE 2 & 3: DYNAMIC RECEIVED GOODS PALLET ─── */}
          {/* Starts on Dock 02 Leveler Platform -> Forklift Picks & Transports -> Slots into Rack Bin 01 */}
          <PalletAndCargo
            position={palletPos}
            rotation={palletRot}
            hasCargo={true}
            boxCount={8}
          />

          {/* ─── SCENE 3 & 4: STORAGE AISLES & INVENTORY MATRIX ─── */}
          {/* Left Rack Row 1 (Facing Inward into Aisle) */}
          <StorageRack position={[-7.5, 0, -68]} rotation={[0, Math.PI / 2, 0]} bays={3} tiers={4} />
          <StorageRack position={[-7.5, 0, -82]} rotation={[0, Math.PI / 2, 0]} bays={3} tiers={4} />
          {/* Right Rack Row 1 (Target Aisle - Facing Inward into Aisle) */}
          <StorageRack position={[8.0, 0, -68]} rotation={[0, -Math.PI / 2, 0]} bays={3} tiers={4} />
          <StorageRack position={[8.0, 0, -82]} rotation={[0, -Math.PI / 2, 0]} bays={3} tiers={4} />
          {/* High Inventory Overview Rows (Scene 4 Matrix) */}
          <StorageRack position={[-16, 0, -108]} bays={4} tiers={4} />
          <StorageRack position={[0, 0, -108]} bays={4} tiers={4} />
          <StorageRack position={[16, 0, -108]} bays={4} tiers={4} />
          <StorageRack position={[-8, 0, -125]} bays={4} tiers={4} />
          <StorageRack position={[8, 0, -125]} bays={4} tiers={4} />

          {/* Pre-populated Pallets on Racks (Bays 0 and 2) */}
          <PalletAndCargo position={[8.0, 1.66, -64.8]} rotation={[0, Math.PI / 2, 0]} boxCount={6} />
          <PalletAndCargo position={[8.0, 3.46, -71.2]} rotation={[0, Math.PI / 2, 0]} boxCount={8} />
          <PalletAndCargo position={[-7.5, 1.66, -68]} rotation={[0, Math.PI / 2, 0]} boxCount={8} />
          <PalletAndCargo position={[-7.5, 3.46, -80]} rotation={[0, Math.PI / 2, 0]} boxCount={6} />

          {/* Putaway Forklift: Approaches Dock 02, picks cargo, drives down aisle, slots pallet into Bin 01 */}
          <WarehouseForklift
            position={forkliftPos}
            rotation={forkliftRot}
            forkLiftProgress={forkLiftProgress}
          />

          {/* Holographic Laser Scanner & Putaway Verification HUD at Rack Bay 1 */}
          {scrollProgress >= 0.365 && (
            <group position={[7.4, 2.5, -68.0]}>
              {/* Holographic Bin Bounding Box */}
              <mesh rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[1.5, 1.3]} />
                <meshBasicMaterial
                  color={scrollProgress >= 0.390 ? "#10b981" : "#06b6d4"}
                  wireframe
                  transparent
                  opacity={scrollProgress >= 0.390 ? 0.85 : 0.45}
                />
              </mesh>
              {/* Laser Scan Line Sweeping Across Boxes */}
              {scrollProgress < 0.390 && (
                <mesh
                  position={[0.02, Math.sin(scrollProgress * 60) * 0.4, 0]}
                  rotation={[0, -Math.PI / 2, 0]}
                >
                  <planeGeometry args={[1.4, 0.03]} />
                  <meshBasicMaterial color="#22d3ee" transparent opacity={0.9} />
                </mesh>
              )}
              {/* In-Scene 3D Floating Putaway Verification Tag */}
              <Html center distanceFactor={14} zIndexRange={[45, 0]}>
                <div className="bg-slate-950/90 border border-emerald-500/70 px-2.5 py-1.5 rounded shadow-xl shadow-emerald-500/20 backdrop-blur pointer-events-none whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] text-emerald-400 font-bold tracking-wider">
                    <span className={`w-2 h-2 rounded-full ${scrollProgress >= 0.390 ? "bg-emerald-400" : "bg-cyan-400 animate-pulse"}`} />
                    {scrollProgress >= 0.390 ? "BIN AISLE-04-B1 : STORED ✓" : "PUTAWAY : SLOTTING BIN..."}
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                    PLT-77291 • RACK-B-08 • TIER 01
                  </div>
                </div>
              </Html>
            </group>
          )}

          {/* ─── SCENE 5: PRODUCTION ASSEMBLY ─── */}
          {/* Automated Production Line Conveyor */}
          <ConveyorSystem position={[0.35, 0, -165]} length={16} width={1.1} height={0.96} />
          {/* Dual-Robot Automated Assembly & Goods-Box Packaging Station */}
          <AssemblyStation
            position={[-0.8, 0, -165]}
            assemblyProgress={robotProgress}
          />

          {/* ─── SCENE 6: OUTBOUND DISPATCH DOCK ─── */}
          <LoadingDock
            position={[-8.5, 0, -212]}
            doorOpenProgress={1}
            doorNumber="BAY 06"
          />
          {/* Outbound Trailer docked and being loaded */}
          <LogisticsTruck
            position={[-8.5, 0, -204.5]}
            rotation={[0, 0, 0]}
            doorsOpenProgress={1}
          />
          {/* Outbound Wrapped Pallets ready for trailer */}
          <PalletAndCargo
            position={[-8.5, 1.25, -210]}
            isWrapped={true}
            boxCount={8}
          />
          <PalletAndCargo
            position={[-6.0, 1.25, -210]}
            isWrapped={true}
            boxCount={8}
          />

          {/* ─── SCENE 7: DEPARTURE GATE EXIT ─── */}
          <GateBarrier
            position={[0, 0, -252]}
            barrierOpenProgress={barrier2Open}
          />
          <LogisticsTruck
            position={truckExitPos}
            rotation={[0, Math.PI, 0]}
            doorsOpenProgress={0}
            wheelRotation={scrollProgress * 40}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}