import express from 'express'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import cors from 'cors'

interface Player {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  team: 'blue' | 'gold'
  role: 'queen' | 'worker' | 'soldier'
  isActive: boolean
}

interface GameState {
  status: 'waiting' | 'starting' | 'playing' | 'ended'
  players: Record<string, Player>
  blueScore: number
  goldScore: number
  blueQueenAlive: boolean
  goldQueenAlive: boolean
  snailPosition: number
  berryCount: {
    blue: number
    gold: number
  }
}

interface ServerToClientEvents {
  gameState: (state: GameState) => void
  playerAssigned: (data: { playerId: string, team: 'blue' | 'gold', role: 'queen' | 'worker' | 'soldier' }) => void
  gameOver: (data: { winner: 'blue' | 'gold', reason: 'economic' | 'military' | 'snail' }) => void
  playerPositionUpdate: (data: { id: string, position: [number, number, number], rotation: [number, number, number] }) => void
}

interface ClientToServerEvents {
  joinGame: () => void
  leaveGame: () => void
  playerUpdate: (data: { position: [number, number, number], rotation: [number, number, number] }) => void
  collectBerry: (data: any) => void
  moveSnail: (data: any) => void
  attackQueen: (data: any) => void
  reconnectPlayer: (data: { playerId: string }) => void
}

interface SocketData {
  playerId?: string
}

// Initialize game state
const initialGameState: GameState = {
  status: 'waiting',
  players: {},
  blueScore: 0,
  goldScore: 0,
  blueQueenAlive: true,
  goldQueenAlive: true,
  snailPosition: 50, // percentage from 0 (blue) to 100 (gold)
  berryCount: {
    blue: 0,
    gold: 0
  }
}

// Create a copy to modify
let gameState: GameState = JSON.parse(JSON.stringify(initialGameState))

// Set up the server
const app = express()
const httpServer = createServer(app)

// Configure CORS
app.use(cors())

// Set up socket.io
const io = new Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// Team and role assignment logic
const assignTeamAndRole = (players: Record<string, Player>): { team: 'blue' | 'gold', role: 'queen' | 'worker' | 'soldier' } => {
  const playerCount = Object.keys(players).length
  const blueCount = Object.values(players).filter(p => p.team === 'blue').length
  const goldCount = Object.values(players).filter(p => p.team === 'gold').length

  // Assign to team with fewer players
  const team = blueCount <= goldCount ? 'blue' : 'gold'
  
  // Role assignment - first player on each team is queen
  const teamPlayers = Object.values(players).filter(p => p.team === team)
  if (teamPlayers.length === 0) {
    return { team, role: 'queen' }
  }
  
  // Check if this team already has a queen
  const hasQueen = teamPlayers.some(p => p.role === 'queen')
  if (!hasQueen) {
    return { team, role: 'queen' }
  }
  
  // Alternate between worker and soldier
  const workerCount = teamPlayers.filter(p => p.role === 'worker').length
  const soldierCount = teamPlayers.filter(p => p.role === 'soldier').length
  
  return { team, role: workerCount <= soldierCount ? 'worker' : 'soldier' }
}

// Socket connection handling
io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>) => {
  console.log(`Player connected: ${socket.id}`)
  
  // Track if this socket has already joined a game
  let hasJoined = false;
  
  // When a player joins the game
  socket.on('joinGame', () => {
    // Prevent multiple join events from the same socket
    if (hasJoined || socket.data.playerId) {
      console.log(`Socket ${socket.id} attempted to join multiple times, ignoring`)
      return;
    }
    
    hasJoined = true;
    
    // Generate a unique player ID
    const playerId = uuidv4()
    
    // Assign team and role
    const { team, role } = assignTeamAndRole(gameState.players)
    
    // Add player to game state
    gameState.players[playerId] = {
      id: playerId,
      position: team === 'blue' ? [-15, 5, 0] : [15, 5, 0], // Starting position based on team
      rotation: [0, 0, 0],
      team,
      role,
      isActive: true
    }
    
    // If game was waiting and now we have players, start the game
    if (gameState.status === 'waiting' && Object.keys(gameState.players).length >= 2) {
      gameState.status = 'playing'
    }
    
    // Associate socket ID with player ID for future reference
    socket.data.playerId = playerId
    
    // Notify player of their assignment
    socket.emit('playerAssigned', { playerId, team, role })
    
    // Broadcast updated game state to all players
    io.emit('gameState', gameState)
    
    console.log(`Player ${playerId} joined as ${role} on ${team} team`)
  })
  
  // Handle player movement and action updates
  socket.on('playerUpdate', (data) => {
    const playerId = socket.data.playerId
    
    // Update player position and rotation if valid
    if (playerId && gameState.players[playerId]) {
      // Store the updated position and rotation
      gameState.players[playerId].position = data.position;
      gameState.players[playerId].rotation = data.rotation;
      
      // Create a more efficient update packet with just the changed player's data
      const playerUpdate = {
        id: playerId,
        position: data.position,
        rotation: data.rotation
      };
      
      // Broadcast only the updated player data to all other clients (more efficient)
      socket.broadcast.emit('playerPositionUpdate', playerUpdate);
    }
  })
  
  // Handle berry collection
  socket.on('collectBerry', (data) => {
    const playerId = socket.data.playerId
    
    if (playerId && gameState.players[playerId]) {
      const player = gameState.players[playerId]
      
      // Only workers can collect berries
      if (player.role === 'worker') {
        // In a real game, we'd check proximity to berry here
        
        // Add berry to team's count
        gameState.berryCount[player.team]++
        
        // Check for economic victory (12 berries)
        if (gameState.berryCount[player.team] >= 12) {
          gameState.status = 'ended'
          io.emit('gameOver', { winner: player.team, reason: 'economic' })
        }
        
        // Broadcast updated game state
        io.emit('gameState', gameState)
      }
    }
  })
  
  // Handle snail movement
  socket.on('moveSnail', (data) => {
    const playerId = socket.data.playerId
    
    if (playerId && gameState.players[playerId]) {
      const player = gameState.players[playerId]
      
      // Only workers can move the snail
      if (player.role === 'worker') {
        // Move snail in direction of player's team
        const direction = player.team === 'blue' ? 1 : -1
        
        // Update snail position (clamped between 0-100)
        gameState.snailPosition = Math.min(100, Math.max(0, gameState.snailPosition + direction))
        
        // Check for snail victory
        if (gameState.snailPosition >= 100) {
          gameState.status = 'ended'
          io.emit('gameOver', { winner: 'blue', reason: 'snail' })
        } else if (gameState.snailPosition <= 0) {
          gameState.status = 'ended'
          io.emit('gameOver', { winner: 'gold', reason: 'snail' })
        }
        
        // Broadcast updated game state
        io.emit('gameState', gameState)
      }
    }
  })
  
  // Handle queen kills
  socket.on('attackQueen', (data) => {
    const playerId = socket.data.playerId
    
    if (playerId && gameState.players[playerId]) {
      const player = gameState.players[playerId]
      
      // Only soldiers can attack queens
      if (player.role === 'soldier') {
        // In a real game, we'd check proximity to queen here
        
        // Update queen status
        const targetTeam = player.team === 'blue' ? 'gold' : 'blue'
        if (targetTeam === 'blue') {
          gameState.blueQueenAlive = false
          gameState.goldScore++
        } else {
          gameState.goldQueenAlive = false
          gameState.blueScore++
        }
        
        // Check for military victory (3 kills)
        if (gameState.blueScore >= 3) {
          gameState.status = 'ended'
          io.emit('gameOver', { winner: 'blue', reason: 'military' })
        } else if (gameState.goldScore >= 3) {
          gameState.status = 'ended'
          io.emit('gameOver', { winner: 'gold', reason: 'military' })
        }
        
        // Broadcast updated game state
        io.emit('gameState', gameState)
        
        // Respawn queen after 5 seconds
        setTimeout(() => {
          if (targetTeam === 'blue') {
            gameState.blueQueenAlive = true
          } else {
            gameState.goldQueenAlive = true
          }
          io.emit('gameState', gameState)
        }, 5000)
      }
    }
  })
  
  // Handle player disconnect
  socket.on('disconnect', () => {
    const playerId = socket.data.playerId
    
    if (playerId && gameState.players[playerId]) {
      // Mark player as inactive but don't remove immediately
      // This allows for reconnections without losing player state
      gameState.players[playerId].isActive = false
      
      // Broadcast updated game state
      io.emit('gameState', gameState)
      
      // Give more time for reconnection - 30 seconds instead of 5
      setTimeout(() => {
        // Check if the player is still in the game state and still inactive
        if (gameState.players[playerId] && !gameState.players[playerId].isActive) {
          console.log(`Player ${playerId} didn't reconnect, removing from game`)
          delete gameState.players[playerId]
          io.emit('gameState', gameState)
        }
      }, 30000) // 30 seconds
      
      console.log(`Player ${playerId} disconnected (temporarily)`)
    }
  })
  
  // Handle explicit leave game event
  socket.on('leaveGame', () => {
    const playerId = socket.data.playerId
    
    if (playerId && gameState.players[playerId]) {
      // First mark the player as inactive
      gameState.players[playerId].isActive = false
      
      // Broadcast the updated state
      io.emit('gameState', gameState)
      
      console.log(`Player ${playerId} marked inactive, waiting to remove from game`)
      
      // Then remove after a short delay to avoid immediate rejoin issues
      setTimeout(() => {
        // Check if the player is still in the game state
        if (gameState.players[playerId]) {
          delete gameState.players[playerId]
          // Clear the socket's player ID
          socket.data.playerId = undefined
          hasJoined = false;
          io.emit('gameState', gameState)
          console.log(`Player ${playerId} left the game permanently`)
        }
      }, 1000);
    }
  })
  
  // Handle player reconnection
  socket.on('reconnectPlayer', (data) => {
    const { playerId } = data;
    
    // Check if the player exists in the game state
    if (playerId && gameState.players[playerId]) {
      console.log(`Player ${playerId} reconnected`)
      
      // Associate socket ID with player ID for future reference
      socket.data.playerId = playerId
      hasJoined = true;
      
      // Mark the player as active again
      gameState.players[playerId].isActive = true;
      
      // Send the current game state to this player
      socket.emit('gameState', gameState)
      
      // Notify other players about this player's return
      io.emit('gameState', gameState)
    } else {
      console.log(`Player ${playerId} tried to reconnect but wasn't found - creating new session`)
      
      // Generate a new player ID
      const newPlayerId = uuidv4()
      
      // Assign team and role
      const { team, role } = assignTeamAndRole(gameState.players)
      
      // Add player to game state
      gameState.players[newPlayerId] = {
        id: newPlayerId,
        position: team === 'blue' ? [-15, 5, 0] : [15, 5, 0], // Starting position based on team
        rotation: [0, 0, 0],
        team,
        role,
        isActive: true
      }
      
      // If game was waiting and now we have players, start the game
      if (gameState.status === 'waiting' && Object.keys(gameState.players).length >= 2) {
        gameState.status = 'playing'
      }
      
      // Associate socket ID with player ID for future reference
      socket.data.playerId = newPlayerId
      hasJoined = true;
      
      // Notify player of their assignment
      socket.emit('playerAssigned', { playerId: newPlayerId, team, role })
      
      // Send the updated game state
      io.emit('gameState', gameState)
    }
  })
})

// Reset game state
function resetGame() {
  gameState = JSON.parse(JSON.stringify(initialGameState))
  io.emit('gameState', gameState)
  console.log('Game state reset')
}

// Start server
const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

// Reset game every 10 minutes if ended
setInterval(() => {
  if (gameState.status === 'ended') {
    resetGame()
  }
}, 10 * 60 * 1000) 