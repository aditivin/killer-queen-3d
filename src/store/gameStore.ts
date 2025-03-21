import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

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

interface GameStore {
  playerId: string | null
  gameState: GameState
  setPlayerId: (id: string) => void
  setGameState: (state: GameState) => void
  resetGame: () => void
  updatePlayerPosition: (playerId: string, position: [number, number, number], rotation: [number, number, number]) => void
  clearPlayerId: () => void
}

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

// Create a safe storage object that handles exceptions
const safeStorage = {
  getItem: (name: string): string | null => {
    try {
      const value = localStorage.getItem(name);
      return value;
    } catch (error) {
      console.warn('Failed to access localStorage:', error);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      console.warn('Failed to set localStorage item:', error);
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
    } catch (error) {
      console.warn('Failed to remove localStorage item:', error);
    }
  }
};

// Explicitly type the create function with the persist middleware
export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      playerId: null,
      gameState: initialGameState,
      setPlayerId: (id) => set({ playerId: id }),
      setGameState: (state) => set({ gameState: state }),
      resetGame: () => set({ gameState: initialGameState }),
      clearPlayerId: () => set({ playerId: null }),
      updatePlayerPosition: (playerId, position, rotation) => 
        set((state) => {
          // Only update if the player exists in state
          if (state.gameState.players[playerId]) {
            // Create a new players object with the updated position
            const updatedPlayers = {
              ...state.gameState.players,
              [playerId]: {
                ...state.gameState.players[playerId],
                position,
                rotation
              }
            };
            
            // Return updated state with new players object
            return {
              gameState: {
                ...state.gameState,
                players: updatedPlayers
              }
            };
          }
          
          // Return original state if player not found
          return state;
        })
    }),
    {
      name: 'killer-queen-player-storage',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({ playerId: state.playerId }),
    }
  )
) 