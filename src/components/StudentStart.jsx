import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './StudentStart.css'

const StudentStart = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')

  const handleContinue = () => {
    if (!name.trim()) {
      alert('Please enter your name to continue')
      return
    }

    // Store name in localStorage or pass via navigation
    localStorage.setItem('studentName', name.trim())
    navigate('/student-poll')
  }

  return (
    <div className="student-start-container">
      <div className="student-start-content">
        <div className="logo-badge">
          <span className="star-icon">✦</span>
          <span className="logo-text">Intervue Poll</span>
        </div>

        <h1 className="page-title">Let's Get Started</h1>

        <p className="page-description">
          If you're a student, you'll be able to <strong>submit your answers</strong>, participate in live polls, and see how your responses compare with your classmates
        </p>

        <div className="name-input-section">
          <label className="name-label">Enter your Name</label>
          <input
            type="text"
            className="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name here..."
          />
        </div>

        <button className="continue-button" onClick={handleContinue}>
          Continue
        </button>
      </div>
    </div>
  )
}

export default StudentStart

