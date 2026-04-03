const mongoose = require('mongoose')

const habitSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:      { type: String, required: true, trim: true, maxlength: 80 },
  emoji:     { type: String, default: '⭐', maxlength: 4 },
  frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
  // Array de fechas (YYYY-MM-DD) en que se completó el hábito
  completions: [{ type: String }]
}, { timestamps: true })

module.exports = mongoose.model('Habit', habitSchema)
