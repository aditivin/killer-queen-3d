import { useEffect, useRef, useState } from 'react'
import { useSocketConnection } from '../networking/useSocketConnection'
import { useGameStore } from '../store/gameStore'
import { KeyboardControlsEntry } from '@react-three/drei'
import { PhysicsDebugger } from './components/PhysicsDebugger'
import Arena from './scenes/Arena'
import Player from './models/Player'
import { Controls } from '../main'

interface PlayerData {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  team: 'blue' | 'gold'
  role: 'queen' | 'worker' | 'soldier'
  isActive: boolean
}

interface GameStateResponse {
  players: Record<string, PlayerData>
}

interface PlayerAssignedResponse {
  playerId: string
  team: 'blue' | 'gold'
  role: 'queen' | 'worker' | 'soldier'
}

interface PlayerPositionUpdateResponse {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
}

const Game = ({ showDebug = false }) => {
  const { socket } = useSocketConnection()
  const { gameState, playerId, setGameState, setPlayerId, updatePlayerPosition, clearPlayerId } = useGameStore()
  
  // Use ref to track if player has already joined to prevent multiple joins
  const hasJoinedRef = useRef(false)
  // Track connection status to avoid multiple reconnection attempts
  const connectionAttemptedRef = useRef(false)
  // Track reconnection attempts
  const reconnectionAttempts = useRef(0)
  // Track if we should try to rejoin as a new player
  const [shouldRejoin, setShouldRejoin] = useState(false)
  
  // If we have a playerId, we should consider ourselves already joined
  useEffect(() => {
    if (playerId) {
      console.log('Setting hasJoinedRef to true because we have a playerId:', playerId)
      hasJoinedRef.current = true;
    }
  }, [playerId]);
  
  // Handle socket connection and game events
  useEffect(() => {
    // Exit early if no socket connection
    if (!socket) return;
    
    // Only set up event listeners once
    if (!connectionAttemptedRef.current) {
      console.log('Socket connected, setting up game events')
      connectionAttemptedRef.current = true
      
      // If we should rejoin as a new player (previous reconnection failed)
      if (shouldRejoin) {
        console.log('Rejoining as a new player after failed reconnection')
        socket.emit('joinGame')
        hasJoinedRef.current = true
        setShouldRejoin(false)
        return
      }
      
      // Only join if we haven't already and don't have a player ID
      if (!hasJoinedRef.current && !playerId) {
        console.log('Joining game...')
        socket.emit('joinGame')
        hasJoinedRef.current = true
      } else if (playerId) {
        console.log('Already have player ID, not joining again:', playerId)
      }
      
      // Handle player assignment
      socket.on('playerAssigned', (response: PlayerAssignedResponse) => {
        console.log('Player assigned:', response)
        setPlayerId(response.playerId)
      })
      
      // Handle game state updates
      socket.on('gameState', (state: GameStateResponse) => {
        console.log('Game state update received:', Object.keys(state.players).length, 'players')
        
        // If we have a player ID but it's not in the game state after reconnection attempt
        if (playerId && !state.players[playerId] && reconnectionAttempts.current > 0) {
          console.log('Player ID not found in game state after reconnection attempt')
          
          if (reconnectionAttempts.current >= 3) {
            console.log('Max reconnection attempts reached, clearing player ID and joining as new player')
            clearPlayerId()
            setShouldRejoin(true)
            hasJoinedRef.current = false
            reconnectionAttempts.current = 0
            // Force a new connection attempt
            connectionAttemptedRef.current = false
            return
          }
        }
        
        setGameState(state)
      })
      
      // Handle optimized player position updates
      socket.on('playerPositionUpdate', (data: PlayerPositionUpdateResponse) => {
        // Only update if this is not our own player (we already have our local position)
        if (data.id !== playerId) {
          updatePlayerPosition(data.id, data.position, data.rotation)
        }
      })
      
      // If we disconnected previously but have a playerId, send a reconnect message to the server
      if (playerId && hasJoinedRef.current) {
        console.log('Attempting to reconnect with player ID:', playerId)
        socket.emit('reconnectPlayer', { playerId })
        reconnectionAttempts.current += 1
      }
    }
    
    // Clean up listeners when component unmounts
    return () => {
      // Only clean up if we're truly unmounting the entire game component
      if (document.hidden) { // Only disconnect when browser tab/window is being closed
        console.log('Window is hidden, cleaning up game events')
        socket.off('playerAssigned')
        socket.off('gameState')
        socket.off('playerPositionUpdate')
        
        if (hasJoinedRef.current && playerId) {
          console.log('Sending explicit leaveGame on page unload')
          socket.emit('leaveGame')
        }
      } else {
        console.log('Component re-rendering, keeping socket connection and player state')
      }
    }
  }, [socket, setGameState, setPlayerId, updatePlayerPosition, playerId, clearPlayerId, shouldRejoin])
  
  // Debug log when players change
  useEffect(() => {
    console.log('Players updated:', Object.keys(gameState.players).length, 'active players', 'Local player ID:', playerId)
    
    // If we have a player ID but it's not in the game state after socket is connected
    if (playerId && !gameState.players[playerId] && socket && socket.connected && reconnectionAttempts.current === 0) {
      console.log('Player ID not found in initial game state, attempting reconnection')
      socket.emit('reconnectPlayer', { playerId })
      reconnectionAttempts.current += 1
    }
  }, [gameState.players, playerId, socket])
  
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      
      <Arena />
      
      {Object.entries(gameState.players).map(([id, player]) => {
        // Type assertion to ensure TypeScript knows this is a PlayerData
        const typedPlayer = player as PlayerData;
        
        return (
          <Player
            key={id}
            id={id}
            position={typedPlayer.position}
            rotation={typedPlayer.rotation}
            team={typedPlayer.team}
            role={typedPlayer.role}
            isLocalPlayer={id === playerId}
            isActive={typedPlayer.isActive}
          />
        );
      })}
      
      {/* Debug information */}
      {(() => {
        if (playerId && !gameState.players[playerId]) {
          console.log("Warning: Player has ID but no player data exists:", playerId);
          return (
            <mesh position={[0, 2, 0]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="red" />
            </mesh>
          );
        }
        return null;
      })()}
      
      {showDebug && <PhysicsDebugger />}
    </>
  )
}

export default Game 