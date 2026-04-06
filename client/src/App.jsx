import { Routes, Route, Navigate } from 'react-router-dom'
import Nav from './components/Nav'
import Today from './pages/Today'
import GymTracker from './pages/GymTracker'
import Habits from './pages/Habits'
import Notes from './pages/Notes'
import Sleep from './pages/Sleep'
import Login from './pages/Login'
import { useAuth } from './context/AuthContext'

function ProtectedRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { token } = useAuth()

  return (
      <div className="app-container" style={{ paddingBottom: token ? '80px' : '1.5rem' }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/"       element={<ProtectedRoute><Today /></ProtectedRoute>} />
        <Route path="/gym"    element={<ProtectedRoute><GymTracker /></ProtectedRoute>} />
        <Route path="/habits" element={<ProtectedRoute><Habits /></ProtectedRoute>} />
        <Route path="/notes"  element={<ProtectedRoute><Notes /></ProtectedRoute>} />
        <Route path="/sleep"  element={<ProtectedRoute><Sleep /></ProtectedRoute>} />
      </Routes>
      {token && <Nav />}
    </div>
  )
}