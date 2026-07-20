const mongoose = require('mongoose')
const {
  PRACTICE_CATEGORY_CODES,
  POINT_ACTOR_TYPES,
  CHECKIN_REVIEW_STATUSES,
  EVIDENCE_MEDIA_TYPES,
  attachUpdatedAtHooks
} = require('./pointShared')

const evidenceMediaSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: EVIDENCE_MEDIA_TYPES, required: true },
  fileKey: String,
  url: String,
  originalName: String,
  mimeType: String,
  size: Number,
  duration: Number,
  createdAt: { type: Date, default: Date.now }
}, { _id: false })

const checkinItemSchema = new mongoose.Schema({
  categoryCode: { type: String, enum: PRACTICE_CATEGORY_CODES, required: true },
  completed: { type: Boolean, default: false },
  remark: String,
  evidenceMedia: { type: [evidenceMediaSchema], default: [] }
}, { _id: false })

const practiceCheckinSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'PracticePlan', required: true, index: true },
  weekKey: { type: String, required: true, index: true },
  checkinDate: { type: Date, required: true, index: true },
  submittedByType: { type: String, enum: POINT_ACTOR_TYPES, default: 'guardian' },
  submittedById: { type: mongoose.Schema.Types.ObjectId },
  reviewStatus: { type: String, enum: CHECKIN_REVIEW_STATUSES, default: 'pending', index: true },
  items: { type: [checkinItemSchema], default: [] },
  rawStarCount: { type: Number, default: 0 },
  rewardableStarCount: { type: Number, default: 0 },
  weeklyPracticeStarsBefore: { type: Number, default: 0 },
  weeklyPracticeStarsAfter: { type: Number, default: 0 },
  isOverflowOnly: { type: Boolean, default: false },
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewRemark: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

practiceCheckinSchema.index({ studentId: 1, teacherId: 1, checkinDate: 1 }, { unique: true })
attachUpdatedAtHooks(practiceCheckinSchema)

module.exports = mongoose.model('PracticeCheckin', practiceCheckinSchema)
