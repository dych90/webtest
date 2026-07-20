const mongoose = require('mongoose')
const {
  POINT_TYPES,
  attachUpdatedAtHooks
} = require('./pointShared')

const pointSpendAllocationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  pointType: { type: String, enum: POINT_TYPES, required: true, index: true },
  spendLedgerId: { type: mongoose.Schema.Types.ObjectId, ref: 'PointLedger', required: true, index: true },
  sourceLotId: { type: mongoose.Schema.Types.ObjectId, ref: 'PointLot', required: true, index: true },
  allocatedAmount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

pointSpendAllocationSchema.index({ spendLedgerId: 1, sourceLotId: 1 }, { unique: true })
pointSpendAllocationSchema.index({ sourceLotId: 1, createdAt: -1 })
attachUpdatedAtHooks(pointSpendAllocationSchema)

module.exports = mongoose.model('PointSpendAllocation', pointSpendAllocationSchema)
