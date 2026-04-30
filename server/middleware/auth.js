const jwt  = require('jsonwebtoken')
const User = require('../models/User')

const GUEST_MODE = process.env.GUEST_MODE === 'true'

let cachedGuestId = null

async function getGuestUserId() {
  if (cachedGuestId) return cachedGuestId
  const user = await User.findOne().select('_id').lean()
  if (user) cachedGuestId = user._id.toString()
  return cachedGuestId
}

module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    if (GUEST_MODE) {
      return getGuestUserId().then(id => {
        if (!id) return res.status(503).json({ error: 'Sin usuario en la base de datos' })
        req.userId = id
        next()
      }).catch(next)
    }
    return res.status(401).json({ error: 'No autorizado' })
  }

  const token = header.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.userId
    next()
  } catch {
    if (GUEST_MODE) {
      return getGuestUserId().then(id => {
        if (!id) return res.status(503).json({ error: 'Sin usuario en la base de datos' })
        req.userId = id
        next()
      }).catch(next)
    }
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}
