import { useState, useEffect } from 'react'

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return online
}

export default function OfflineBanner() {
  const online = useOnlineStatus()
  const [visible, setVisible] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!online) {
      setVisible(true)
      setWasOffline(true)
    } else if (wasOffline) {
      // Mostrar brevemente "Conexión restaurada" antes de ocultar
      setTimeout(() => {
        setVisible(false)
        setWasOffline(false)
      }, 2500)
    }
  }, [online, wasOffline])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '10px 16px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 500,
        backgroundColor: online ? '#10b981' : '#ef4444',
        color: '#ffffff',
        paddingTop: `max(10px, env(safe-area-inset-top))`,
        transition: 'background-color 0.3s ease',
      }}
    >
      {online ? '✓ Conexión restaurada' : 'Sin conexión — los cambios se guardarán al reconectar'}
    </div>
  )
}
