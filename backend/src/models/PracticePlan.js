const mongoose = require('mongoose')
const {
  PRACTICE_CATEGORY_CODES,
  PRACTICE_PLAN_STATUSES,
  attachUpdatedAtHooks
} = require('./pointShared')

const planItemSchema = new mongoose.Schema({
  categoryCode: { type: String, enum: PRACTICE_CATEGORY_CODES, required: true },
  title: { type: String, required: true },
  instructionText: { type: String, required: true },
  targetMinutes: Number,
  targetCount: Number,
  targetTempo: String,
  isRequired: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { _id: false })

const practicePlanSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  weekKey: { type: String, required: true, index: true },
  weekStartDate: { type: Date, required: true },
  weekEndDate: { type: Date, required: true },
  status: { type: String, enum: PRACTICE_PLAN_STATUSES, default: 'draft', index: true },
  items: { type: [planItemSchema], default: [] },
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

practicePlanSchema.index({ studentId: 1, teacherId: 1, weekKey: 1 }, { unique: true })
attachUpdatedAtHooks(practicePlanSchema)

module.exports = mongoose.model('PracticePlan', practicePlanSchema)
