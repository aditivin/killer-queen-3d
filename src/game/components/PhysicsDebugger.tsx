/**
 * PhysicsDebugger component
 * 
 * Renders debug visualizations for the scene
 * This is conditionally rendered in the Game component based on the showDebug prop
 */
export const PhysicsDebugger = () => {
  return (
    <group>
      {/* Axes helper to show X, Y, Z directions */}
      <axesHelper args={[5]} />
      
      {/* Grid helper to show the ground plane */}
      <gridHelper args={[50, 50, 0x888888, 0x444444]} position={[0, 0.01, 0]} />
      
      {/* Origin marker */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="red" wireframe />
      </mesh>
    </group>
  )
} 