import { Routes, Route, Navigate } from 'react-router-dom'
import Nav from './components/Nav'
import GymTracker from './pages/GymTracker'
import Habits from './pages/Habits'
import Notes from './pages/Notes'
import Login from './pages/Login'
import { useAuth } from './context/AuthContext'

function ProtectedRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { token } = useAuth()

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem', paddingBottom: token ? '80px' : '1.5rem', fontFamily: 'sans-serif' }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/"       element={<ProtectedRoute><GymTracker /></ProtectedRoute>} />
        <Route path="/habits" element={<ProtectedRoute><Habits /></ProtectedRoute>} />
        <Route path="/notes"  element={<ProtectedRoute><Notes /></ProtectedRoute>} />
      </Routes>
      {token && <Nav />}
    </div>
  )
}