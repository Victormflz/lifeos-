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

const app = express()

// CORS — desarrollo: localhost permitido / producción: solo ALLOWED_ORIGIN
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.ALLOWED_ORIGIN].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:4173']

app.use(helmet())
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

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

app.listen(process.env.PORT || 3001, () =>
  console.log(`API corriendo en puerto ${process.env.PORT || 3001}`)
)