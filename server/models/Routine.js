const mongoose = require('mongoose')

const routineSchema = new mongoose.Schema({
  name:      { type: String, required: true, unique: true, trim: true },
  exercises: [{ type: String, trim: true }]
})

module.exports = mongoose.model('Routine', routineSchema)
