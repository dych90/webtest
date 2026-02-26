const mongoose = require('mongoose')

const repertoireSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  pieceName: { type: String, required: true },
  recordDate: { type: Date, default: Date.now },
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Repertoire', repertoireSchema)
