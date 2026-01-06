import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'
import './PollCreation.css'

const PollCreation = () => {
  const navigate = useNavigate()
  const { socket } = useSocket()
  const [question, setQuestion] = useState('')
  const [timeLimit, setTimeLimit] = useState('60')
  const [options, setOptions] = useState([
    { id: 1, text: '', isCorrect: null },
    { id: 2, text: '', isCorrect: null }
  ])
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!socket) return

    socket.emit('select-roles', { roles: ['teacher'] })

    socket.on('poll-created', (data) => {
      setIsSubmitting(false)
      if (data.success) {
        navigate('/poll-display', { state: { poll: data.poll } })
      } else {
        setError(data.error || 'Failed to create poll')
      }
    })

    socket.on('error', (data) => {
      setIsSubmitting(false)
      setError(data.message || 'An error occurred')
    })

    return () => {
      socket.off('poll-created')
      socket.off('error')
    }
  }, [socket, navigate])

  const handleQuestionChange = (e) => {
    const value = e.target.value
    if (value.length <= 100) {
      setQuestion(value)
    }
  }

  const handleOptionChange = (id, text) => {
    setOptions(prev => prev.map(opt => 
      opt.id === id ? { ...opt, text } : opt
    ))
  }

  const handleCorrectAnswerChange = (id, isCorrect) => {
    setOptions(prev => prev.map(opt => 
      opt.id === id ? { ...opt, isCorrect } : opt
    ))
  }

  const handleAddOption = () => {
    const newId = Math.max(...options.map(o => o.id)) + 1
    setOptions(prev => [...prev, { id: newId, text: '', isCorrect: null }])
  }

  const handleAskQuestion = () => {
    setError(null)

    if (!question.trim()) {
      setError('Please enter a question')
      return
    }

    const validOptions = options.filter(opt => opt.text.trim())
    if (validOptions.length < 2) {
      setError('Please add at least 2 options')
      return
    }

    const hasCorrectAnswer = validOptions.some(opt => opt.isCorrect === true)
    if (!hasCorrectAnswer) {
      setError('Please mark at least one option as correct')
      return
    }

    if (!socket) {
      setError('Connection not established. Please wait a moment and try again.')
      return
    }

    setIsSubmitting(true)
    socket.emit('create-poll', {
      question: question.trim(),
      options: validOptions,
      timeLimit: parseInt(timeLimit)
    })
  }

  return (
    <div className="poll-creation-container">
      <div className="poll-creation-wrapper">
        <div className="poll-creation-content">
          <div className="logo-badge">
            <span className="star-icon">✦</span>
            <span className="logo-text">Intervue Poll</span>
          </div>

          <h1 className="page-title">Let's Get Started</h1>
          <p className="page-subtitle">
            you'll have the ability to create and manage polls, ask questions, and monitor your students' responses in real-time.
          </p>

          {error && (
            <div className="error-message" style={{ 
              backgroundColor: '#FFE5E5', 
              color: '#D32F2F', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <div className="question-section">
            <div className="section-header">
              <label className="section-label">Enter your question</label>
              <select 
                className="time-select"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
              >
                <option value="30">30 seconds</option>
                <option value="60">60 seconds</option>
                <option value="90">90 seconds</option>
                <option value="120">120 seconds</option>
                <option value="180">180 seconds</option>
              </select>
            </div>
            <div className="question-input-wrapper">
              <textarea
                className="question-input"
                value={question}
                onChange={handleQuestionChange}
                placeholder="Enter your question here..."
                rows={4}
              />
              <span className="char-counter">{question.length}/100</span>
            </div>
          </div>

          <div className="options-section">
            <div className="section-header">
              <label className="section-label">Edit Options</label>
              <label className="correct-label">Is it Correct?</label>
            </div>
            
            {options.map((option) => (
              <div key={option.id} className="option-row">
                <div className="option-number">{option.id}</div>
                <input
                  type="text"
                  className="option-input"
                  value={option.text}
                  onChange={(e) => handleOptionChange(option.id, e.target.value)}
                  placeholder={`Option ${option.id}`}
                />
                <div className="correct-radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name={`correct-${option.id}`}
                      checked={option.isCorrect === true}
                      onChange={() => handleCorrectAnswerChange(option.id, true)}
                    />
                    <span className="radio-text">Yes</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name={`correct-${option.id}`}
                      checked={option.isCorrect === false}
                      onChange={() => handleCorrectAnswerChange(option.id, false)}
                    />
                    <span className="radio-text">No</span>
                  </label>
                </div>
              </div>
            ))}

            <button className="add-option-button" onClick={handleAddOption}>
              + Add More option
            </button>
          </div>
        </div>

        <div className="ask-question-container">
          <div className="ask-question-wrapper">
            <button 
              className="ask-question-button" 
              onClick={handleAskQuestion}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Ask Question'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PollCreation

