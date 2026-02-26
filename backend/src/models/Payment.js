const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  paymentType: { type: String, required: true },
  amount: { type: Number, required: true },
  bonusLessons: { type: Number, default: 0 },
  totalLessons: { type: Number, required: true },
  unitPrice: { type: Number },
  paymentDate: { type: Date, required: true },
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

paymentSchema.pre('save', function(next) {
  if (this.amount && this.totalLessons && !this.unitPrice) {
    this.unitPrice = this.amount / this.totalLessons
  }
  next()
})

module.exports = mongoose.model('Payment', paymentSchema)
