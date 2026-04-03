const express = require('express')
const router = express.Router()
const Workout = require('../models/Workout')
const requireAuth = require('../middleware/auth')

// Todas las rutas requieren autenticación
router.use(requireAuth)

// GET — obtener todos los del usuario
router.get('/', async (req, res, next) => {
  try {
    const workouts = await Workout.find({ userId: req.userId }).sort({ date: -1 })
    res.json(workouts)
  } catch (err) {
    next(err)
  }
})

// POST — crear uno nuevo
router.post('/', async (req, res, next) => {
  try {
    const { exercise, sets, reps, weight } = req.body

    if (!exercise || sets == null || reps == null || weight == null) {
      return res.status(400).json({ error: 'Faltan campos' })
    }

    const workout = await Workout.create({ userId: req.userId, exercise, sets, reps, weight })
    res.status(201).json(workout)
  } catch (err) {
    next(err)
  }
})

// DELETE — borrar por id (solo el dueño)
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Workout.findOneAndDelete({ _id: req.params.id, userId: req.userId })
    if (!deleted) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

module.exports = router
