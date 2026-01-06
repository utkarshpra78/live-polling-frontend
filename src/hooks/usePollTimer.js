import { useState, useEffect, useRef } from 'react'

export const usePollTimer = (initialTime, onExpire, isActive = true) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime)
  const intervalRef = useRef(null)
  const startTimeRef = useRef(null)
  const initialTimeRef = useRef(initialTime)

  useEffect(() => {
    initialTimeRef.current = initialTime
    setTimeRemaining(initialTime)
  }, [initialTime])

  useEffect(() => {
    if (!isActive || timeRemaining <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (timeRemaining <= 0 && onExpire) {
        onExpire()
      }
      return
    }

    startTimeRef.current = Date.now()
    setTimeRemaining(initialTimeRef.current)

    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = Math.max(0, prev - 1)
        if (newTime === 0 && onExpire) {
          onExpire()
        }
        return newTime
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive, onExpire])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    isExpired: timeRemaining <= 0
  }
}

