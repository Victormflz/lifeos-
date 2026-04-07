const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Workout = require('../models/Workout')
const requireAuth = require('../middleware/auth')

// Todas las rutas requieren autenticación
router.use(requireAuth)

// GET — obtener workouts del usuario
// ?date=YYYY-MM-DD  → filtra por día exacto (devuelve todo el día, sin límite de paginación)
// ?limit=50&skip=0  → paginación sobre el historial completo (máx 200 por petición)
// Header X-Total-Count incluye el total de documentos que coinciden con el filtro
router.get('/', async (req, res, next) => {
  try {
    const query = { userId: req.userId }
    if (req.query.date) {
      const start = new Date(req.query.date)
      start.setUTCHours(0, 0, 0, 0)
      const end = new Date(req.query.date)
      end.setUTCHours(23, 59, 59, 999)
      query.date = { $gte: start, $lte: end }
    }
    // Cuando se filtra por fecha, el día entero es siempre pequeño; default a 200
    const defaultLimit = req.query.date ? 200 : 50
    const limit = Math.min(Math.max(parseInt(req.query.limit) || defaultLimit, 1), 200)
    const skip  = Math.max(parseInt(req.query.skip) || 0, 0)

    const [workouts, total] = await Promise.all([
      Workout.find(query).sort({ date: -1 }).skip(skip).limit(limit),
      Workout.countDocuments(query),
    ])
    res.setHeader('X-Total-Count', String(total))
    res.json(workouts)
  } catch (err) {
    next(err)
  }
})

// POST — crear uno nuevo
router.post('/', async (req, res, next) => {
  try {
    const { exercise, sets, reps, weight, notes } = req.body

    if (!exercise || sets == null || reps == null || weight == null) {
      return res.status(400).json({ error: 'Faltan campos' })
    }

    const workout = await Workout.create({ userId: req.userId, exercise, sets, reps, weight, notes })
    res.status(201).json(workout)
  } catch (err) {
    next(err)
  }
})

// GET /records — máximo peso por ejercicio para este usuario
router.get('/records', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId)
    const records = await Workout.aggregate([
      { $match: { userId } },
      { $sort: { weight: -1 } },
      { $group: { _id: '$exercise', weight: { $max: '$weight' }, date: { $first: '$date' } } },
      { $project: { exercise: '$_id', weight: 1, date: 1, _id: 0 } },
      { $sort: { weight: -1 } }
    ])
    res.json(records)
  } catch (err) {
    next(err)
  }
})

// GET /weekly-summary — peso máximo por ejercicio: esta semana vs semana pasada
router.get('/weekly-summary', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId)
    const now = new Date()
    const dayOffset = now.getDay() === 0 ? 6 : now.getDay() - 1
    const thisWeekStart = new Date(now)
    thisWeekStart.setDate(now.getDate() - dayOffset)
    thisWeekStart.setHours(0, 0, 0, 0)
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(thisWeekStart.getDate() - 7)

    const [thisWeek, lastWeek] = await Promise.all([
      Workout.aggregate([
        { $match: { userId, date: { $gte: thisWeekStart } } },
        { $group: { _id: '$exercise', maxWeight: { $max: '$weight' } } }
      ]),
      Workout.aggregate([
        { $match: { userId, date: { $gte: lastWeekStart, $lt: thisWeekStart } } },
        { $group: { _id: '$exercise', maxWeight: { $max: '$weight' } } }
      ])
    ])

    const map = {}
    thisWeek.forEach(r => { map[r._id] = { exercise: r._id, thisWeek: r.maxWeight, lastWeek: null } })
    lastWeek.forEach(r => {
      if (map[r._id]) map[r._id].lastWeek = r.maxWeight
      else map[r._id] = { exercise: r._id, thisWeek: null, lastWeek: r.maxWeight }
    })
    res.json(Object.values(map).sort((a, b) => a.exercise.localeCompare(b.exercise)))
  } catch (err) {
    next(err)
  }
})

// PUT — actualizar un ejercicio (solo el dueño)
router.put('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' })
    }
    const { exercise, sets, reps, weight, notes } = req.body
    if (!exercise || sets == null || reps == null || weight == null) {
      return res.status(400).json({ error: 'Faltan campos' })
    }
    const updated = await Workout.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { exercise, sets, reps, weight, notes },
      { new: true, runValidators: true }
    )
    if (!updated) return res.status(404).json({ error: 'No encontrado' })
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// DELETE — borrar por id (solo el dueño)
router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' })
    }
    const deleted = await Workout.findOneAndDelete({ _id: req.params.id, userId: req.userId })
    if (!deleted) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

module.exports = router
