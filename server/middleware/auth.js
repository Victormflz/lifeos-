const jwt = require('jsonwebtoken')

// GUEST_MODE: cuando no hay token válido, se permite el acceso con un userId fijo.
// Activar/desactivar con la variable de entorno GUEST_MODE=true en Railway.
const GUEST_MODE = process.env.GUEST_MODE === 'true'
const GUEST_USER_ID = process.env.GUEST_USER_ID || '000000000000000000000001'

module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    if (GUEST_MODE) {
      req.userId = GUEST_USER_ID
      return next()
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
      req.userId = GUEST_USER_ID
      return next()
    }
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}
