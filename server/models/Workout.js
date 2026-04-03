const mongoose = require('mongoose')

const workoutSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  exercise: { type: String, required: true, trim: true, maxlength: 100 },
  sets:     { type: Number, required: true, min: 1 },
  reps:     { type: Number, required: true, min: 1 },
  weight:   { type: Number, required: true, min: 0 },
  date:     { type: Date, default: Date.now }
})

module.exports = mongoose.model('Workout', workoutSchema)
