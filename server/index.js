const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const mongoose = require('mongoose')
require('dotenv').config()

const workoutsRouter = require('./routes/workouts')
const authRouter     = require('./routes/auth')
const habitsRouter   = require('./routes/habits')

const app = express()

// Seguridad y middleware
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, intenta más tarde' }
}))

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Error MongoDB:', err))

// Rutas
app.use('/api/auth',     authRouter)
app.use('/api/workouts', workoutsRouter)
app.use('/api/habits',   habitsRouter)

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

app.listen(process.env.PORT || 3001, () =>
  console.log(`API corriendo en puerto ${process.env.PORT || 3001}`)
)