const mongoose = require('mongoose')

const scoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date:   { type: String, required: true },   // YYYY-MM-DD
  score:  { type: Number, required: true },
}, { timestamps: true })

// Un score por usuario por día
scoreSchema.index({ userId: 1, date: 1 }, { unique: true })

module.exports = mongoose.model('Score', scoreSchema)
