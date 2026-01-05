import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RoleSelection from './components/RoleSelection'
import PollCreation from './components/PollCreation'

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<RoleSelection />} />
          <Route path="/create-poll" element={<PollCreation />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App

