const express = require('express')
const router = express.Router()
const Habit = require('../models/Habit')
const requireAuth = require('../middleware/auth')

router.use(requireAuth)

// GET — obtener todos los hábitos del usuario
router.get('/', async (req, res, next) => {
  try {
    const habits = await Habit.find({ userId: req.userId }).sort({ createdAt: 1 })
    res.json(habits)
  } catch (err) {
    next(err)
  }
})

// POST — crear un hábito nuevo
router.post('/', async (req, res, next) => {
  try {
    const { name, emoji, frequency } = req.body
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' })

    const habit = await Habit.create({ userId: req.userId, name, emoji, frequency })
    res.status(201).json(habit)
  } catch (err) {
    next(err)
  }
})

// PATCH /:id/toggle — marcar/desmarcar completado hoy (o la fecha enviada)
router.patch('/:id/toggle', async (req, res, next) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.userId })
    if (!habit) return res.status(404).json({ error: 'No encontrado' })

    const date = req.body.date || new Date().toISOString().split('T')[0]
    const idx = habit.completions.indexOf(date)

    if (idx === -1) {
      habit.completions.push(date)
    } else {
      habit.completions.splice(idx, 1)
    }

    await habit.save()
    res.json(habit)
  } catch (err) {
    next(err)
  }
})

// DELETE — borrar un hábito
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.userId })
    if (!deleted) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

module.exports = router
