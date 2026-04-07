const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const rateLimit = require('express-rate-limit')
const User = require('../models/User')
const RefreshToken = require('../models/RefreshToken')

const SALT_ROUNDS = 12
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ACCESS_TTL  = '15m'          // access token corto
const REFRESH_DAYS = 7             // refresh token: 7 días

// Rate limiter estricto solo para auth (10 req / 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos, espera 15 minutos' }
})

router.use(authLimiter)

// ── Utilidades ──────────────────────────────────────────────────────────────

function signAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL })
}

async function createRefreshToken(userId) {
  const rawToken = crypto.randomBytes(40).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)
  await RefreshToken.create({ userId, token: rawToken, expiresAt })
  return rawToken
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' })
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' })
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

    const accessToken  = signAccessToken(user._id)
    const refreshToken = await createRefreshToken(user._id)
    res.status(201).json({ accessToken, refreshToken })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' })
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const accessToken  = signAccessToken(user._id)
    const refreshToken = await createRefreshToken(user._id)
    res.json({ accessToken, refreshToken })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/auth/refresh ───────────────────────────────────────────────────
// Valida el refresh token, lo invalida (rotación) y emite un par nuevo
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken es obligatorio' })

    const stored = await RefreshToken.findOne({ token: refreshToken })
    if (!stored || stored.expiresAt < new Date()) {
      // Token no existe o expiró — eliminar si existe y devolver 401
      if (stored) await stored.deleteOne()
      return res.status(401).json({ error: 'Refresh token inválido o expirado' })
    }

    // Rotación: invalidar el token usado y crear uno nuevo
    await stored.deleteOne()
    const newAccessToken  = signAccessToken(stored.userId)
    const newRefreshToken = await createRefreshToken(stored.userId)
    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/auth/logout ────────────────────────────────────────────────────
// Invalida el refresh token del cliente (el access token expira solo por TTL)
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken })
    }
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

module.exports = router

