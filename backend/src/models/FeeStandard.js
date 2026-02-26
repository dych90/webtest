const mongoose = require('mongoose')

const feeStandardSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  courseTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseType', required: true },
  price: { type: Number, required: true },
  effectiveDate: { type: Date, required: true },
  expireDate: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('FeeStandard', feeStandardSchema)
