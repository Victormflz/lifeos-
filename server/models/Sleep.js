const mongoose = require('mongoose')

const sleepSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bedtime:    { type: String, required: true },
  wakeTime:   { type: String, required: true },
  hoursTotal: { type: Number },
  quality:    { type: Number, required: true, min: 1, max: 5 },
  notes:      { type: String, default: '', maxlength: 300 },
  date:       { type: String, required: true },
}, { timestamps: true })

sleepSchema.index({ userId: 1, date: 1 }, { unique: true })

sleepSchema.pre('save', function () {
  const [bH, bM] = this.bedtime.split(':').map(Number)
  const [wH, wM] = this.wakeTime.split(':').map(Number)
  let minutes = (wH * 60 + wM) - (bH * 60 + bM)
  if (minutes < 0) minutes += 24 * 60
  this.hoursTotal = Math.round((minutes / 60) * 10) / 10
})

module.exports = mongoose.model('Sleep', sleepSchema)
