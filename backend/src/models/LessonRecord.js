const mongoose = require('mongoose')

const lessonRecordSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  lessonsConsumed: { type: Number, required: true },
  lessonContent: String,
  isDeducted: { type: Boolean, default: false },
  isGiftLesson: { type: Boolean, default: false },
  unitPrice: { type: Number, default: 0 },
  notes: String,
  courseStartTime: { type: Date },
  recordDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('LessonRecord', lessonRecordSchema)
