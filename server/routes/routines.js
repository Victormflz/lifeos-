const express = require('express')
const router = express.Router()
const Routine = require('../models/Routine')

// GET — plantillas globales, sin autenticación
router.get('/', async (req, res, next) => {
  try {
    const routines = await Routine.find().sort({ name: 1 })
    res.json(routines)
  } catch (err) {
    next(err)
  }
})

module.exports = router
