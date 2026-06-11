const mongoose = require('mongoose')

const mediaItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['image', 'audio'], required: true },
  fileKey: { type: String, required: true },
  url: { type: String, required: true },
  originalName: String,
  mimeType: String,
  size: Number,
  duration: Number,
  createdAt: { type: Date, default: Date.now }
}, { _id: false })

const lessonRecordSchema = new mongoose.Schema({
  courseTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseType' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  lessonsConsumed: { type: Number, required: true },
  lessonContent: String,
  mediaItems: { type: [mediaItemSchema], default: [] },
  isDeducted: { type: Boolean, default: false },
  isGiftLesson: { type: Boolean, default: false },
  unitPrice: { type: Number, default: 0 },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  notes: String,
  courseStartTime: { type: Date },
  recordDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const removePrivateMediaFields = (record) => {
  if (!record || !Array.isArray(record.mediaItems)) return record

  record.mediaItems = record.mediaItems.map((item) => {
    if (!item) return item

    const { fileKey, ...publicItem } = item
    return publicItem
  })

  return record
}

lessonRecordSchema.set('toJSON', {
  transform: (doc, ret) => removePrivateMediaFields(ret)
})

lessonRecordSchema.set('toObject', {
  transform: (doc, ret) => removePrivateMediaFields(ret)
})

module.exports = mongoose.model('LessonRecord', lessonRecordSchema)
