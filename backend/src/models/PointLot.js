const mongoose = require('mongoose')
const {
  POINT_TYPES,
  POINT_LOT_STATUSES,
  attachUpdatedAtHooks
} = require('./pointShared')

const pointLotSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  pointType: { type: String, enum: POINT_TYPES, required: true, index: true },
  sourceLedgerId: { type: mongoose.Schema.Types.ObjectId, ref: 'PointLedger', required: true, unique: true },
  originalAmount: { type: Number, required: true },
  remainingAmount: { type: Number, required: true },
  expireAt: { type: Date, index: true },
  status: { type: String, enum: POINT_LOT_STATUSES, default: 'active', index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

pointLotSchema.pre('save', function(next) {
  if (this.remainingAmount === undefined || this.remainingAmount === null) {
    this.remainingAmount = this.originalAmount
  }
  next()
})

pointLotSchema.index({ studentId: 1, teacherId: 1, pointType: 1, status: 1, expireAt: 1 })
attachUpdatedAtHooks(pointLotSchema)

module.exports = mongoose.model('PointLot', pointLotSchema)
