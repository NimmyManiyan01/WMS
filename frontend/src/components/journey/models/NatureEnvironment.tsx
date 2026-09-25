import * as THREE from "three";

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.4, 2.4, 8]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      {/* Foliage Cone 1 */}
      <mesh position={[0, 2.6, 0]} castShadow>
        <coneGeometry args={[1.6, 2.4, 8]} />
        <meshStandardMaterial color="#15803d" roughness={0.8} />
      </mesh>
      {/* Foliage Cone 2 */}
      <mesh position={[0, 3.9, 0]} castShadow>
        <coneGeometry args={[1.2, 2.0, 8]} />
        <meshStandardMaterial color="#16a34a" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function NatureEnvironment() {
  const trees = [
    [-45, 0, 10], [-55, 0, -20], [-50, 0, -60], [-48, 0, -100], [-52, 0, -140], [-46, 0, -180], [-50, 0, -220], [-45, 0, -260],
    [-65, 0, 0], [-70, 0, -50], [-72, 0, -120], [-68, 0, -190], [-75, 0, -250],
    [45, 0, 10], [55, 0, -20], [50, 0, -60], [48, 0, -100], [52, 0, -140], [46, 0, -180], [50, 0, -220], [45, 0, -260],
    [65, 0, 0], [70, 0, -50], [72, 0, -120], [68, 0, -190], [75, 0, -250],
    [-30, 0, -270], [0, 0, -275], [30, 0, -270], [-15, 0, -280], [15, 0, -280],
  ] as [number, number, number][];

  return (
    <group>
      {/* Majestic 3D Rolling Hills (Smooth Domes) */}
      <mesh position={[-85, -4, -140]} castShadow receiveShadow>
        <sphereGeometry args={[75, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#15803d" roughness={0.8} />
      </mesh>
      <mesh position={[85, -4, -140]} castShadow receiveShadow>
        <sphereGeometry args={[80, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#16a34a" roughness={0.8} />
      </mesh>
      <mesh position={[0, -6, -300]} castShadow receiveShadow>
        <sphereGeometry args={[130, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#14532d" roughness={0.85} />
      </mesh>

      {/* Flat Ground Grass Planes */}
      <mesh position={[-75, -2, -120]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[90, 340]} />
        <meshStandardMaterial color="#22c55e" roughness={0.85} />
      </mesh>
      <mesh position={[75, -2, -120]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[90, 340]} />
        <meshStandardMaterial color="#22c55e" roughness={0.85} />
      </mesh>

      {/* Trees */}
      {trees.map((pos, idx) => (
        <Tree key={idx} position={pos} />
      ))}
    </group>
  );
}
