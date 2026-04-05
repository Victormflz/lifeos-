const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const SALT_ROUNDS = 12

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' })
    }

    const exists = await User.findOne({ email })
    if (exists) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' })
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await User.create({ email, password: hash })

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '365d' })
    res.status(201).json({ token })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      // Mismo mensaje que contraseña incorrecta — no revelar si el email existe
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '365d' })
    res.json({ token })
  } catch (err) {
    next(err)
  }
})

module.exports = router
