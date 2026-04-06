const mongoose = require('mongoose')

const noteSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:   { type: String, required: true, trim: true, maxlength: 100 },
  content: { type: String, trim: true, maxlength: 5000, default: '' },
  tags: {
    type: [{ type: String, trim: true, lowercase: true, maxlength: 20 }],
    validate: {
      validator: v => v.length <= 5,
      message: 'Máximo 5 etiquetas permitidas'
    }
  }
}, { timestamps: true })

noteSchema.index({ title: 'text', content: 'text' })

module.exports = mongoose.model('Note', noteSchema)
