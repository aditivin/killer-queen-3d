import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls, useAnimations, useGLTF } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Vector3, Quaternion, Euler, MeshStandardMaterial, Group, Mesh, ShapeGeometry, Shape, Path, DoubleSide } from 'three'
import { useSocketConnection } from '../../networking/useSocketConnection'
import { Controls } from '../../main'

interface PlayerProps {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  team: 'blue' | 'gold'
  role: 'queen' | 'worker' | 'soldier'
  isLocalPlayer: boolean
  isActive: boolean
}

// Flight dynamics settings
const FLIGHT_SETTINGS = {
  FORWARD_SPEED: 10,
  TURN_SPEED: 3.5,
  TILT_FACTOR: 0.4,
  ROLL_FACTOR: 0.6,
  PITCH_FACTOR: 0.4,
  ASCEND_SPEED: 8,
  DESCEND_SPEED: 6,
  HOVER_AMPLITUDE: 0.1,
  HOVER_FREQUENCY: 2,
  MAX_VELOCITY: 20,
  DRAG_FACTOR: 0.95,
  LEVELING_FACTOR: 0.08, // How quickly the bee levels out when not turning
  WING_FLAP_SPEED: 30
}

// Character sizes for different roles
const CHARACTER_SIZES = {
  queen: [1.2, 1.0, 1.8],
  worker: [0.8, 0.7, 1.2],
  soldier: [1, 0.8, 1.5]
}

// Team colors - make them more vibrant with higher contrast
const TEAM_COLORS = {
  blue: '#0055ff',   // Deeper blue for better contrast
  gold: '#ffdd00'    // Brighter yellow
}

// Body colors for teams
const BODY_COLORS = {
  blue: '#1144ff',   // Vibrant blue for main body
  gold: '#ffcc00'    // Bright yellow for main body
}

// Simple bee model component
interface BeeModelProps {
  team: 'blue' | 'gold';
  role: 'queen' | 'worker' | 'soldier';
  isFlying: boolean;
}

const BeeModel = ({ team, role, isFlying }: BeeModelProps) => {
  // Create refs for the main body and wing parts
  const bodyRef = useRef<Group>(null);
  const leftWingRef = useRef<Mesh>(null);
  const rightWingRef = useRef<Mesh>(null);
  const groupRef = useRef<Group>(null);
  
  // Set up initial animation state
  const [wingRotation, setWingRotation] = useState(0)
  
  // Get team color
  const teamColor = TEAM_COLORS[team]
  const bodyColor = BODY_COLORS[team]
  
  // Size based on role
  const [width, height, length] = CHARACTER_SIZES[role]

  // Create rounded wing shapes
  const leftWingShape = useMemo(() => {
    const shape = new Shape();
    
    // Create a wing with a narrower base that attaches to the bee and rounded tip
    shape.moveTo(0, 0); // Start at the attachment point
    shape.bezierCurveTo(
      width * 0.1, length * 0.3, // Control point 1
      width * 0.5, length * 0.6, // Control point 2 - adjusted for rounder tip
      width * 0.6, length * 0.3  // End point - moved inward for rounded edge
    );
    shape.bezierCurveTo(
      width * 0.6, length * 0.1, // Control point 1 - smoother curve
      width * 0.2, -length * 0.2, // Control point 2
      0, 0 // Complete the shape back at the origin
    );
    
    return shape;
  }, [width, length]);
  
  const rightWingShape = useMemo(() => {
    const shape = new Shape();
    
    // Create a wing with a narrower base that attaches to the bee and rounded tip (mirror of left wing)
    shape.moveTo(0, 0); // Start at the attachment point
    shape.bezierCurveTo(
      -width * 0.1, length * 0.3, // Control point 1
      -width * 0.5, length * 0.6, // Control point 2 - adjusted for rounder tip
      -width * 0.6, length * 0.3  // End point - moved inward for rounded edge
    );
    shape.bezierCurveTo(
      -width * 0.6, length * 0.1, // Control point 1 - smoother curve
      -width * 0.2, -length * 0.2, // Control point 2
      0, 0 // Complete the shape back at the origin
    );
    
    return shape;
  }, [width, length]);
  
  // Animate the wings on each frame
  useFrame((state, delta) => {
    if (!leftWingRef.current || !rightWingRef.current) return
    
    // Faster wing flapping when flying, slower when not
    const flapSpeed = isFlying ? FLIGHT_SETTINGS.WING_FLAP_SPEED : FLIGHT_SETTINGS.WING_FLAP_SPEED * 0.3
    
    // Update wing rotation with a sine wave pattern
    const newRotation = Math.sin(state.clock.elapsedTime * flapSpeed) * 0.5
    setWingRotation(newRotation)
    
    // Apply the rotation primarily to the y-axis (up/down flapping) with the pivot at the attachment point
    leftWingRef.current.rotation.y = newRotation * 0.8;
    leftWingRef.current.rotation.z = -Math.abs(newRotation) * 0.3; // Reduced z-axis rotation
    
    rightWingRef.current.rotation.y = -newRotation * 0.8;
    rightWingRef.current.rotation.z = Math.abs(newRotation) * 0.3; // Reduced z-axis rotation
    
    // Add a gentle hover effect to the entire bee
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * FLIGHT_SETTINGS.HOVER_FREQUENCY) 
        * FLIGHT_SETTINGS.HOVER_AMPLITUDE
    }
  })
  
  return (
    <group ref={groupRef}>
      {/* Main bee body - rotated to be horizontal */}
      <group ref={bodyRef} rotation={[Math.PI / 2, 0, 0]}>
        {/* Create a single main body - even shorter and more round */}
        <mesh position={[0, 0, 0]} castShadow>
          <sphereGeometry args={[width/1.3, 16, 16]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
        
        {/* Head segment - moved closer to body for shorter appearance */}
        <mesh position={[0, length/4, 0]} castShadow>
          <sphereGeometry args={[width*0.42, 16, 16]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
        
        {/* Removing eyes and smile as requested */}
        
        {/* Stinger - repositioned to connect with body and properly oriented with pointy end outward */}
        <mesh position={[0, -width/1.1, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[width/12, width/2, 8]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
      </group>
      
      {/* Wings and antennae - positioned on top of the bee body */}
      <group position={[0, width/4, 0]} rotation={[0, 0, 0]}>
        {/* Left wing - positioned to attach directly to the bee body */}
        <group position={[width/1.5, 0, -width/10]}>
          <mesh 
            ref={leftWingRef} 
            position={[0, 0, 0]} 
            rotation={[Math.PI/2, 0, 0]}
          >
            <shapeGeometry args={[leftWingShape]} />
            <meshStandardMaterial 
              color="#ffffff" 
              transparent={true} 
              opacity={0.35} 
              side={DoubleSide}
              metalness={0.3}
              roughness={0.2}
            />
          </mesh>
        </group>
        
        {/* Right wing - positioned to attach directly to the bee body */}
        <group position={[-width/1.5, 0, -width/10]}>
          <mesh 
            ref={rightWingRef} 
            position={[0, 0, 0]} 
            rotation={[Math.PI/2, 0, 0]}
          >
            <shapeGeometry args={[rightWingShape]} />
            <meshStandardMaterial 
              color="#ffffff" 
              transparent={true} 
              opacity={0.35} 
              side={DoubleSide}
              metalness={0.3}
              roughness={0.2}
            />
          </mesh>
        </group>
        
        {/* Antennae relocated to top of bee near wings */}
        <group>
          {/* Left antenna - single continuous element */}
          <mesh position={[width/3, -width/10, 0]} rotation={[Math.PI, 0, Math.PI/6]}>
            <cylinderGeometry args={[width/50, width/35, width*1.5, 8]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
          
          {/* Right antenna - single continuous element */}
          <mesh position={[-width/3, -width/10, 0]} rotation={[Math.PI, 0, -Math.PI/6]}>
            <cylinderGeometry args={[width/50, width/35, width*1.5, 8]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
        </group>
      </group>
      
      {/* Role indicator for soldier (add small spikes) */}
      {role === 'soldier' && (
        <group position={[0, width/5, 0]} rotation={[Math.PI/2, 0, 0]}>
          <mesh position={[width/2, 0, 0]} rotation={[0, 0, Math.PI/2]}>
            <coneGeometry args={[width/10, width/2, 4]} />
            <meshStandardMaterial color={teamColor} />
          </mesh>
          <mesh position={[-width/2, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
            <coneGeometry args={[width/10, width/2, 4]} />
            <meshStandardMaterial color={teamColor} />
          </mesh>
        </group>
      )}
      
      {/* Crown for queen - make it less obtrusive */}
      {role === 'queen' && (
        <group position={[0, width/2, -length/10]} rotation={[Math.PI/5, 0, 0]}>
          <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[width/3, width/4, width/4, 5]} />
            <meshStandardMaterial color={teamColor} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, width/5, 0]} rotation={[0, 0, 0]}>
            <sphereGeometry args={[width/10, 8, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
          </mesh>
        </group>
      )}
    </group>
  )
}

const Player = ({
  id,
  position,
  rotation,
  team,
  role,
  isLocalPlayer,
  isActive
}: PlayerProps) => {
  // Using any here to avoid TypeScript errors with RigidBody methods
  const bodyRef = useRef<any>(null)
  const modelRef = useRef<any>(null)
  const [playerPosition, setPlayerPosition] = useState(new Vector3(...position))
  const [playerRotation, setPlayerRotation] = useState(new Euler(...rotation))
  const { socket } = useSocketConnection()
  const { camera } = useThree()
  const lastUpdateTimeRef = useRef(0)
  const positionRef = useRef(position)
  const rotationRef = useRef(new Euler(...rotation))
  const remotePositionChangeRef = useRef(false)
  const velocityRef = useRef(new Vector3(0, 0, 0))
  const isFlying = useRef(false)
  
  // Create a flight dynamics state
  const flightDynamics = useRef({
    velocity: new Vector3(0, 0, 0),
    roll: 0,
    pitch: 0,
    yaw: 0,
    throttle: 0,
    targetRoll: 0,
    targetPitch: 0
  })
  
  // Debug info about this player
  useEffect(() => {
    if (isLocalPlayer) {
      console.log('==== Local Player Info ====')
      console.log(`ID: ${id}`)
      console.log(`Team: ${team}, Role: ${role}`)
      console.log(`Initial Position: [${position[0]}, ${position[1]}, ${position[2]}]`)
      console.log(`Is Active: ${isActive}`)
      console.log('==========================')
    }
  }, [id, team, role, position, isActive, isLocalPlayer])
  
  // For tracking position changes in remote players
  useEffect(() => {
    if (!isLocalPlayer) {
      // Always update the position reference and set the flag to true
      // This ensures we always apply the latest position update from the server
      console.log(`Remote player ${id.slice(0,5)} position update:`, 
        `(${positionRef.current[0].toFixed(2)},${positionRef.current[1].toFixed(2)},${positionRef.current[2].toFixed(2)})`,
        `-> (${position[0].toFixed(2)},${position[1].toFixed(2)},${position[2].toFixed(2)})`
      );
      
      // Flag that we need to update the position in the next frame
      remotePositionChangeRef.current = true;
      positionRef.current = position;
      
      // Also update rotation for remote players
      setPlayerRotation(new Euler(...rotation));
      rotationRef.current = new Euler(...rotation);
    }
  }, [id, isLocalPlayer, position, rotation]);
  
  // Basic WASD controls for local player
  const [, getKeys] = useKeyboardControls()
  
  // Handle player initialization
  useEffect(() => {
    if (bodyRef.current) {
      console.log(`Player ${id.slice(0,5)}: Setting initial position to [${position[0]}, ${position[1]}, ${position[2]}]`);
      
      // For all players, set the initial position
      bodyRef.current.setTranslation({ 
        x: position[0], 
        y: position[1], 
        z: position[2] 
      });
      
      // For all players, set the initial rotation
      if (!isLocalPlayer) {
        setPlayerRotation(new Euler(...rotation));
        rotationRef.current = new Euler(...rotation);
      }
    }
  }, []);  // Only run once on mount
  
  // Frame-by-frame update
  useFrame((state, delta) => {
    if (!bodyRef.current) return;
    
    // For remote players, sync position if it changed
    if (!isLocalPlayer) {
      // Always update remote player positions to ensure smooth movement
      const pos = positionRef.current;
      bodyRef.current.setTranslation({ 
        x: pos[0], 
        y: pos[1], 
        z: pos[2] 
      }, true); // Added 'true' to wake up the physics body
      
      // Apply rotation to the model (not the rigid body)
      if (modelRef.current) {
        const targetQuaternion = new Quaternion().setFromEuler(rotationRef.current);
        modelRef.current.quaternion.slerp(targetQuaternion, delta * 5);
      }
      
      remotePositionChangeRef.current = false;
      return;
    }
    
    // From here on, only for local player
    if (!isActive) {
      console.log('Local player is not active, ignoring controls');
      return;
    }
    
    const keys = getKeys()
    const { forward, backward, left, right, jump, shift } = keys
    
    // Set flying state for animation
    isFlying.current = forward || backward || left || right || jump;
    
    // Get current velocity
    const velocity = bodyRef.current.linvel();
    velocityRef.current = new Vector3(velocity.x, velocity.y, velocity.z);
    
    // Calculate flight dynamics
    // Commenting out unused destructuring
    // const { roll, pitch } = flightDynamics.current;
    
    // Apply flight forces - more airplane-like physics
    const impulse = { x: 0, y: 0, z: 0 };
    let throttle = 0;
    
    // Forward movement is always on for a bee, but at different speeds
    throttle = forward ? FLIGHT_SETTINGS.FORWARD_SPEED : 
               backward ? -FLIGHT_SETTINGS.FORWARD_SPEED * 0.7 : 
               FLIGHT_SETTINGS.FORWARD_SPEED * 0.3;
    
    // Calculate the direction vector based on current rotation
    const direction = new Vector3(0, 0, -1).applyEuler(playerRotation);
    
    // Apply throttle in the forward direction
    impulse.x = direction.x * throttle * delta * 60;
    impulse.z = direction.z * throttle * delta * 60;
    
    // Turning (left/right) - gradually apply roll when turning
    if (left) {
      playerRotation.y += FLIGHT_SETTINGS.TURN_SPEED * delta;
      flightDynamics.current.targetRoll = FLIGHT_SETTINGS.ROLL_FACTOR;
    } else if (right) {
      playerRotation.y -= FLIGHT_SETTINGS.TURN_SPEED * delta;
      flightDynamics.current.targetRoll = -FLIGHT_SETTINGS.ROLL_FACTOR;
    } else {
      // Return to level flight
      flightDynamics.current.targetRoll = 0;
    }
    
    // Gradual roll adjustment for smooth banking
    flightDynamics.current.roll += (flightDynamics.current.targetRoll - flightDynamics.current.roll) * 
      FLIGHT_SETTINGS.LEVELING_FACTOR * delta * 60;
    
    // Vertical movement (jump/descend)
    if (jump) {
      impulse.y = FLIGHT_SETTINGS.ASCEND_SPEED * delta * 60;
      flightDynamics.current.targetPitch = -FLIGHT_SETTINGS.PITCH_FACTOR; // Nose up
    } else if (shift) {
      impulse.y = -FLIGHT_SETTINGS.DESCEND_SPEED * delta * 60;
      flightDynamics.current.targetPitch = FLIGHT_SETTINGS.PITCH_FACTOR; // Nose down
    } else {
      // Hover in place with a slight up/down oscillation
      const hoverForce = Math.sin(state.clock.elapsedTime * 2) * 0.05;
      impulse.y = velocity.y < -1 ? 0.2 + hoverForce : velocity.y > 1 ? -0.2 + hoverForce : hoverForce;
      flightDynamics.current.targetPitch = 0;
    }
    
    // Gradual pitch adjustment for smooth motion
    flightDynamics.current.pitch += (flightDynamics.current.targetPitch - flightDynamics.current.pitch) * 
      FLIGHT_SETTINGS.LEVELING_FACTOR * delta * 60;
    
    // Apply impulse for movement
    bodyRef.current.applyImpulse(impulse, true);
    
    // Limit maximum velocity
    const currentVel = bodyRef.current.linvel();
    const speed = Math.sqrt(currentVel.x * currentVel.x + currentVel.z * currentVel.z);
    
    if (speed > FLIGHT_SETTINGS.MAX_VELOCITY) {
      const scaleFactor = FLIGHT_SETTINGS.MAX_VELOCITY / speed;
      bodyRef.current.setLinvel({
        x: currentVel.x * scaleFactor,
        y: currentVel.y,
        z: currentVel.z * scaleFactor
      });
    }
    
    // Update rotation state
    setPlayerRotation(playerRotation);
    
    // Apply roll and pitch to the model (not the rigid body)
    if (modelRef.current) {
      // Create a quaternion from the flight dynamics
      const modelRotation = new Euler(
        flightDynamics.current.pitch,
        playerRotation.y + Math.PI, // Add PI to face forward
        flightDynamics.current.roll
      );
      
      const targetQuaternion = new Quaternion().setFromEuler(modelRotation);
      
      // Smoothly interpolate to the target rotation
      modelRef.current.quaternion.slerp(targetQuaternion, delta * 5);
    }
    
    // Update position for sending to server
    const worldPosition = bodyRef.current.translation();
    setPlayerPosition(new Vector3(worldPosition.x, worldPosition.y, worldPosition.z));
    
    // Update camera for a more dynamic flight feel
    if (isLocalPlayer) {
      // Dynamic camera that follows with slight lag, giving sense of momentum
      const idealOffset = new Vector3(0, 7, 15);
      
      // Banking effect in the camera
      idealOffset.x += flightDynamics.current.roll * 3;
      
      // Apply the current rotation to the offset
      idealOffset.applyAxisAngle(new Vector3(0, 1, 0), playerRotation.y);
      
      // Calculate the target camera position
      const targetPosition = new Vector3(
        worldPosition.x + idealOffset.x,
        worldPosition.y + idealOffset.y, 
        worldPosition.z + idealOffset.z
      );
      
      // Smoothly move the camera
      camera.position.lerp(targetPosition, delta * 3);
      
      // Look ahead slightly when moving to see where you're going
      const lookAtPosition = new Vector3(
        worldPosition.x + direction.x * 5,  // Look ahead in the direction of travel
        worldPosition.y + 2 - flightDynamics.current.pitch * 5, // Adjust for pitch
        worldPosition.z + direction.z * 5
      );
      
      camera.lookAt(lookAtPosition);
    }
    
    // Send position update to server - throttled to reduce network traffic
    const now = state.clock.elapsedTime * 1000;
    if (socket && now - lastUpdateTimeRef.current > 33) {  // ~30 updates per second
      // Get the current position
      const currentPos = [
        parseFloat(worldPosition.x.toFixed(2)),
        parseFloat(worldPosition.y.toFixed(2)),
        parseFloat(worldPosition.z.toFixed(2))
      ] as [number, number, number];
      
      // Get current rotation
      const currentRot = [
        parseFloat(playerRotation.x.toFixed(2)),
        parseFloat(playerRotation.y.toFixed(2)),
        parseFloat(playerRotation.z.toFixed(2))
      ] as [number, number, number];
      
      // Compare with previous position before sending
      const oldPos = positionRef.current;
      const dx = Math.abs(oldPos[0] - currentPos[0]);
      const dy = Math.abs(oldPos[1] - currentPos[1]);
      const dz = Math.abs(oldPos[2] - currentPos[2]);
      
      // Only send update if position changed significantly
      if (dx > 0.01 || dy > 0.01 || dz > 0.01) {
        lastUpdateTimeRef.current = now;
        positionRef.current = currentPos;
        
        socket.emit('playerUpdate', {
          position: currentPos,
          rotation: currentRot
        });
      }
    }
  })
  
  // Player opacity based on active state
  const playerOpacity = isActive ? 1 : 0.5
  
  return (
    <group position={[0, 0, 0]}>
      <RigidBody
        ref={bodyRef}
        position={position}
        type={isLocalPlayer ? 'dynamic' : 'kinematicPosition'}
        linearDamping={1.5}
        angularDamping={2.0}
        enabledRotations={[false, false, false]} // Lock physical rotations, we'll handle visual rotation
        colliders={false} // We'll add our own collider
        mass={1}
      >
        <group ref={modelRef}>
          <BeeModel team={team} role={role} isFlying={isFlying.current} />
        </group>
        
        {/* Smaller collider for better physics */}
        <CuboidCollider args={[0.6, 0.6, 0.6]} />
      </RigidBody>
    </group>
  )
}

export default Player 