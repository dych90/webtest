const Student = require('../models/Student')
const { getTeacherStudentAccessFilter, isSameId, toIdString } = require('./studentAccess')

const getDocumentTeacherId = (doc, student) => {
  return toIdString(doc?.teacherId) || toIdString(student?.teacherId)
}

const getTeacherAccountId = (student, user, requestedTeacherId) => {
  if (!student || !user) return ''
  if (user.role === 'admin') {
    return requestedTeacherId || toIdString(student.teacherId)
  }
  return toIdString(user._id || user.id)
}

const canAccessTeacherAccount = (student, user, accountTeacherId) => {
  if (!student || !user || !accountTeacherId) return false
  if (user.role === 'admin') return true

  const userId = user._id || user.id
  return isSameId(userId, accountTeacherId) && (
    isSameId(student.teacherId, userId) ||
    isSameId(student.practiceTeacherId, userId)
  )
}

const getLegacyTeacherAccountFilter = (teacherId, ownedStudentIds = []) => {
  const ownedIds = ownedStudentIds.filter(Boolean)
  if (!ownedIds.length) return []

  return [
    { teacherId: { $exists: false }, studentId: { $in: ownedIds } },
    { teacherId: null, studentId: { $in: ownedIds } }
  ]
}

const getTeacherAccountFilter = (teacherId, ownedStudentIds = []) => ({
  $or: [
    { teacherId },
    ...getLegacyTeacherAccountFilter(teacherId, ownedStudentIds)
  ]
})

const getTeacherAccountScope = async (teacherId, studentId) => {
  const students = await Student.find(getTeacherStudentAccessFilter(teacherId))
    .select('_id teacherId practiceTeacherId')

  const accessibleIds = students.map(student => student._id)
  const ownedIds = students
    .filter(student => isSameId(student.teacherId, teacherId))
    .map(student => student._id)

  if (studentId && !accessibleIds.some(id => isSameId(id, studentId))) {
    return {
      allowed: false,
      studentIds: [],
      ownedStudentIds: []
    }
  }

  return {
    allowed: true,
    studentIds: studentId ? [studentId] : accessibleIds,
    ownedStudentIds: ownedIds,
    accountFilter: getTeacherAccountFilter(teacherId, ownedIds)
  }
}

const getScopedBalanceKey = (studentId, teacherId) => {
  return `${toIdString(studentId)}:${toIdString(teacherId)}`
}

module.exports = {
  canAccessTeacherAccount,
  getDocumentTeacherId,
  getTeacherAccountFilter,
  getTeacherAccountId,
  getTeacherAccountScope,
  getScopedBalanceKey
}
