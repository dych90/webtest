const mongoose = require('mongoose')

const courseTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  duration: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('CourseType', courseTypeSchema)
