import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

export const useSocket = (backendUrl) => {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    const url = backendUrl || import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
    const newSocket = io(url, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setIsConnected(false)
    })

    return () => {
      newSocket.close()
      setSocket(null)
      setIsConnected(false)
    }
  }, [backendUrl])

  return { socket, isConnected }
}

