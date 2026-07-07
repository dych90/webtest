const FeeStandard = require('../models/FeeStandard')
const CourseType = require('../models/CourseType')
const Student = require('../models/Student')
const { isSameId } = require('./studentAccess')
const { getEffectiveStudentAccount } = require('./studentAccount')

const toNumber = (value) => Number(value) || 0

const getDocId = (doc) => doc?._id || doc
const PIANO_COURSE_TYPE_NAME = '钢琴课'
const PIANO_FALLBACK_COURSE_TYPE_NAMES = new Set(['音基课', '陪练课'])
const fallbackCourseTypeIdCache = new Map()
let pianoCourseTypeIdCache = null
let hasLoadedPianoCourseTypeId = false

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

const buildApplicableFeeStandardFilters = ({ studentId, courseTypeId, teacherId, at, includeLegacyTeacherStandards }) => {
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

  return filters
}

const pickBestFeeStandard = (standards, studentId, teacherId) => {
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

const findBestFeeStandard = async ({ studentId, courseTypeId, teacherId, at, includeLegacyTeacherStandards }) => {
  const standards = await FeeStandard.find({
    $and: buildApplicableFeeStandardFilters({
      studentId,
      courseTypeId,
      teacherId,
      at,
      includeLegacyTeacherStandards
    })
  })
    .sort({ effectiveDate: -1, createdAt: -1 })

  return pickBestFeeStandard(standards, studentId, teacherId)
}

const getPianoCourseTypeId = async () => {
  if (hasLoadedPianoCourseTypeId) {
    return pianoCourseTypeIdCache
  }

  const pianoCourseType = await CourseType.findOne({ name: PIANO_COURSE_TYPE_NAME }).select('_id')
  pianoCourseTypeIdCache = pianoCourseType?._id || null
  hasLoadedPianoCourseTypeId = true

  return pianoCourseTypeIdCache
}

const resolveFallbackCourseTypeId = async (courseTypeId) => {
  if (!courseTypeId) return null
  const cacheKey = courseTypeId.toString()

  if (fallbackCourseTypeIdCache.has(cacheKey)) {
    return fallbackCourseTypeIdCache.get(cacheKey)
  }

  const courseType = await CourseType.findById(courseTypeId).select('name')
  if (!courseType || !PIANO_FALLBACK_COURSE_TYPE_NAMES.has(courseType.name)) {
    fallbackCourseTypeIdCache.set(cacheKey, null)
    return null
  }

  const pianoCourseTypeId = await getPianoCourseTypeId()
  if (!pianoCourseTypeId || isSameId(pianoCourseTypeId, courseTypeId)) {
    fallbackCourseTypeIdCache.set(cacheKey, null)
    return null
  }

  fallbackCourseTypeIdCache.set(cacheKey, pianoCourseTypeId)
  return pianoCourseTypeId
}

const findApplicableFeeStandard = async ({ studentId, courseTypeId, teacherId, at = new Date() }) => {
  if (!courseTypeId) return null

  const student = studentId ? await Student.findById(studentId).select('teacherId') : null
  const includeLegacyTeacherStandards = !teacherId || (student && isSameId(student.teacherId, teacherId))

  const bestStandard = await findBestFeeStandard({
    studentId,
    courseTypeId,
    teacherId,
    at,
    includeLegacyTeacherStandards
  })
  if (bestStandard) {
    return bestStandard
  }

  const fallbackCourseTypeId = await resolveFallbackCourseTypeId(courseTypeId)
  if (!fallbackCourseTypeId) {
    return null
  }

  return findBestFeeStandard({
    studentId,
    courseTypeId: fallbackCourseTypeId,
    teacherId,
    at,
    includeLegacyTeacherStandards
  })
}

const getAccountCoursePrice = async ({ student, studentId, courseTypeId, teacherId, at = new Date(), fallbackPrice = 0 }) => {
  const resolvedStudent = student || (studentId ? await Student.findById(studentId).select('teacherId paymentType currentPrice priceEffectiveDate practiceTeacherId') : null)
  const resolvedStudentId = studentId || getDocId(resolvedStudent)

  if (!resolvedStudentId || !teacherId) {
    return toNumber(fallbackPrice)
  }

  const account = resolvedStudent
    ? await getEffectiveStudentAccount(resolvedStudent, teacherId)
    : null

  if (account?.paymentType === 'free') {
    return 0
  }

  const feeStandard = courseTypeId
    ? await findApplicableFeeStandard({
      studentId: resolvedStudentId,
      courseTypeId,
      teacherId,
      at
    })
    : null

  if (feeStandard) {
    return toNumber(feeStandard.price)
  }

  if (!resolvedStudent) {
    return toNumber(fallbackPrice)
  }

  return toNumber(account.currentPrice ?? fallbackPrice)
}

module.exports = {
  getAccountCoursePrice,
  findApplicableFeeStandard
}
