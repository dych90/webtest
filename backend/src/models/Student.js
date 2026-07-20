const mongoose = require('mongoose')
const { STUDY_STATUSES } = require('./pointShared')

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gender: String,
  birthday: Date,
  idCard: String,
  phone: String,
  parentName: String,
  parentPhone: String,
  defaultCourseTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseType' },
  paymentType: { type: String, enum: ['prepaid', 'payPerLesson', 'free'], default: 'prepaid' },
  currentPrice: { type: Number, default: 0 },
  priceEffectiveDate: { type: Date, default: Date.now },
  pianoStartDate: Date,
  learningProgress: String,
  learningPlan: String,
  practiceTeacher: String,
  practiceTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studyStatus: { type: String, enum: STUDY_STATUSES, default: 'active' },
  studyStatusChangedAt: { type: Date, default: Date.now },
  pointRetentionUntil: Date,
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Student', studentSchema)
