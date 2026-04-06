const express        = require('express')
const router         = express.Router()
const mongoose       = require('mongoose')
const Sleep          = require('../models/Sleep')
const requireAuth    = require('../middleware/auth')

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

router.use(requireAuth)

// GET / — all records, newest first
router.get('/', async (req, res, next) => {
  try {
    const records = await Sleep.find({ userId: req.userId }).sort({ date: -1 })
    res.json(records)
  } catch (err) {
    next(err)
  }
})

// GET /week — last 7 records
router.get('/week', async (req, res, next) => {
  try {
    const records = await Sleep.find({ userId: req.userId }).sort({ date: -1 }).limit(7)
    res.json(records)
  } catch (err) {
    next(err)
  }
})

// POST / — create a record
router.post('/', async (req, res, next) => {
  try {
    const { bedtime, wakeTime, quality, date, notes } = req.body

    if (!bedtime || !wakeTime || quality == null || !date) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' })
    }
    if (!DATE_RE.test(date)) {
      return res.status(400).json({ error: 'Formato de fecha inválido, usa YYYY-MM-DD' })
    }
    if (!TIME_RE.test(bedtime) || !TIME_RE.test(wakeTime)) {
      return res.status(400).json({ error: 'Formato de hora inválido, usa HH:MM' })
    }
    if (quality < 1 || quality > 5) {
      return res.status(400).json({ error: 'La calidad debe estar entre 1 y 5' })
    }

    const existing = await Sleep.findOne({ userId: req.userId, date })
    if (existing) {
      return res.status(409).json({ error: 'Ya existe un registro para esta fecha' })
    }

    const record = await Sleep.create({
      userId: req.userId, bedtime, wakeTime, quality: Number(quality), date, notes,
    })
    res.status(201).json(record)
  } catch (err) {
    next(err)
  }
})

// PUT /:id — update a record (pre-save hook recalculates hoursTotal)
router.put('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' })
    }

    const record = await Sleep.findOne({ _id: req.params.id, userId: req.userId })
    if (!record) return res.status(404).json({ error: 'No encontrado' })

    const { bedtime, wakeTime, quality, date, notes } = req.body

    if (bedtime !== undefined) {
      if (!TIME_RE.test(bedtime)) return res.status(400).json({ error: 'Formato de hora inválido, usa HH:MM' })
      record.bedtime = bedtime
    }
    if (wakeTime !== undefined) {
      if (!TIME_RE.test(wakeTime)) return res.status(400).json({ error: 'Formato de hora inválido, usa HH:MM' })
      record.wakeTime = wakeTime
    }
    if (quality !== undefined) {
      if (quality < 1 || quality > 5) return res.status(400).json({ error: 'La calidad debe estar entre 1 y 5' })
      record.quality = Number(quality)
    }
    if (date !== undefined) {
      if (!DATE_RE.test(date)) return res.status(400).json({ error: 'Formato de fecha inválido, usa YYYY-MM-DD' })
      record.date = date
    }
    if (notes !== undefined) record.notes = notes

    await record.save() // triggers pre-save hook → recalculates hoursTotal
    res.json(record)
  } catch (err) {
    next(err)
  }
})

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' })
    }
    const deleted = await Sleep.findOneAndDelete({ _id: req.params.id, userId: req.userId })
    if (!deleted) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

module.exports = router
