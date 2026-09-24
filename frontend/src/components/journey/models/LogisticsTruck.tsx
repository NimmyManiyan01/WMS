import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface LogisticsTruckProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  doorsOpenProgress?: number; // 0 to 1
  wheelRotation?: number;
}

export function LogisticsTruck({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  doorsOpenProgress = 0,
  wheelRotation = 0,
}: LogisticsTruckProps) {
  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);

  // Animate rear doors smoothly based on doorsOpenProgress
  useFrame(() => {
    if (leftDoorRef.current && rightDoorRef.current) {
      const angle = doorsOpenProgress * 2.2; // approx 125 degrees
      leftDoorRef.current.rotation.y = -angle;
      rightDoorRef.current.rotation.y = angle;
    }
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* ─── CHASSIS & FRAME ─── */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.25, 9.8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* ─── CABIN (Front) ─── */}
      <group position={[0, 1.45, 3.8]}>
        {/* Main Cab Body */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 1.75, 2.2]} />
          <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Windshield */}
        <mesh position={[0, 0.35, 1.11]}>
          <boxGeometry args={[1.9, 0.75, 0.05]} />
          <meshStandardMaterial
            color="#38bdf8"
            metalness={0.9}
            roughness={0.1}
            transparent
            opacity={0.65}
          />
        </mesh>

        {/* Front Grille */}
        <mesh position={[0, -0.4, 1.12]} castShadow>
          <boxGeometry args={[1.8, 0.55, 0.05]} />
          <meshStandardMaterial color="#020617" roughness={0.7} />
        </mesh>

        {/* LED Headlights */}
        <mesh position={[-0.8, -0.4, 1.13]}>
          <boxGeometry args={[0.3, 0.15, 0.02]} />
          <meshStandardMaterial color="#ffffff" emissive="#38bdf8" emissiveIntensity={3.5} />
        </mesh>
        <mesh position={[0.8, -0.4, 1.13]}>
          <boxGeometry args={[0.3, 0.15, 0.02]} />
          <meshStandardMaterial color="#ffffff" emissive="#38bdf8" emissiveIntensity={3.5} />
        </mesh>

        {/* Forward Headlight Beam casting forward */}
        <pointLight position={[0, -0.2, 2.2]} color="#bae6fd" intensity={3.5} distance={18} />

        {/* Fleet Identification Plate "FL-8820" */}
        <mesh position={[0, -0.72, 1.13]}>
          <boxGeometry args={[0.9, 0.22, 0.02]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
      </group>

      {/* ─── CARGO TRAILER (Rear) ─── */}
      <group position={[0, 1.75, -1.2]}>
        {/* Main Trailer Box (White/Alloy Panels) */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.3, 2.4, 7.2]} />
          <meshStandardMaterial color="#f1f5f9" metalness={0.4} roughness={0.4} />
        </mesh>

        {/* Cyan Nexus Accent Stripe */}
        <mesh position={[0, -0.7, 0]}>
          <boxGeometry args={[2.32, 0.25, 7.22]} />
          <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.6} />
        </mesh>

        {/* Trailer Roof Edge Rail */}
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[2.35, 0.08, 7.25]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Amber Side Marker Lights */}
        {[-2.0, 0, 2.0].map((mz, idx) => (
          <group key={idx}>
            <mesh position={[-1.17, -0.7, mz]}>
              <boxGeometry args={[0.04, 0.08, 0.2]} />
              <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2.5} />
            </mesh>
            <mesh position={[1.17, -0.7, mz]}>
              <boxGeometry args={[0.04, 0.08, 0.2]} />
              <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2.5} />
            </mesh>
          </group>
        ))}

        {/* Rear Red Taillights */}
        <mesh position={[-0.95, -0.7, -3.63]}>
          <boxGeometry args={[0.25, 0.15, 0.04]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} />
        </mesh>
        <mesh position={[0.95, -0.7, -3.63]}>
          <boxGeometry args={[0.25, 0.15, 0.04]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} />
        </mesh>

        {/* ─── HINGED REAR DOORS ─── */}
        <group position={[-1.15, 0, -3.61]} ref={leftDoorRef}>
          <mesh position={[0.55, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.1, 2.35, 0.06]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
        <group position={[1.15, 0, -3.61]} ref={rightDoorRef}>
          <mesh position={[-0.55, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.1, 2.35, 0.06]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      </group>

      {/* ─── 6 WHEELS ─── */}
      {[
        [-1.1, 0.42, 3.8],
        [1.1, 0.42, 3.8],
        [-1.15, 0.42, -2.6],
        [1.15, 0.42, -2.6],
        [-1.15, 0.42, -3.9],
        [1.15, 0.42, -3.9],
      ].map(([wx, wy, wz], i) => (
        <group key={i} position={[wx, wy, wz]}>
          <mesh
            rotation={[wheelRotation, 0, Math.PI / 2]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.42, 0.42, 0.28, 18]} />
            <meshStandardMaterial color="#0f172a" roughness={0.9} />
          </mesh>
          {/* Wheel Rim */}
          <mesh rotation={[wheelRotation, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.22, 0.22, 0.29, 12]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
