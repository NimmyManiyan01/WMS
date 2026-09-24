import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface GateBarrierProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  barrierOpenProgress?: number; // 0 (closed) to 1 (fully open)
}

export function GateBarrier({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  barrierOpenProgress = 0,
}: GateBarrierProps) {
  const armRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (armRef.current) {
      // 0 = horizontal (0 rad), 1 = vertical (approx 1.5 rad / 86 deg)
      armRef.current.rotation.z = barrierOpenProgress * 1.5;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Security Guard Booth */}
      <group position={[4.2, 1.5, 0]}>
        {/* Booth Base & Body */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 3.0, 2.4]} />
          <meshStandardMaterial color="#1e293b" metalness={0.4} roughness={0.4} />
        </mesh>
        {/* Glass Windows */}
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[2.05, 1.2, 2.45]} />
          <meshStandardMaterial
            color="#38bdf8"
            metalness={0.8}
            roughness={0.1}
            transparent
            opacity={0.5}
          />
        </mesh>
        {/* Flat Roof Overhang */}
        <mesh position={[0, 1.6, 0]} castShadow>
          <boxGeometry args={[2.4, 0.2, 2.8]} />
          <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Interior Control Desk Glow */}
        <pointLight position={[0, 0.2, 0]} color="#38bdf8" intensity={1.5} distance={4} />
      </group>

      {/* Barrier Stanchion Post */}
      <group position={[2.4, 0.75, 0]}>
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 1.5, 0.6]} />
          <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Warning Indicator Light */}
        <mesh position={[0, 0.82, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.15, 12]} />
          <meshStandardMaterial
            color={barrierOpenProgress > 0.5 ? "#22c35e" : "#ef4444"}
            emissive={barrierOpenProgress > 0.5 ? "#22c55e" : "#ef4444"}
            emissiveIntensity={2}
          />
        </mesh>

        {/* ─── ROTATING BOOM BARRIER ARM ─── */}
        <group position={[-0.26, 0.5, 0]} ref={armRef}>
          {/* Main Arm (Red/White Safety Striped) */}
          <mesh position={[-2.4, 0, 0]} castShadow>
            <boxGeometry args={[4.8, 0.12, 0.08]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.3} roughness={0.5} />
          </mesh>
          {/* Red Stripes on Arm */}
          {[-1.0, -2.0, -3.0, -4.0].map((stripeX, i) => (
            <mesh key={i} position={[stripeX, 0, 0]}>
              <boxGeometry args={[0.4, 0.125, 0.085]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
          ))}
          {/* Glowing Tip LED */}
          <mesh position={[-4.8, 0, 0]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={3} />
          </mesh>
        </group>
      </group>

      {/* Left Curb / Stanchion Receiver */}
      <mesh position={[-2.4, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.8, 0.4]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}
