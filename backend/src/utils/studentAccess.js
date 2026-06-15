const toIdString = (value) => {
  if (!value) return ''
  return (value._id || value).toString()
}

const isSameId = (a, b) => {
  const aId = toIdString(a)
  const bId = toIdString(b)
  return Boolean(aId && bId && aId === bId)
}

const getTeacherStudentAccessFilter = (teacherId) => ({
  $or: [
    { teacherId },
    { practiceTeacherId: teacherId }
  ]
})

const getStudentRelationType = (student, user) => {
  if (!student || !user) return ''
  if (user.role === 'admin') return 'admin'
  if (isSameId(student.teacherId, user._id || user.id)) return 'owner'
  if (isSameId(student.practiceTeacherId, user._id || user.id)) return 'practice'
  return ''
}

const canViewStudent = (student, user) => {
  return Boolean(getStudentRelationType(student, user))
}

const canManageStudent = (student, user) => {
  if (!student || !user) return false
  if (user.role === 'admin') return true
  return isSameId(student.teacherId, user._id || user.id)
}

const attachStudentRelationType = (student, user) => {
  const plainStudent = student?.toObject ? student.toObject() : student
  if (!plainStudent) return plainStudent

  return {
    ...plainStudent,
    studentRelationType: getStudentRelationType(plainStudent, user)
  }
}

module.exports = {
  toIdString,
  isSameId,
  getTeacherStudentAccessFilter,
  getStudentRelationType,
  canViewStudent,
  canManageStudent,
  attachStudentRelationType
}
