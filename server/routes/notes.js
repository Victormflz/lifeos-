const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Note = require('../models/Note')
const requireAuth = require('../middleware/auth')

router.use(requireAuth)

// GET — listar notas del usuario, ordenadas por updatedAt desc
// Soporta ?search= (búsqueda por título) y ?tag= (filtro por etiqueta)
router.get('/', async (req, res, next) => {
  try {
    const filter = { userId: req.userId }
    if (req.query.tag)    filter.tags  = req.query.tag
    if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' }
    const notes = await Note.find(filter).sort({ updatedAt: -1 })
    res.json(notes)
  } catch (err) {
    next(err)
  }
})

// POST — crear nota nueva
router.post('/', async (req, res, next) => {
  try {
    const { title, content, tags } = req.body
    if (!title || !title.trim()) return res.status(400).json({ error: 'El título es obligatorio' })

    const sanitizedTags = Array.isArray(tags)
      ? tags.slice(0, 5).map(t => String(t).trim().toLowerCase()).filter(Boolean)
      : []

    const note = await Note.create({ userId: req.userId, title, content, tags: sanitizedTags })
    res.status(201).json(note)
  } catch (err) {
    next(err)
  }
})

// PUT /:id — editar nota (solo propietario)
router.put('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' })
    }
    const { title, content, tags } = req.body
    if (!title || !title.trim()) return res.status(400).json({ error: 'El título es obligatorio' })

    const sanitizedTags = Array.isArray(tags)
      ? tags.slice(0, 5).map(t => String(t).trim().toLowerCase()).filter(Boolean)
      : []

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { title, content, tags: sanitizedTags } },
      { new: true, runValidators: true }
    )
    if (!note) return res.status(404).json({ error: 'No encontrada' })
    res.json(note)
  } catch (err) {
    next(err)
  }
})

// DELETE /:id — borrar nota (solo propietario)
router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' })
    }
    const deleted = await Note.findOneAndDelete({ _id: req.params.id, userId: req.userId })
    if (!deleted) return res.status(404).json({ error: 'No encontrada' })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

module.exports = router
