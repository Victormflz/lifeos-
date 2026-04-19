const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const mongoSanitize = require('express-mongo-sanitize')
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

// Railway (y otros reverse proxies) pasan x-forwarded-proto — confiamos en 1 salto
app.set('trust proxy', 1)

// En producción, redirigir HTTP → HTTPS
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(308, `https://${req.headers.host}${req.url}`)
    }
    next()
  })
}

// CORS — desarrollo: localhost permitido / producción: lista de orígenes desde env
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173']

function buildAllowedOrigins() {
  if (process.env.NODE_ENV !== 'production') return DEV_ORIGINS

  const raw = process.env.ALLOWED_ORIGIN || ''
  const origins = raw
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)

  if (origins.length === 0) {
    console.warn(
      '[CORS] ⚠️  ALLOWED_ORIGIN no está definida en producción. ' +
      'Todas las peticiones cross-origin serán rechazadas. ' +
      'Configúrala en Railway con la URL de tu frontend.'
    )
  }
  return origins
}

const allowedOrigins = buildAllowedOrigins()

app.use(helmet({
  hsts: {
    maxAge: 31536000,       // 1 año
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: false // Gestionado por el CDN/Vercel del cliente
}))
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(Object.assign(new Error('CORS: origen no permitido'), { status: 403 }))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json({ limit: '50kb' }))
// Eliminar claves con $ y . de req.body/query/params para prevenir inyección NoSQL
app.use(mongoSanitize())
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
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

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

app.listen(process.env.PORT || 3001, () =>
  console.log(`API corriendo en puerto ${process.env.PORT || 3001}`)
)