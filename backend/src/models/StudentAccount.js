const mongoose = require('mongoose')

const studentAccountSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentType: { type: String, enum: ['prepaid', 'payPerLesson', 'free'], default: 'prepaid' },
  currentPrice: { type: Number, default: 0 },
  priceEffectiveDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

studentAccountSchema.index({ studentId: 1, teacherId: 1 }, { unique: true })

module.exports = mongoose.model('StudentAccount', studentAccountSchema)
