import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'
import ChatSidebar from './ChatSidebar'
import PollHistory from './PollHistory'
import './PollDisplay.css'

const PollDisplay = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { socket } = useSocket()
  const [poll, setPoll] = useState(location.state?.poll || null)
  const [showChatSidebar, setShowChatSidebar] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [error, setError] = useState(null)

  // State recovery on mount
  useEffect(() => {
    if (!socket) return

    // Register as teacher
    socket.emit('select-roles', { roles: ['teacher'] })

    // Request active poll for state recovery
    socket.emit('get-active-poll')

    socket.on('active-poll-response', (data) => {
      if (data.success && data.poll) {
        setPoll(data.poll)
        socket.emit('join-poll', { pollId: data.poll._id })
        // Join poll room for chat
        const teacherName = localStorage.getItem('teacherName') || 'Teacher'
        socket.emit('join-poll-room', { pollId: data.poll._id, userName: teacherName })
      }
    })

    socket.on('poll-created', (data) => {
      if (data.success) {
        setPoll(data.poll)
        socket.emit('join-poll', { pollId: data.poll._id })
        // Join poll room for chat
        const teacherName = localStorage.getItem('teacherName') || 'Teacher'
        socket.emit('join-poll-room', { pollId: data.poll._id, userName: teacherName })
      } else {
        setError(data.error || 'Failed to create poll')
      }
    })

    socket.on('new-poll', (newPoll) => {
      setPoll(newPoll)
      socket.emit('join-poll', { pollId: newPoll._id })
      // Join poll room for chat
      const teacherName = localStorage.getItem('teacherName') || 'Teacher'
      socket.emit('join-poll-room', { pollId: newPoll._id, userName: teacherName })
    })

    socket.on('poll-updated', (updatedPoll) => {
      if (!poll || updatedPoll._id === poll._id) {
        setPoll(updatedPoll)
      }
    })

    socket.on('error', (data) => {
      setError(data.message || 'An error occurred')
    })

    return () => {
      socket.off('active-poll-response')
      socket.off('poll-created')
      socket.off('new-poll')
      socket.off('poll-updated')
      socket.off('error')
    }
  }, [socket, poll])

  const calculatePercentage = (optionIndex) => {
    if (!poll || !poll.votes || poll.votes.length === 0) return 0
    const option = poll.options[optionIndex]
    const votesForOption = poll.votes.filter(v => v.option === option).length
    return Math.round((votesForOption / poll.votes.length) * 100)
  }

  const handleAskNewQuestion = () => {
    navigate('/create-poll')
  }

  if (error) {
    return (
      <div className="poll-display-container">
        <div className="error-message">{error}</div>
        <button onClick={() => setError(null)}>Dismiss</button>
      </div>
    )
  }

  if (!poll) {
    return (
      <div className="poll-display-container">
        <div className="no-poll-message">No active poll. Create a new poll to get started.</div>
        <div className="ask-new-question-container">
          <button className="ask-new-question-button" onClick={handleAskNewQuestion}>
            <span className="plus-icon">+</span>
            Create a new poll
          </button>
        </div>
      </div>
    )
  }

  const totalVotes = poll.votes?.length || 0

  const [remainingTime, setRemainingTime] = useState(0)

  useEffect(() => {
    if (!poll || !poll.startTime || !poll.isActive) {
      setRemainingTime(0)
      return
    }

    const calculateRemainingTime = () => {
      const startTime = new Date(poll.startTime).getTime()
      const now = Date.now()
      const elapsed = (now - startTime) / 1000
      const remaining = Math.max(0, poll.timeLimit - elapsed)
      return Math.ceil(remaining)
    }

    setRemainingTime(calculateRemainingTime())

    const interval = setInterval(() => {
      const remaining = calculateRemainingTime()
      setRemainingTime(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [poll])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="poll-display-container">
      <div className="poll-content-wrapper">
        <div className="poll-content">
          <h2 className="poll-display-title">Question</h2>

          <div className="poll-card">
            <div className="question-header-bar">
              <p className="question-text">{poll.question}</p>
            </div>

            <div className="options-container">
              {poll.options.map((option, index) => {
                const percentage = calculatePercentage(index)

                return (
                  <div 
                    key={index} 
                    className="option-button"
                  >
                    <div className="option-number-circle">{index + 1}</div>
                    <div className="option-text">{option}</div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="percentage-text">{percentage}%</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="ask-new-question-container">
            <button className="ask-new-question-button" onClick={handleAskNewQuestion}>
              <span className="plus-icon">+</span>
              Ask a new question
            </button>
          </div>
        </div>
      </div>

      {/* Hidden header for timer and history - can be shown if needed */}
      {poll.isActive && remainingTime > 0 && (
        <div className="poll-display-header-top">
          <div className="timer">
            <span className="timer-icon">⏱</span>
            <span className={`timer-text ${remainingTime <= 10 ? 'expired' : ''}`}>
              {formatTime(remainingTime)}
            </span>
          </div>
          <button className="view-history-button" onClick={() => setShowHistory(true)}>
            <span className="eye-icon">👁</span>
            View Poll history
          </button>
        </div>
      )}

      <button 
        className="chat-button" 
        onClick={() => setShowChatSidebar(!showChatSidebar)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="currentColor"/>
        </svg>
      </button>

      {showChatSidebar && (
        <ChatSidebar 
          onClose={() => setShowChatSidebar(false)}
          socket={socket}
          pollId={poll._id}
          userName={localStorage.getItem('teacherName') || 'Teacher'}
          isTeacher={true}
        />
      )}

      {showHistory && (
        <PollHistory 
          onClose={() => setShowHistory(false)}
          socket={socket}
        />
      )}
    </div>
  )
}

export default PollDisplay

