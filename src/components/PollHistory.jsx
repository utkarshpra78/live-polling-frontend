import React, { useState, useEffect } from 'react'
import './PollHistory.css'

const PollHistory = ({ onClose, socket }) => {
  const [polls, setPolls] = useState([])

  useEffect(() => {
    if (!socket) return

    socket.emit('get-poll-history')

    socket.on('poll-history', (pollsList) => {
      setPolls(pollsList)
    })

    return () => {
      socket.off('poll-history')
    }
  }, [socket])

  const calculatePercentage = (poll, optionIndex) => {
    if (!poll.votes || poll.votes.length === 0) return 0
    const option = poll.options[optionIndex]
    const votesForOption = poll.votes.filter(v => v.option === option).length
    return Math.round((votesForOption / poll.votes.length) * 100)
  }

  return (
    <div className="poll-history-overlay" onClick={onClose}>
      <div className="poll-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <h2 className="history-title">View Poll History</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="history-content">
          {polls.length === 0 ? (
            <div className="no-history">No poll history available</div>
          ) : (
            polls.map((poll, pollIndex) => (
              <div key={poll._id || pollIndex} className="history-poll-item">
                <h3 className="poll-question-number">Question {pollIndex + 1}</h3>
                <div className="history-question-box">
                  <p className="history-question-text">{poll.question}</p>
                </div>
                <div className="history-options">
                  {poll.options.map((option, optionIndex) => {
                    const percentage = calculatePercentage(poll, optionIndex)
                    return (
                      <div key={optionIndex} className="history-option-bar">
                        <div className="history-option-number">{optionIndex + 1}</div>
                        <div className="history-option-content">
                          <div className="history-option-text">{option}</div>
                          <div className="history-progress-bar-container">
                            <div 
                              className="history-progress-bar" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="history-percentage-text">{percentage}%</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default PollHistory

