const mongoose = require('mongoose')

const ensureAccountIndexes = async () => {
  const LessonBalance = require('../models/LessonBalance')
  const StudentAccount = require('../models/StudentAccount')
  const Student = require('../models/Student')
  let indexes = []
  try {
    indexes = await LessonBalance.collection.indexes()
  } catch (error) {
    if (error.codeName !== 'NamespaceNotFound') {
      throw error
    }
  }
  const legacyStudentUniqueIndex = indexes.find(index => {
    const keys = Object.keys(index.key || {})
    return index.unique && keys.length === 1 && index.key.studentId === 1
  })

  if (legacyStudentUniqueIndex) {
    await LessonBalance.collection.dropIndex(legacyStudentUniqueIndex.name)
    console.log('已移除旧的课时余额 studentId 唯一索引')
  }

  const legacyBalances = await LessonBalance.find({
    $or: [
      { teacherId: { $exists: false } },
      { teacherId: null }
    ]
  })
  for (const balance of legacyBalances) {
    const student = await Student.findById(balance.studentId).select('teacherId')
    if (student?.teacherId) {
      const existingBalance = await LessonBalance.findOne({
        _id: { $ne: balance._id },
        studentId: balance.studentId,
        teacherId: student.teacherId
      })
      if (existingBalance) {
        existingBalance.remainingLessons += balance.remainingLessons || 0
        existingBalance.lastUpdated = new Date()
        await existingBalance.save()
        await balance.deleteOne()
        continue
      }

      balance.teacherId = student.teacherId
      await balance.save()
    }
  }

  await LessonBalance.collection.createIndex(
    { studentId: 1, teacherId: 1 },
    { unique: true }
  )
  await StudentAccount.collection.createIndex(
    { studentId: 1, teacherId: 1 },
    { unique: true }
  )
}

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    await ensureAccountIndexes()
    console.log('✅ MongoDB连接成功')
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error.message)
    process.exit(1)
  }
}

module.exports = { connectDB, mongoose }
