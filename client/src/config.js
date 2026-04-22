export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// En modo guest (sin auth) devuelve headers vacíos — el servidor acepta la request igual
export const authHeaders = () => ({})
