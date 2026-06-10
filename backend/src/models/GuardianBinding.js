const mongoose = require('mongoose')

const guardianBindingSchema = new mongoose.Schema({
  openId: { type: String, required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  relation: { type: String, enum: ['guardian', 'parent', 'student'], default: 'guardian' },
  status: { type: String, enum: ['active', 'revoked'], default: 'active', index: true },
  lastSubscribedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

guardianBindingSchema.index({ openId: 1, studentId: 1 }, { unique: true })

guardianBindingSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

module.exports = mongoose.model('GuardianBinding', guardianBindingSchema)
