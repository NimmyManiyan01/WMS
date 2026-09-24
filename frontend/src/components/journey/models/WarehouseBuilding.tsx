export function WarehouseBuilding() {
  return (
    <group>
      {/* ─── GROUND / FLOORS ─── */}
      {/* Exterior Road / Asphalt (Z from 50 to 0) - rotated flat on ground */}
      <mesh position={[0, -0.01, 25]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 50]} />
        <meshStandardMaterial color="#0f172a" roughness={0.85} metalness={0.2} />
      </mesh>

      {/* Exterior Road Lane Markings */}
      <mesh position={[0.8, 0.005, 33]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 32]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#0891b2"
          emissiveIntensity={0.3}
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Security Gate Stop Bar Marking (Z = 16.2) */}
      <mesh position={[0.8, 0.006, 16.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.8, 0.35]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>

      {/* Interior Concrete Polished Floor (Z from 0 to -300) */}
      <mesh position={[0, 0, -145]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 290]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.25}
          metalness={0.5}
        />
      </mesh>

      {/* Floor Floor Guidance Lines / Safety Striping */}
      {[-8, 0, 8].map((lx, i) => (
        <mesh key={i} position={[lx, 0.01, -145]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.15, 280]} />
          <meshStandardMaterial
            color="#06b6d4"
            emissive="#0891b2"
            emissiveIntensity={0.4}
            transparent
            opacity={0.35}
          />
        </mesh>
      ))}

      {/* ─── WAREHOUSE FRONT FACADE (Z = 0) ─── */}
      <group position={[0, 5, 0]}>
        {/* Left Wall Panel */}
        <mesh position={[-16, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[16, 10, 1.2]} />
          <meshStandardMaterial color="#0b0f19" roughness={0.7} metalness={0.4} />
        </mesh>
        {/* Right Wall Panel */}
        <mesh position={[16, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[16, 10, 1.2]} />
          <meshStandardMaterial color="#0b0f19" roughness={0.7} metalness={0.4} />
        </mesh>
        {/* Lintel Beam above Portal */}
        <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[16, 3, 1.4]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Illuminated Nexus Portal Header Sign */}
        <mesh position={[0, 3.6, 0.75]}>
          <boxGeometry args={[8, 0.9, 0.1]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#22d3ee"
            emissiveIntensity={2.5}
          />
        </mesh>
      </group>

      {/* ─── STRUCTURAL INTERIOR ROOF TRUSSES & HIGH-BAY LIGHTS ─── */}
      {[-30, -65, -100, -135, -170, -205, -240].map((trussZ, i) => (
        <group key={i} position={[0, 9.5, trussZ]}>
          {/* Cross Steel Beam */}
          <mesh castShadow>
            <boxGeometry args={[48, 0.6, 0.6]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Vertical Support Columns Left & Right */}
          <mesh position={[-23, -4.5, 0]} castShadow>
            <boxGeometry args={[0.8, 9, 0.8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[23, -4.5, 0]} castShadow>
            <boxGeometry args={[0.8, 9, 0.8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>

          {/* Industrial High-Bay LED Lights */}
          {[-12, 0, 12].map((lx, j) => (
            <group key={j} position={[lx, -0.4, 0]}>
              <mesh>
                <cylinderGeometry args={[0.6, 0.8, 0.3, 16]} />
                <meshStandardMaterial color="#475569" metalness={0.7} />
              </mesh>
              <mesh position={[0, -0.16, 0]}>
                <cylinderGeometry args={[0.55, 0.55, 0.05, 16]} />
                <meshStandardMaterial
                  color="#ffffff"
                  emissive="#e0f2fe"
                  emissiveIntensity={3}
                />
              </mesh>
              <pointLight color="#bae6fd" intensity={3} distance={24} decay={2} />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
