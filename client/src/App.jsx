import { Routes, Route, Navigate } from 'react-router-dom'
import Nav from './components/Nav'
import OfflineBanner from './components/OfflineBanner'
import Today from './pages/Today'
import GymTracker from './pages/GymTracker'
import Habits from './pages/Habits'
import Notes from './pages/Notes'
import Sleep from './pages/Sleep'
import Profile from './pages/Profile'
import Login from './pages/Login'

export default function App() {
  return (
    <>
      <OfflineBanner />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <div className="app-container" style={{ paddingBottom: '80px' }}>
            <Routes>
              <Route path="/"        element={<Today />} />
              <Route path="/gym"     element={<GymTracker />} />
              <Route path="/habits"  element={<Habits />} />
              <Route path="/notes"   element={<Notes />} />
              <Route path="/sleep"   element={<Sleep />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*"        element={<Navigate to="/" replace />} />
            </Routes>
            <Nav />
          </div>
        } />
      </Routes>
    </>
  )
}
