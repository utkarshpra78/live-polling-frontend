import React, { useState, useEffect, useRef, useMemo } from 'react'
import './ChatSidebar.css'

const ChatSidebar = ({ onClose, socket, pollId, userName: propUserName, isTeacher = false }) => {
  const [activeTab, setActiveTab] = useState('chat')
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [userName, setUserName] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef(null)
  const hasLoadedMessagesRef = useRef(false)

  useEffect(() => {
    if (!socket || !pollId) return

    let storedName = propUserName
    if (!storedName) {
      storedName = localStorage.getItem('studentName') || localStorage.getItem('teacherName') || 'Anonymous'
    }
    // Remove session ID suffix if present (e.g., "Student-abc123" -> "Student")
    // This handles cases where the name might have a session ID appended
    if (storedName && storedName.includes('-')) {
      const parts = storedName.split('-')
      // Check if last part looks like a session ID (short alphanumeric)
      if (parts.length > 1 && /^[a-z0-9]{1,6}$/i.test(parts[parts.length - 1])) {
        storedName = parts.slice(0, -1).join('-')
      }
    }
    
    // Only update userName if it actually changed
    setUserName(prev => {
      if (prev !== storedName) {
        return storedName
      }
      return prev
    })

    // Join poll room (for participants tracking) - this also joins global-chat on backend
    socket.emit('join-poll-room', { pollId, userName: storedName })

    // Load global chat messages only if not already loaded (continuous chat across all polls)
    // Messages persist across poll changes, so we only load once per session
    if (!hasLoadedMessagesRef.current) {
      socket.emit('get-chat-messages', { pollId: 'global' })
      hasLoadedMessagesRef.current = true
    }

    const handleParticipantsUpdate = (participantsList) => {
      // Only update if the participants list actually changed
      // This prevents unnecessary re-renders that cause flickering
      setParticipants(prev => {
        // If lengths differ, definitely update
        if (!prev || prev.length !== participantsList.length) {
          return participantsList
        }
        
        // Create a stable string representation for comparison
        const prevKey = prev.map(p => `${p.socketId}:${p.userName}`).sort().join('|')
        const newKey = participantsList.map(p => `${p.socketId}:${p.userName}`).sort().join('|')
        
        // Only update if the content actually changed
        if (prevKey !== newKey) {
          return participantsList
        }
        
        // No changes detected, return previous state to prevent re-render
        return prev
      })
    }

    const handleChatMessage = (message) => {
      setMessages(prev => {
        // Prevent duplicate messages
        const isDuplicate = prev.some(
          msg => msg.userName === message.userName && 
                 msg.message === message.message && 
                 msg.timestamp === message.timestamp
        )
        if (isDuplicate) return prev
        return [...prev, message]
      })
    }

    const handleChatMessagesResponse = (data) => {
      // Load global chat messages (continuous across all polls)
      if (data.success && data.messages) {
        setMessages(prev => {
          // Only update if messages actually changed to prevent unnecessary re-renders
          const newMessagesStr = JSON.stringify(data.messages)
          const prevMessagesStr = JSON.stringify(prev)
          if (newMessagesStr !== prevMessagesStr) {
            return data.messages
          }
          return prev
        })
      } else if (data.error) {
        console.error('Error loading chat messages:', data.error)
      }
    }

    const handleError = (error) => {
      console.error('Chat error:', error)
    }

    const handleUserKicked = (data) => {
      if (data.socketId === socket.id) {
        alert('You have been kicked out')
        onClose()
      }
    }

    socket.on('participants-updated', handleParticipantsUpdate)
    socket.on('chat-message', handleChatMessage)
    socket.on('chat-messages-response', handleChatMessagesResponse)
    socket.on('user-kicked', handleUserKicked)
    socket.on('error', handleError)

    return () => {
      socket.off('participants-updated', handleParticipantsUpdate)
      socket.off('chat-message', handleChatMessage)
      socket.off('chat-messages-response', handleChatMessagesResponse)
      socket.off('user-kicked', handleUserKicked)
      socket.off('error', handleError)
      // Leave poll room but stay in global-chat for continuous chat
      socket.emit('leave-poll-room', { pollId })
      // Note: We don't leave 'global-chat' room to keep chat continuous
    }
  }, [socket, pollId, propUserName])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!messageInput.trim() || !socket || !userName || isSending) return

    const messageToSend = messageInput.trim()
    setMessageInput('') // Clear input immediately to prevent double submission
    setIsSending(true)

    // Send to global chat (continuous across all polls)
    socket.emit('send-chat-message', {
      pollId: 'global', // Use 'global' for continuous chat
      message: messageToSend,
      userName
    })

    // Reset sending flag after a short delay to prevent rapid-fire messages
    setTimeout(() => {
      setIsSending(false)
    }, 500)
  }

  const handleKickOut = (socketId) => {
    if (socket && confirm('Are you sure you want to kick this user?')) {
      socket.emit('kick-user', { pollId, socketId })
    }
  }

  // Memoize cleaned participant names to prevent unnecessary recalculations
  const cleanedParticipants = useMemo(() => {
    return participants.map(participant => {
      let displayName = participant.userName || 'Anonymous'
      if (displayName.includes('-') && displayName !== 'Anonymous') {
        const parts = displayName.split('-')
        if (parts.length > 1 && /^[a-z0-9]{1,6}$/i.test(parts[parts.length - 1])) {
          displayName = parts.slice(0, -1).join('-')
        }
      }
      return {
        ...participant,
        displayName
      }
    })
  }, [participants])

  return (
    <div className="chat-sidebar-overlay" onClick={onClose}>
      <div className="chat-sidebar" onClick={(e) => e.stopPropagation()}>
        <div className="sidebar-header">
          <div className="sidebar-tabs">
            <button
              className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
            <button
              className={`tab-button ${activeTab === 'participants' ? 'active' : ''}`}
              onClick={() => setActiveTab('participants')}
            >
              Participants
            </button>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="sidebar-content">
          {activeTab === 'chat' ? (
            <div className="chat-container">
              <div className="messages-list">
                {messages.map((msg, index) => {
                  const isCurrentUser = msg.userName === userName
                  return (
                    <div 
                      key={`${msg.userName}-${msg.timestamp || index}-${msg.message}`} 
                      className={`message-wrapper ${isCurrentUser ? 'message-right' : 'message-left'}`}
                    >
                      <div className="message-author">{msg.userName}</div>
                      <div className={`message-bubble ${isCurrentUser ? 'message-bubble-right' : 'message-bubble-left'}`}>
                        {msg.message}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
              <form className="message-input-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="message-input"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                />
                <button type="submit" className="send-button" disabled={isSending || !messageInput.trim()}>
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          ) : (
            <div className="participants-list">
              <div className="participants-header">
                <div className="participants-header-name">Name</div>
                {isTeacher && <div className="participants-header-action">Action</div>}
              </div>
              {cleanedParticipants.length === 0 ? (
                <div className="no-participants">No participants yet</div>
              ) : (
                cleanedParticipants.map((participant) => {
                  return (
                    <div key={participant.socketId} className="participant-item">
                      <span className="participant-name">{participant.displayName}</span>
                      {isTeacher && (
                        <button
                          className="kick-out-button"
                          onClick={() => handleKickOut(participant.socketId)}
                        >
                          Kick out
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatSidebar

