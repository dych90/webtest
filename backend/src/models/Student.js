const mongoose = require('mongoose')

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gender: String,
  birthday: Date,
  idCard: String,
  phone: String,
  parentName: String,
  parentPhone: String,
  defaultCourseTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseType' },
  paymentType: { type: String, enum: ['prepaid', 'payPerLesson'], default: 'prepaid' },
  currentPrice: { type: Number, default: 0 },
  priceEffectiveDate: { type: Date, default: Date.now },
  pianoStartDate: Date,
  learningProgress: String,
  learningPlan: String,
  practiceTeacher: String,
  notes: String,
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Student', studentSchema)
