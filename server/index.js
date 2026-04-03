const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

const app = express()
app.use(cors())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  next()
})
app.use(express.json())

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Error MongoDB:', err))

// Esquema de workout
const workoutSchema = new mongoose.Schema({
  exercise: String,
  sets: Number,
  reps: Number,
  weight: Number,
  date: { type: Date, default: Date.now }
})

const Workout = mongoose.model('Workout', workoutSchema)

// GET — obtener todos
app.get('/api/workouts', async (req, res) => {
  const workouts = await Workout.find().sort({ date: -1 })
  res.json(workouts)
})

// POST — crear uno nuevo
app.post('/api/workouts', async (req, res) => {
  const { exercise, sets, reps, weight } = req.body

  if (!exercise || !sets || !reps || !weight) {
    return res.status(400).json({ error: 'Faltan campos' })
  }

  const workout = await Workout.create({ exercise, sets, reps, weight })
  res.status(201).json(workout)
})

// DELETE — borrar por id
app.delete('/api/workouts/:id', async (req, res) => {
  await Workout.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

app.listen(process.env.PORT || 3001, () => console.log('API corriendo'))