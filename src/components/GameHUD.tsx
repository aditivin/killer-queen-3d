import React, { useState } from 'react'
import { useGameStore } from '../store/gameStore'

interface GameHUDProps {
  isConnected: boolean
}

const GameHUD: React.FC<GameHUDProps> = ({ isConnected }) => {
  const [showControls, setShowControls] = useState(true)
  const { gameState } = useGameStore()
  
  // No need for a portal anymore since it's rendered outside the canvas in App.tsx
  return (
    <>
      {/* Game stats */}
      <div className="hud">
        <div className="hud-item">
          <h2>Game Status: {gameState.status}</h2>
        </div>
        
        <div className="hud-item">
          <h3>Score</h3>
          <div>Blue: {gameState.blueScore} | Gold: {gameState.goldScore}</div>
        </div>
        
        <div className="hud-item">
          <h3>Queens</h3>
          <div>Blue: {gameState.blueQueenAlive ? '👑 Alive' : '💀 Dead'}</div>
          <div>Gold: {gameState.goldQueenAlive ? '👑 Alive' : '💀 Dead'}</div>
        </div>
        
        <div className="hud-item">
          <h3>Berry Count</h3>
          <div>Blue: {gameState.berryCount.blue} | Gold: {gameState.berryCount.gold}</div>
        </div>
        
        <div className="hud-item">
          <h3>Snail Progress: {gameState.snailPosition}%</h3>
          <div style={{ 
            width: '100%', 
            height: '20px', 
            background: 'linear-gradient(to right, #4455ff, #ffcc22)',
            position: 'relative'
          }}>
            <div style={{ 
              position: 'absolute', 
              left: `${gameState.snailPosition}%`, 
              top: 0, 
              width: '10px', 
              height: '20px', 
              background: 'white',
              transform: 'translateX(-50%)'
            }} />
          </div>
        </div>
      </div>
      
      {/* Connection status */}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '✓ Connected' : '✗ Disconnected'}
      </div>
      
      {/* Controls overlay */}
      {showControls && (
        <div className="controls-overlay">
          <div className="controls-container">
            <h2 className="controls-title">Killer Queen 3D Controls</h2>
            
            <div className="controls-grid">
              <div>
                <h3>Movement</h3>
                <div className="control-group">
                  <span className="control-key">W</span> Move Forward
                </div>
                <div className="control-group">
                  <span className="control-key">S</span> Move Backward
                </div>
                <div className="control-group">
                  <span className="control-key">A</span> Move Left
                </div>
                <div className="control-group">
                  <span className="control-key">D</span> Move Right
                </div>
                <div className="control-group">
                  <span className="control-key">SPACE</span> Jump
                </div>
              </div>
              
              <div>
                <h3>Game Goals</h3>
                <p>Killer Queen has three ways to win:</p>
                <ol>
                  <li>Economic Victory: Collect berries and fill your hive</li>
                  <li>Military Victory: Kill the enemy queen three times</li>
                  <li>Snail Victory: Ride the snail to your goal</li>
                </ol>
              </div>
            </div>
            
            <button className="close-button" onClick={() => setShowControls(false)}>
              Start Playing
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default GameHUD 