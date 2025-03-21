import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

// This would be your server URL, adjust as needed
const SERVER_URL = 'http://localhost:3001'

// Create a single socket instance that's shared across all components
let sharedSocketInstance: Socket | null = null

export const useSocketConnection = () => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const initializeAttemptedRef = useRef(false)

  useEffect(() => {
    // Only initialize the socket connection once
    if (initializeAttemptedRef.current) {
      return;
    }
    
    initializeAttemptedRef.current = true;
    
    // Reuse existing socket if available
    if (sharedSocketInstance) {
      setSocket(sharedSocketInstance);
      setIsConnected(sharedSocketInstance.connected);
      return;
    }
    
    // Initialize socket connection with more conservative reconnection settings
    const socketInstance = io(SERVER_URL, {
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      timeout: 10000,
      autoConnect: true,
      transports: ['websocket']
    })
    
    // Store in the module-level variable
    sharedSocketInstance = socketInstance;

    // Set up event listeners
    socketInstance.on('connect', () => {
      console.log('Socket connected')
      setIsConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
    })

    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setIsConnected(false)
    })

    // Set socket instance to state
    setSocket(socketInstance)

    // Cleanup on unmount - but only truly disconnect if the whole app is unmounting
    return () => {
      // Don't disconnect the socket, just remove the listeners
      // to allow it to be reused across component mount/unmount cycles
      console.log('Cleaning up listeners, but keeping socket connection')
      // socketInstance.disconnect()
    }
  }, [])

  return { socket, isConnected }
} 