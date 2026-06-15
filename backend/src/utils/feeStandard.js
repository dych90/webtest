const FeeStandard = require('../models/FeeStandard')
const Student = require('../models/Student')
const { isSameId } = require('./studentAccess')

const getFeeStandardScore = (standard, studentId, teacherId) => {
  let score = 0

  if (studentId && isSameId(standard.studentId, studentId)) {
    score += 2
  }

  if (teacherId && isSameId(standard.teacherId, teacherId)) {
    score += 1
  }

  return score
}

const findApplicableFeeStandard = async ({ studentId, courseTypeId, teacherId, at = new Date() }) => {
  if (!courseTypeId) return null
  const student = studentId ? await Student.findById(studentId).select('teacherId') : null
  const includeLegacyTeacherStandards = !teacherId || (student && isSameId(student.teacherId, teacherId))

  const filters = [
    { courseTypeId },
    {
      $or: [
        { effectiveDate: { $lte: at } },
        { effectiveDate: { $exists: false } }
      ]
    },
    {
      $or: [
        { expireDate: { $exists: false } },
        { expireDate: null },
        { expireDate: { $gte: at } }
      ]
    }
  ]

  if (studentId) {
    filters.push({
      $or: [
        { studentId },
        { studentId: { $exists: false } },
        { studentId: null }
      ]
    })
  }

  if (teacherId) {
    const teacherFilters = [{ teacherId }]
    if (includeLegacyTeacherStandards) {
      teacherFilters.push(
        { teacherId: { $exists: false } },
        { teacherId: null }
      )
    }
    filters.push({ $or: teacherFilters })
  }

  const standards = await FeeStandard.find({ $and: filters })
    .sort({ effectiveDate: -1, createdAt: -1 })

  let bestStandard = null
  let bestScore = -1

  standards.forEach((standard) => {
    const score = getFeeStandardScore(standard, studentId, teacherId)
    if (score > bestScore) {
      bestStandard = standard
      bestScore = score
    }
  })

  return bestStandard
}

module.exports = {
  findApplicableFeeStandard
}
