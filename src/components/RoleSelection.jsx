import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './RoleSelection.css'

const RoleSelection = () => {
  const navigate = useNavigate()
  const [selectedRoles, setSelectedRoles] = useState({
    student: false,
    teacher: false
  })

  const handleRoleToggle = (role) => {
    setSelectedRoles(prev => ({
      ...prev,
      [role]: !prev[role]
    }))
  }

  const handleContinue = () => {
    const roles = Object.entries(selectedRoles)
      .filter(([_, selected]) => selected)
      .map(([role]) => role)
    
    if (roles.length === 0) {
      alert('Please select at least one role to continue')
      return
    }
    
    if (roles.includes('teacher')) {
      navigate('/create-poll')
    } else {
      console.log('Selected roles:', roles)
    }
  }

  return (
    <div className="role-selection-container">
      <div className="role-selection-content">
        <div className="logo-badge">
          <span className="star-icon">✦</span>
          <span className="logo-text">Intervue Poll</span>
        </div>

        <h1 className="main-title">Welcome to the Live Polling System</h1>

        <p className="subtitle">
          Please select the role that best describes you to begin using the live polling system
        </p>

        <div className="role-cards-container">
          <div
            className={`role-card ${selectedRoles.student ? 'selected' : ''}`}
            onClick={() => handleRoleToggle('student')}
          >
            <h2 className="role-title">I'm a Student</h2>
            <p className="role-description">
              Lorem Ipsum is simply dummy text of the printing and typesetting industry
            </p>
          </div>

          <div
            className={`role-card ${selectedRoles.teacher ? 'selected' : ''}`}
            onClick={() => handleRoleToggle('teacher')}
          >
            <h2 className="role-title">I'm a Teacher</h2>
            <p className="role-description">
              Submit answers and view live poll results in real-time.
            </p>
          </div>
        </div>

        <button className="continue-button" onClick={handleContinue}>
          Continue
        </button>
      </div>
    </div>
  )
}

export default RoleSelection

