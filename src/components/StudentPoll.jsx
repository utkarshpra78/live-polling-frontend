import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'
import ChatSidebar from './ChatSidebar'
import './StudentPoll.css'

const StudentPoll = () => {
  const navigate = useNavigate()
  const { socket, isConnected } = useSocket()
  const [poll, setPoll] = useState(null)
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [userName, setUserName] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [showChatSidebar, setShowChatSidebar] = useState(false)
  const [error, setError] = useState(null)
  const [isKicked, setIsKicked] = useState(false)
  const [roleRegistered, setRoleRegistered] = useState(false)

  // Get or generate unique student name per tab
  useEffect(() => {
    // Generate unique session ID for this tab
    let storedSessionId = sessionStorage.getItem('studentSessionId')
    if (!storedSessionId) {
      storedSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('studentSessionId', storedSessionId)
    }
    setSessionId(storedSessionId)

    // Get name from localStorage or use session-based name
    const storedName = localStorage.getItem('studentName')
    if (storedName) {
      // Append session ID to make it unique per tab
      const uniqueName = `${storedName}-${storedSessionId.slice(-6)}`
      setUserName(uniqueName)
    } else {
      // Generate unique name if not stored
      const uniqueName = `Student-${storedSessionId.slice(-6)}`
      localStorage.setItem('studentName', uniqueName.split('-')[0]) // Store base name
      setUserName(uniqueName)
    }
  }, [])

  // Register as student and wait for confirmation
  useEffect(() => {
    if (!socket || !userName) return

    const handleRolesSelected = (data) => {
      if (data.success) {
        setRoleRegistered(true)
      } else {
        console.error('Failed to register as student:', data.error)
        setError('Failed to register as student. Please refresh the page.')
      }
    }

    socket.on('roles-selected', handleRolesSelected)
    socket.emit('select-roles', { roles: ['student'], userName })

    return () => {
      socket.off('roles-selected', handleRolesSelected)
    }
  }, [socket, userName])

  // Fetch active poll and state recovery
  useEffect(() => {
    if (!socket) return

    // Request active poll for state recovery
    socket.emit('get-active-poll')

    socket.on('active-poll-response', async (data) => {
      if (data.success && data.poll) {
        setPoll(data.poll)
        setShowResults(data.remainingTime <= 0)
        
        // Check if user has already voted
        if (data.hasVoted) {
          setHasVoted(true)
          setShowResults(true)
        }

        // Join poll room - clean userName to remove session ID
        const cleanUserName = userName.includes('-') && userName.split('-').length > 1 
          ? userName.split('-').slice(0, -1).join('-') 
          : userName
        socket.emit('join-poll-room', { pollId: data.poll._id, userName: cleanUserName })
      }
    })

    socket.on('new-poll', (newPoll) => {
      setPoll(newPoll)
      setSelectedOptionIndex(null)
      setHasVoted(false)
      setShowResults(false)
      setError(null)
      
      if (newPoll._id) {
        // Join poll room - clean userName to remove session ID
        const cleanUserName = userName.includes('-') && userName.split('-').length > 1 
          ? userName.split('-').slice(0, -1).join('-') 
          : userName
        socket.emit('join-poll-room', { pollId: newPoll._id, userName: cleanUserName })
      }
    })

    socket.on('poll-updated', (updatedPoll) => {
      if (poll && updatedPoll._id === poll._id) {
        setPoll(updatedPoll)
        // Show results immediately if student has voted
        if (hasVoted) {
          setShowResults(true)
        }
      }
    })

    socket.on('vote-submitted', (data) => {
      if (data.success) {
        setHasVoted(true)
        setShowResults(true) // Show results immediately with percentages
        setPoll(data.poll) // Update poll with all votes for accurate percentages
        setError(null) // Clear any previous errors
      } else {
        setError(data.error || 'Failed to submit vote')
      }
    })

    socket.on('user-kicked', (data) => {
      setIsKicked(true)
    })

    socket.on('error', (data) => {
      setError(data.message || 'An error occurred')
    })

    return () => {
      socket.off('active-poll-response')
      socket.off('new-poll')
      socket.off('poll-updated')
      socket.off('vote-submitted')
      socket.off('user-kicked')
      socket.off('error')
    }
  }, [socket, poll, hasVoted, userName])

  // Timer management - calculate remaining time from server
  const calculateRemainingTime = () => {
    if (!poll || !poll.startTime || !poll.isActive) return 0
    
    const startTime = new Date(poll.startTime).getTime()
    const now = Date.now()
    const elapsed = (now - startTime) / 1000
    const remaining = Math.max(0, poll.timeLimit - elapsed)
    return Math.ceil(remaining)
  }

  const remainingTime = calculateRemainingTime()

  // Update remaining time from server periodically
  useEffect(() => {
    if (!poll || !poll.isActive || showResults) return

    const interval = setInterval(() => {
      const remaining = calculateRemainingTime()
      if (remaining <= 0 && !showResults) {
        setShowResults(true)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [poll, showResults])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const formattedTime = formatTime(remainingTime)
  const isExpired = remainingTime <= 0

  const handleOptionSelect = (index) => {
    if (hasVoted || showResults || !poll || !poll.isActive) return
    setSelectedOptionIndex(index)
  }

  const handleSubmitVote = () => {
    if (selectedOptionIndex === null || !poll || hasVoted || !socket || !roleRegistered) {
      if (!roleRegistered) {
        setError('Please wait for registration to complete before voting.')
      }
      return
    }
    const option = poll.options[selectedOptionIndex]
    
    // Optimistically update poll with the vote immediately for instant feedback
    const optimisticVote = {
      userId: sessionId || socket.id,
      userName: userName,
      option: option
    }
    
    // Check if vote already exists
    const existingVoteIndex = poll.votes?.findIndex(v => v.userId === optimisticVote.userId) ?? -1
    let updatedVotes = [...(poll.votes || [])]
    
    if (existingVoteIndex !== -1) {
      // Update existing vote
      updatedVotes[existingVoteIndex] = optimisticVote
    } else {
      // Add new vote
      updatedVotes.push(optimisticVote)
    }
    
    // Update poll state optimistically
    setPoll({
      ...poll,
      votes: updatedVotes
    })
    
    // Mark as voted and show results immediately
    setHasVoted(true)
    setShowResults(true)
    
    // Send vote to server
    socket.emit('submit-vote', {
      pollId: poll._id,
      option,
      userName,
      userId: sessionId || socket.id
    })
  }

  const calculatePercentage = (optionIndex) => {
    if (!poll || !poll.votes || poll.votes.length === 0) return 0
    const option = poll.options[optionIndex]
    // Ensure we compare strings properly and handle any type mismatches
    const votesForOption = poll.votes.filter(v => {
      const voteOption = typeof v.option === 'string' ? v.option.trim() : String(v.option).trim()
      const pollOption = typeof option === 'string' ? option.trim() : String(option).trim()
      return voteOption === pollOption
    }).length
    const percentage = Math.round((votesForOption / poll.votes.length) * 100)
    return percentage
  }

  // Kicked out screen
  if (isKicked) {
    return (
      <div className="student-poll-container">
        <div className="kicked-out-screen">
          <div className="logo-badge">
            <span className="star-icon">✦</span>
            <span className="logo-text">Intervue Poll</span>
          </div>
          <h1 className="kicked-out-title">You've been Kicked out!</h1>
          <p className="kicked-out-message">
            Looks like the teacher had removed you from the poll system. Please
            <br />
            Try again sometime.
          </p>
        </div>
      </div>
    )
  }

  // Waiting state
  if (!poll) {
    return (
      <div className="student-poll-container">
        <div className="waiting-screen">
          <div className="logo-badge">
            <span className="star-icon">✦</span>
            <span className="logo-text">Intervue Poll</span>
          </div>
          <div className="loading-spinner"></div>
          <p className="waiting-message">Wait for the teacher to ask questions..</p>
        </div>
        <button 
          className="chat-button" 
          onClick={() => setShowChatSidebar(!showChatSidebar)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="student-poll-container">
      <div className="student-poll-content">
        {!showResults && (
          <div className="timer-container">
            <div className="timer">
              <span className="timer-icon">⏱</span>
              <span className={`timer-text ${isExpired ? 'expired' : ''}`}>
                {formattedTime}
              </span>
            </div>
          </div>
        )}
        
        <div className="poll-header">
          <h2 className="question-number">Question 1</h2>
        </div>

        <div className="poll-card">
          <div className="question-header-bar">
            <p className="question-text">{poll.question}</p>
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          {(showResults || hasVoted) ? (
            <div className="results-container">
              <div className="options-container">
                {poll.options.map((option, index) => {
                  const percentage = calculatePercentage(index)
                  const isSelected = selectedOptionIndex === index

                  return (
                    <div 
                      key={index} 
                      className={`option-bar ${isSelected ? 'selected' : ''}`}
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
          ) : (
            <div className="options-container">
              {poll.options.map((option, index) => {
                const isSelected = selectedOptionIndex === index

                return (
                  <div 
                    key={index} 
                    className={`option-button ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleOptionSelect(index)}
                  >
                    <div className="option-number-circle">{index + 1}</div>
                    <div className="option-text">{option}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {(showResults || hasVoted) && (
          <p className="wait-message">Wait for the teacher to ask a new question..</p>
        )}

        {!showResults && !hasVoted && (
          <div className="submit-container">
            <button 
              className="submit-button" 
              onClick={handleSubmitVote}
              disabled={selectedOptionIndex === null || isExpired}
            >
              Submit
            </button>
          </div>
        )}
      </div>

        <button 
          className="chat-button" 
          onClick={() => setShowChatSidebar(!showChatSidebar)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="currentColor"/>
          </svg>
        </button>

      {showChatSidebar && poll && (
        <ChatSidebar 
          onClose={() => setShowChatSidebar(false)}
          socket={socket}
          pollId={poll._id}
          userName={userName}
          isTeacher={false}
        />
      )}
    </div>
  )
}

export default StudentPoll

