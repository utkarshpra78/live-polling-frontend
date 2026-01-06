import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RoleSelection from './components/RoleSelection'
import PollCreation from './components/PollCreation'
import PollDisplay from './components/PollDisplay'
import StudentStart from './components/StudentStart'
import StudentPoll from './components/StudentPoll'

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<RoleSelection />} />
          <Route path="/create-poll" element={<PollCreation />} />
          <Route path="/getstart" element={<StudentStart />} />
          <Route path="/student-poll" element={<StudentPoll />} />
          <Route 
            path="/poll-display" 
            element={<PollDisplay />} 
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App

