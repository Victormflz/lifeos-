const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const mongoose = require('mongoose')
require('dotenv').config()

const workoutsRouter = require('./routes/workouts')
const authRouter     = require('./routes/auth')
const habitsRouter   = require('./routes/habits')
const routinesRouter = require('./routes/routines')
const notesRouter    = require('./routes/notes')
const sleepRouter    = require('./routes/sleep')
const insightsRouter = require('./routes/insights')

const app = express()

// Railway termina SSL en su edge — trust proxy para que req.ip sea correcto
app.set('trust proxy', 1)

// Health check ANTES de cualquier middleware — Railway y uptime monitors lo usan
app.get('/health', (req, res) => res.json({ ok: true }))

// Seguridad HTTP
app.use(helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  contentSecurityPolicy: false
}))

// CORS
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173']

function buildAllowedOrigins() {
  if (process.env.NODE_ENV !== 'production') return DEV_ORIGINS

  const raw = process.env.ALLOWED_ORIGIN || ''
  const origins = raw.split(',').map(o => o.trim()).filter(Boolean)

  if (origins.length === 0) {
    console.warn(
      '[CORS] ⚠️  ALLOWED_ORIGIN no definida — peticiones cross-origin serán rechazadas'
    )
  }
  return origins
}

const allowedOrigins = buildAllowedOrigins()

app.use(cors({
  origin(origin, callback) {
    // No origin = server-to-server or curl — always allow
    if (!origin) return callback(null, true)
    // No allowedOrigins configured = open mode (GUEST_MODE app, no auth)
    if (allowedOrigins.length === 0) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(Object.assign(new Error('CORS: origen no permitido'), { status: 403 }))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}))

app.use(express.json({ limit: '50kb' }))

// Rate limit global (100 req / 15 min) — /auth/* tiene su propio límite más estricto
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, intenta más tarde' }
}))

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Error MongoDB:', err))

// Rutas
app.use('/api/auth',     authRouter)
app.use('/api/workouts', workoutsRouter)
app.use('/api/habits',   habitsRouter)
app.use('/api/routines', routinesRouter)
app.use('/api/notes',    notesRouter)
app.use('/api/sleep',    sleepRouter)
app.use('/api/insights', insightsRouter)

// Error handler global
app.use((err, req, res, next) => {
  console.error(err)
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Error interno del servidor' })
})

app.listen(process.env.PORT || 3001, () =>
  console.log(`API corriendo en puerto ${process.env.PORT || 3001}`)
)
