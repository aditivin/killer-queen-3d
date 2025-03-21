import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Text3D, Center, useTexture, Environment } from '@react-three/drei'
import * as THREE from 'three'

// Create a grid floor for visual scale
const GridFloor = ({ size = 200, divisions = 40, color1 = '#1a1a1a', color2 = '#222222' }) => {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, -0.01, 0]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color={color1} wireframe={false} />
    </mesh>
  )
}

// Create distant mountains for visual interest
interface MountainProps {
  position: [number, number, number];
  color: string;
  scale?: number;
}

const DistantMountain = ({ position, color, scale = 1 }: MountainProps) => {
  return (
    <mesh position={position} scale={scale} castShadow>
      <coneGeometry args={[15, 25, 4]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

// Create repeating decorative elements in a grid
interface DecorativeElementsProps {
  count?: number;
  spread?: number;
}

// Deterministic pseudo-random number generator based on an index
const getPseudoRandom = (index: number, offset: number = 0) => {
  // Simple deterministic algorithm - always returns the same value for the same index
  return (Math.sin(index * 12.9898 + offset * 78.233) * 43758.5453) % 1;
};

const DecorativeElements = ({ count = 40, spread = 100 }: DecorativeElementsProps) => {
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        // Generate positions in a grid-like pattern with deterministic randomness
        const posX = (Math.floor(i / 5) * 25) - spread/2 + (getPseudoRandom(i, 1) * 10)
        const posZ = (i % 5 * 25) - spread/2 + (getPseudoRandom(i, 2) * 10)
        // Don't place elements in the center gameplay area
        if (Math.abs(posX) < 25 && Math.abs(posZ) < 20) return null;
        
        // Use deterministic values for scale and type
        const scale = 0.5 + getPseudoRandom(i, 3) * 1.5;
        const type = Math.floor(getPseudoRandom(i, 4) * 3);
        
        return (
          <RigidBody key={`decor-${i}`} type="fixed" position={[posX, 0, posZ]} restitution={0.2} friction={1}>
            <mesh castShadow receiveShadow>
              {type === 0 && <boxGeometry args={[2 * scale, 4 * scale, 2 * scale]} />}
              {type === 1 && <cylinderGeometry args={[1 * scale, 1 * scale, 3 * scale, 8]} />}
              {type === 2 && <sphereGeometry args={[1.5 * scale, 16, 16]} />}
              <meshStandardMaterial color={getPseudoRandom(i, 5) > 0.5 ? '#335533' : '#553333'} />
            </mesh>
          </RigidBody>
        );
      })}
    </group>
  );
};

const Arena = () => {
  const floorRef = useRef(null)
  
  // Platform layout based on original Killer Queen but with larger infinite-style arena
  return (
    <>
      {/* Scene setup for infinite feel */}
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 80, 150]} />
      
      <group position={[0, 0, 0]}>
        {/* Massive floor for infinite feeling */}
        <RigidBody type="fixed" position={[0, -0.5, 0]} restitution={0.2} friction={1}>
          <mesh receiveShadow ref={floorRef}>
            <boxGeometry args={[200, 1, 200]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </RigidBody>

        {/* Grid overlay for sense of scale */}
        <GridFloor size={200} divisions={40} />

        {/* Distant mountains for horizon interest */}
        <group position={[0, 0, 0]}>
          <DistantMountain position={[-100, 10, -100]} color="#223344" scale={2} />
          <DistantMountain position={[80, 5, -90]} color="#222233" scale={1.5} />
          <DistantMountain position={[120, 10, 70]} color="#222233" scale={2.2} />
          <DistantMountain position={[-90, 8, 110]} color="#222233" scale={1.8} />
        </group>

        {/* Add decorative elements across the arena */}
        <DecorativeElements count={40} spread={180} />

        {/* Blue Team Base */}
        <RigidBody type="fixed" position={[-15, 2, 0]} restitution={0.2} friction={1}>
          <mesh receiveShadow castShadow>
            <boxGeometry args={[8, 4, 15]} />
            <meshStandardMaterial color="#1a3a8a" />
          </mesh>
        </RigidBody>

        {/* Gold Team Base */}
        <RigidBody type="fixed" position={[15, 2, 0]} restitution={0.2} friction={1}>
          <mesh receiveShadow castShadow>
            <boxGeometry args={[8, 4, 15]} />
            <meshStandardMaterial color="#8a7a1a" />
          </mesh>
        </RigidBody>

        {/* Central Platform */}
        <RigidBody type="fixed" position={[0, 5, 0]} restitution={0.2} friction={1}>
          <mesh receiveShadow castShadow>
            <boxGeometry args={[12, 1, 8]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
        </RigidBody>

        {/* Left Platform */}
        <RigidBody type="fixed" position={[-8, 8, -6]} restitution={0.2} friction={1}>
          <mesh receiveShadow castShadow>
            <boxGeometry args={[6, 1, 4]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
        </RigidBody>

        {/* Right Platform */}
        <RigidBody type="fixed" position={[8, 8, 6]} restitution={0.2} friction={1}>
          <mesh receiveShadow castShadow>
            <boxGeometry args={[6, 1, 4]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
        </RigidBody>

        {/* Snail Track */}
        <RigidBody type="fixed" position={[0, 0.1, 8]} restitution={0.2} friction={1}>
          <mesh receiveShadow>
            <boxGeometry args={[30, 0.2, 2]} />
            <meshStandardMaterial color="#553311" />
          </mesh>
        </RigidBody>

        {/* Berry deposits */}
        <RigidBody type="fixed" position={[-14, 2.5, -6]} restitution={0.2} friction={1}>
          <mesh receiveShadow castShadow>
            <cylinderGeometry args={[1.5, 1.5, 1, 32]} />
            <meshStandardMaterial color="#1a3a8a" />
          </mesh>
        </RigidBody>

        <RigidBody type="fixed" position={[14, 2.5, 6]} restitution={0.2} friction={1}>
          <mesh receiveShadow castShadow>
            <cylinderGeometry args={[1.5, 1.5, 1, 32]} />
            <meshStandardMaterial color="#8a7a1a" />
          </mesh>
        </RigidBody>

        {/* Berry spawns */}
        {Array.from({ length: 5 }).map((_, i) => (
          <RigidBody
            key={`berry-${i}`}
            type="fixed"
            position={[-5 + i * 2.5, 0.6, -5]}
            restitution={0.2}
            friction={1}
          >
            <mesh receiveShadow castShadow>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial color="#aa3322" />
            </mesh>
          </RigidBody>
        ))}

        {/* Team labels */}
        <Center position={[-15, 6, 0]}>
          <Text3D
            font="/fonts/helvetiker_regular.typeface.json"
            size={1.2}
            height={0.2}
            curveSegments={12}
          >
            BLUE
            <meshStandardMaterial color="#4455ff" />
          </Text3D>
        </Center>

        <Center position={[15, 6, 0]}>
          <Text3D
            font="/fonts/helvetiker_regular.typeface.json"
            size={1.2}
            height={0.2}
            curveSegments={12}
          >
            GOLD
            <meshStandardMaterial color="#ffcc22" />
          </Text3D>
        </Center>

        {/* Much further out invisible walls to keep players in bounds */}
        <CuboidCollider args={[100, 20, 0.5]} position={[0, 10, 100]} />
        <CuboidCollider args={[100, 20, 0.5]} position={[0, 10, -100]} />
        <CuboidCollider args={[0.5, 20, 100]} position={[100, 10, 0]} />
        <CuboidCollider args={[0.5, 20, 100]} position={[-100, 10, 0]} />
        
        {/* Enhanced lighting for the larger arena */}
        <directionalLight 
          position={[-40, 50, 40]} 
          intensity={0.6}
          castShadow 
          shadow-mapSize={[4096, 4096]}
          shadow-camera-left={-100}
          shadow-camera-right={100}
          shadow-camera-top={100}
          shadow-camera-bottom={-100}
        />
        
        {/* Ambient fill light */}
        <ambientLight intensity={0.2} />
      </group>
    </>
  )
}

export default Arena 