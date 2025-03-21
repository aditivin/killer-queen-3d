import { Suspense, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import './App.css'
import Game from './game/Game'
import GameHUD from './components/GameHUD'
import { useSocketConnection } from './networking/useSocketConnection'

function App() {
  const { isConnected } = useSocketConnection()
  const [showDebug, setShowDebug] = useState(false)

  // Add keydown listener for debug toggle using useEffect
  useEffect(() => {
    // Handle key press for debug toggle
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        setShowDebug(prev => !prev)
        console.log('Debug mode:', !showDebug)
      }
    }
    
    // Add the event listener
    window.addEventListener('keydown', handleKeyDown)
    
    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showDebug]) // Only re-add if showDebug changes

  return (
    <div className="app-container">
      <div className="game-container">
        <Canvas 
          shadows 
          camera={{ 
            position: [0, 15, 25], 
            fov: 45,
            near: 0.1,
            far: 1000
          }}
          style={{ 
            width: '100%', 
            height: '100%',
            display: 'block'
          }}
        >
          <Suspense fallback={null}>
            <Physics debug={false}>
              <Game showDebug={showDebug} />
              <Environment preset="city" />
            </Physics>
            {/* Removed OrbitControls to allow the camera follow in Player component to work */}
          </Suspense>
        </Canvas>
        
        {/* HUD is now outside of the Canvas */}
        <GameHUD isConnected={isConnected} />
      </div>
    </div>
  )
}

export default App
