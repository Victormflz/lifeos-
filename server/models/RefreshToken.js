const mongoose = require('mongoose')

const refreshTokenSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token:     { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
})

// TTL index — MongoDB elimina automáticamente los documentos expirados
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('RefreshToken', refreshTokenSchema)
