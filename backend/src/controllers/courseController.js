const Course = require('../models/Course')
const Student = require('../models/Student')
const CourseType = require('../models/CourseType')
const User = require('../models/User')
const LessonRecord = require('../models/LessonRecord')
const LessonBalance = require('../models/LessonBalance')
const {
  canViewStudent,
  getStudentRelationType,
  getTeacherStudentAccessFilter,
  isSameId
} = require('../utils/studentAccess')
const { getEffectivePaymentType } = require('../utils/studentAccount')
const rewardSettlementService = require('../services/rewardSettlementService')

const PRACTICE_COURSE_TYPE_NAME = '陪练课'
const DEFAULT_PLANNED_LESSONS = 1
const COURSE_ROLE_TEACHER = 'teacher'
const COURSE_ROLE_STUDENT = 'student'

const normalizeParticipationRole = (value) => {
  return value === COURSE_ROLE_STUDENT ? COURSE_ROLE_STUDENT : COURSE_ROLE_TEACHER
}

const isLearningCourse = (course) => {
  return normalizeParticipationRole(course?.participationRole) === COURSE_ROLE_STUDENT
}

const shouldIncludeLearningCourses = (value) => {
  return value === true || value === 'true' || value === '1'
}

const sanitizeOptionalText = (value) => {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

const normalizePlannedLessons = (value, fallback = DEFAULT_PLANNED_LESSONS) => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback
  }

  return Math.round((numericValue + Number.EPSILON) * 100) / 100
}

const getOrCreatePracticeCourseType = async () => {
  return CourseType.findOneAndUpdate(
    { name: PRACTICE_COURSE_TYPE_NAME, participationRole: { $ne: COURSE_ROLE_STUDENT } },
    {
      $set: {
        participationRole: COURSE_ROLE_TEACHER
      },
      $setOnInsert: {
        name: PRACTICE_COURSE_TYPE_NAME,
        duration: 60,
        isDefault: false,
        sortOrder: 999
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
}

const resolveCourseTypeForTeacher = async (student, user, requestedCourseTypeId) => {
  let courseTypeId = requestedCourseTypeId

  if (user?.role !== 'admin' && getStudentRelationType(student, user) === 'practice') {
    const practiceCourseType = await getOrCreatePracticeCourseType()
    courseTypeId = practiceCourseType._id
  }

  if (!courseTypeId) {
    return courseTypeId
  }

  const courseType = await CourseType.findById(courseTypeId)
  if (!courseType) {
    const error = new Error('课程类型不存在')
    error.statusCode = 404
    throw error
  }

  if (normalizeParticipationRole(courseType.participationRole) === COURSE_ROLE_STUDENT) {
    const error = new Error('请选择我授课的课程类型')
    error.statusCode = 400
    throw error
  }

  return courseType._id
}

const resolveCourseTypeForLearning = async (requestedCourseTypeId) => {
  if (!requestedCourseTypeId) {
    return null
  }

  const courseType = await CourseType.findById(requestedCourseTypeId)
  if (!courseType) {
    const error = new Error('课程类型不存在')
    error.statusCode = 404
    throw error
  }

  if (normalizeParticipationRole(courseType.participationRole) !== COURSE_ROLE_STUDENT) {
    const error = new Error('请选择我上课的课程类型')
    error.statusCode = 400
    throw error
  }

  return courseType
}

const toPlainObject = (doc) => {
  return doc?.toObject ? doc.toObject() : doc
}

const getCourseOwnerId = (course) => {
  return course?.teacherId?._id || course?.teacherId
}

const canManageCourse = (course, user) => {
  if (!course || !user) return false
  if (user.role === 'admin') return true
  return isSameId(getCourseOwnerId(course), user._id || user.id)
}

const canViewCourse = (course, user) => {
  if (!course || !user) return false
  if (isLearningCourse(course)) return canManageCourse(course, user)
  return canViewStudent(course.studentId, user)
}

const attachCourseAccess = (course, user) => {
  const plainCourse = toPlainObject(course)
  if (!plainCourse) return plainCourse

  const manageCourse = canManageCourse(plainCourse, user)
  const relationType = isLearningCourse(plainCourse)
    ? 'learning'
    : getStudentRelationType(plainCourse.studentId, user)
  return {
    ...plainCourse,
    canManageCourse: manageCourse,
    courseRelationType: relationType,
    isPracticeCourse: relationType === 'owner' && !manageCourse
  }
}

const attachLessonRecordsToCourses = async (courses = [], user) => {
  if (!courses.length) return []

  const courseIds = courses.map(course => course?._id).filter(Boolean)
  if (!courseIds.length) return courses.map(course => attachCourseAccess(course, user))

  const lessonRecords = await LessonRecord.find({ courseId: { $in: courseIds } })
    .sort({ recordDate: -1, createdAt: -1 })
    .select('courseTypeId courseId lessonsConsumed lessonContent mediaItems isDeducted isGiftLesson recordDate courseStartTime createdAt')
    .populate('courseTypeId', 'name duration participationRole')

  const recordMap = {}
  lessonRecords.forEach(record => {
    const plainRecord = toPlainObject(record)
    const courseId = plainRecord.courseId?.toString()
    if (courseId && !recordMap[courseId]) {
      recordMap[courseId] = plainRecord
    }
  })

  return courses.map(course => {
    const plainCourse = toPlainObject(course)
    const courseId = plainCourse._id?.toString()
    return attachCourseAccess({
      ...plainCourse,
      lessonRecord: courseId ? recordMap[courseId] || null : null
    }, user)
  })
}

const getCourses = async (req, res) => {
  try {
    const { studentId, startTime, endTime, teacherId } = req.query
    const includeLearningCourses = shouldIncludeLearningCourses(req.query.includeLearningCourses)
    const user = await User.findById(req.userId)
    
    console.log('课程查询参数:', req.query)
    console.log('当前用户ID:', req.userId, '角色:', user?.role)
    
    const filter = {}
    
    if (user && user.role !== 'admin') {
      const accessibleStudents = await Student.find(getTeacherStudentAccessFilter(req.userId))
        .select('_id')
      const accessibleStudentIds = accessibleStudents.map(student => student._id)

      if (studentId) {
        if (!accessibleStudentIds.some(accessibleId => isSameId(accessibleId, studentId))) {
          return res.json({
            message: '获取成功',
            data: []
          })
        }
        filter.studentId = studentId
        filter.participationRole = { $ne: COURSE_ROLE_STUDENT }
      } else {
        const accessFilters = [
          {
            studentId: { $in: accessibleStudentIds },
            participationRole: { $ne: COURSE_ROLE_STUDENT }
          }
        ]

        if (includeLearningCourses) {
          accessFilters.push({
            teacherId: req.userId,
            participationRole: COURSE_ROLE_STUDENT
          })
        }

        filter.$or = accessFilters
      }
    } else if (user && user.role === 'admin' && teacherId) {
      filter.teacherId = teacherId
      if (!includeLearningCourses) {
        filter.participationRole = { $ne: COURSE_ROLE_STUDENT }
      }
    }
    
    if (studentId && !filter.studentId) {
      filter.studentId = studentId
      filter.participationRole = { $ne: COURSE_ROLE_STUDENT }
    } else if (!studentId && user?.role === 'admin' && !includeLearningCourses) {
      filter.participationRole = { $ne: COURSE_ROLE_STUDENT }
    }
    
    if (startTime && endTime) {
      filter.startTime = {
        $gte: new Date(startTime),
        $lte: new Date(endTime)
      }
    }
    
    console.log('查询课程条件:', filter)
    
    const courses = await Course.find(filter)
      .sort({ startTime: 1 })
      .populate('studentId', 'name phone teacherId practiceTeacherId')
      .populate('courseTypeId', 'name duration participationRole')
      .populate('teacherId', 'name username')
    
    console.log('查询到的课程数量:', courses.length)
    const coursesWithRecords = await attachLessonRecordsToCourses(courses, user)
    
    res.json({
      message: '获取成功',
      data: coursesWithRecords
    })
  } catch (error) {
    console.error('获取课程列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const getCourseById = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.userId)
    
    const course = await Course.findById(id)
      .populate('studentId', 'name phone teacherId practiceTeacherId')
      .populate('courseTypeId', 'name duration participationRole')
      .populate('teacherId', 'name username')
    
    if (!course) {
      return res.status(404).json({ message: '课程不存在' })
    }
    
    if (!canViewCourse(course, user)) {
      return res.status(403).json({ message: '无权限查看此课程' })
    }
    
    const [courseWithRecord] = await attachLessonRecordsToCourses([course], user)

    res.json({
      message: '获取成功',
      data: courseWithRecord
    })
  } catch (error) {
    console.error('获取课程详情错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const createCourse = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    const participationRole = normalizeParticipationRole(req.body.participationRole)
    const isStudentSideCourse = participationRole === COURSE_ROLE_STUDENT
    let student = null
    let courseTypeId = req.body.courseTypeId

    if (isStudentSideCourse) {
      if (!sanitizeOptionalText(req.body.externalTeacherName)) {
        return res.status(400).json({ message: '请填写授课老师' })
      }

      const learningCourseType = await resolveCourseTypeForLearning(req.body.courseTypeId)
      const externalCourseName = sanitizeOptionalText(req.body.externalCourseName) || learningCourseType?.name || ''

      if (!externalCourseName) {
        return res.status(400).json({ message: '请填写课程名称' })
      }

      courseTypeId = learningCourseType?._id || null
      req.body.externalCourseName = externalCourseName
    } else {
      student = await Student.findById(req.body.studentId)

      if (!student) {
        return res.status(404).json({ message: '学生不存在' })
      }

      if (user.role !== 'admin' && !canViewStudent(student, user)) {
        return res.status(403).json({ message: '无权限为此学生创建课程' })
      }

      courseTypeId = await resolveCourseTypeForTeacher(student, user, req.body.courseTypeId)
    }
    
    const courseData = {
      ...req.body,
      studentId: isStudentSideCourse ? null : req.body.studentId,
      courseTypeId,
      plannedLessons: normalizePlannedLessons(req.body.plannedLessons),
      participationRole,
      externalTeacherName: isStudentSideCourse ? sanitizeOptionalText(req.body.externalTeacherName) : '',
      externalCourseName: isStudentSideCourse ? sanitizeOptionalText(req.body.externalCourseName) : '',
      teacherId: user.role === 'admin' && req.body.teacherId ? req.body.teacherId : req.userId,
      groupId: req.body.groupId || null
    }
    
    const course = await Course.create(courseData)
    
    res.json({
      message: '创建成功',
      data: course
    })
  } catch (error) {
    console.error('创建课程错误:', error)
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message })
    }
    res.status(500).json({ message: '服务器错误' })
  }
}

const updateCourse = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.userId)
    
    const course = await Course.findById(id)
    
    if (!course) {
      return res.status(404).json({ message: '课程不存在' })
    }
    
    if (user.role !== 'admin' && course.teacherId.toString() !== req.userId) {
      return res.status(403).json({ message: '无权限修改此课程' })
    }
    
    console.log('更新课程，ID:', id)
    console.log('更新课程数据:', req.body)
    
    const updateData = { ...req.body }
    const nextParticipationRole = normalizeParticipationRole(updateData.participationRole || course.participationRole)
    const isStudentSideCourse = nextParticipationRole === COURSE_ROLE_STUDENT

    updateData.participationRole = nextParticipationRole

    if (isStudentSideCourse) {
      const nextExternalTeacherName = Object.prototype.hasOwnProperty.call(req.body, 'externalTeacherName')
        ? sanitizeOptionalText(req.body.externalTeacherName)
        : sanitizeOptionalText(course.externalTeacherName)
      const nextExternalCourseName = Object.prototype.hasOwnProperty.call(req.body, 'externalCourseName')
        ? sanitizeOptionalText(req.body.externalCourseName)
        : sanitizeOptionalText(course.externalCourseName)
      const nextCourseTypeId = Object.prototype.hasOwnProperty.call(req.body, 'courseTypeId')
        ? req.body.courseTypeId
        : course.courseTypeId
      const learningCourseType = await resolveCourseTypeForLearning(nextCourseTypeId)
      const resolvedExternalCourseName = nextExternalCourseName || learningCourseType?.name || ''

      if (!nextExternalTeacherName) {
        return res.status(400).json({ message: '请填写授课老师' })
      }

      if (!resolvedExternalCourseName) {
        return res.status(400).json({ message: '请填写课程名称' })
      }

      updateData.studentId = null
      updateData.courseTypeId = learningCourseType?._id || null
      updateData.externalTeacherName = nextExternalTeacherName
      updateData.externalCourseName = resolvedExternalCourseName
    } else {
      const nextStudentId = updateData.studentId || course.studentId
      const student = await Student.findById(nextStudentId)

      if (!student) {
        return res.status(404).json({ message: '学生不存在' })
      }

      if (user.role !== 'admin' && !canViewStudent(student, user)) {
        return res.status(403).json({ message: '无权限将课程分配给此学生' })
      }

      updateData.courseTypeId = await resolveCourseTypeForTeacher(student, user, updateData.courseTypeId || course.courseTypeId)
      updateData.externalTeacherName = ''
      updateData.externalCourseName = ''
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'plannedLessons')) {
      updateData.plannedLessons = normalizePlannedLessons(
        req.body.plannedLessons,
        normalizePlannedLessons(course.plannedLessons)
      )
    }
    
    if (req.body.startTime && new Date(req.body.startTime).getTime() !== new Date(course.startTime).getTime()) {
      updateData.reminderSent = false
      console.log('课程时间已修改，重置 reminderSent 为 false')
    }
    
    const updatedCourse = await Course.findByIdAndUpdate(id, updateData, { new: true })
    
    console.log('更新后的课程:', updatedCourse)
    
    res.json({
      message: '更新成功',
      data: updatedCourse
    })
  } catch (error) {
    console.error('更新课程错误:', error)
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message })
    }
    res.status(500).json({ message: '服务器错误' })
  }
}

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.userId)
    
    const course = await Course.findById(id)
    
    if (!course) {
      return res.status(404).json({ message: '课程不存在' })
    }
    
    if (user.role !== 'admin' && course.teacherId.toString() !== req.userId) {
      return res.status(403).json({ message: '无权限删除此课程' })
    }
    
    const lessonRecord = await LessonRecord.findOne({ courseId: id })
    if (lessonRecord) {
      const student = await Student.findById(lessonRecord.studentId)
      
      const recordTeacherId = lessonRecord.teacherId || course.teacherId
      const accountPaymentType = student ? await getEffectivePaymentType(student, recordTeacherId) : ''

      await rewardSettlementService.voidRewardSettlementByLessonRecordId({
        lessonRecordId: lessonRecord._id,
        voidedBy: user._id,
        voidReason: '删除课程自动回收关联上课积分奖励'
      })

      if (student && accountPaymentType === 'prepaid' && lessonRecord.isDeducted) {
        const studentIdStr = lessonRecord.studentId.toString()
        await LessonBalance.findOneAndUpdate(
          { studentId: studentIdStr, teacherId: recordTeacherId },
          { 
            $inc: { remainingLessons: lessonRecord.lessonsConsumed },
            $set: { lastUpdated: new Date() }
          },
          { upsert: true, setDefaultsOnInsert: true }
        )
        console.log('删除课程时返还课时:', lessonRecord.lessonsConsumed)
      }
      
      await LessonRecord.findByIdAndDelete(lessonRecord._id)
      console.log('删除课程时同步删除消课记录:', lessonRecord._id)
    }
    
    await Course.findByIdAndDelete(id)
    
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除课程错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const updateCoursesByGroup = async (req, res) => {
  try {
    const { groupId } = req.params
    const user = await User.findById(req.userId)
    
    if (!groupId) {
      return res.status(400).json({ message: 'groupId 不能为空' })
    }
    
    const filter = { groupId }
    
    if (user.role !== 'admin') {
      filter.teacherId = req.userId
    }
    
    const {
      studentId,
      courseTypeId,
      startTime,
      endTime,
      status,
      notes,
      plannedLessons,
      participationRole,
      externalTeacherName,
      externalCourseName
    } = req.body
    
    const updateData = {}
    if (studentId !== undefined) updateData.studentId = studentId
    if (courseTypeId !== undefined) updateData.courseTypeId = courseTypeId
    if (startTime !== undefined) updateData.startTime = startTime
    if (endTime !== undefined) updateData.endTime = endTime
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (plannedLessons !== undefined) updateData.plannedLessons = normalizePlannedLessons(plannedLessons)
    if (participationRole !== undefined) updateData.participationRole = normalizeParticipationRole(participationRole)
    if (externalTeacherName !== undefined) updateData.externalTeacherName = sanitizeOptionalText(externalTeacherName)
    if (externalCourseName !== undefined) updateData.externalCourseName = sanitizeOptionalText(externalCourseName)
    
    const result = await Course.updateMany(filter, updateData)
    
    res.json({
      message: `成功更新${result.modifiedCount}节课程`,
      data: { modifiedCount: result.modifiedCount }
    })
  } catch (error) {
    console.error('批量更新课程错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const deleteCoursesByGroup = async (req, res) => {
  try {
    const { groupId } = req.params
    const user = await User.findById(req.userId)
    
    if (!groupId) {
      return res.status(400).json({ message: 'groupId 不能为空' })
    }
    
    const filter = { groupId }
    
    if (user.role !== 'admin') {
      filter.teacherId = req.userId
    }
    
    const courses = await Course.find(filter)
    const courseIds = courses.map(c => c._id)
    
    const lessonRecords = await LessonRecord.find({ courseId: { $in: courseIds } })
    
    for (const record of lessonRecords) {
      const student = await Student.findById(record.studentId)
      
      const course = courses.find(item => item._id.toString() === record.courseId.toString())
      const recordTeacherId = record.teacherId || course?.teacherId
      const accountPaymentType = student ? await getEffectivePaymentType(student, recordTeacherId) : ''

      await rewardSettlementService.voidRewardSettlementByLessonRecordId({
        lessonRecordId: record._id,
        voidedBy: user._id,
        voidReason: '批量删除课程自动回收关联上课积分奖励'
      })

      if (student && accountPaymentType === 'prepaid' && record.isDeducted) {
        const studentIdStr = record.studentId.toString()
        await LessonBalance.findOneAndUpdate(
          { studentId: studentIdStr, teacherId: recordTeacherId },
          { 
            $inc: { remainingLessons: record.lessonsConsumed },
            $set: { lastUpdated: new Date() }
          },
          { upsert: true, setDefaultsOnInsert: true }
        )
      }
    }
    
    if (lessonRecords.length > 0) {
      await LessonRecord.deleteMany({ courseId: { $in: courseIds } })
      console.log('批量删除课程时同步删除消课记录:', lessonRecords.length, '条')
    }
    
    const result = await Course.deleteMany(filter)
    
    res.json({
      message: `成功删除${result.deletedCount}节课程`,
      data: { deletedCount: result.deletedCount }
    })
  } catch (error) {
    console.error('批量删除课程错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const rescheduleCourseGroup = async (req, res) => {
  try {
    const { groupId } = req.params
    const user = await User.findById(req.userId)
    
    if (!groupId) {
      return res.status(400).json({ message: 'groupId 不能为空' })
    }
    
    const {
      fromCourseId,
      newStartDate,
      newEndDate,
      newStartTime,
      duration,
      studentId,
      courseTypeId,
      notes,
      plannedLessons,
      externalTeacherName,
      externalCourseName
    } = req.body
    
    if (!newStartDate || !newEndDate || !newStartTime || !duration) {
      return res.status(400).json({ message: '缺少必要参数' })
    }
    
    const baseFilter = { groupId }
    if (user.role !== 'admin') {
      baseFilter.teacherId = req.userId
    }
    
    const allGroupCourses = await Course.find(baseFilter)
      .sort({ startTime: 1 })
      .populate('teacherId')
    
    if (allGroupCourses.length === 0) {
      return res.status(404).json({ message: '未找到课程组' })
    }
    
    const firstCourse = allGroupCourses[0]
    const groupParticipationRole = normalizeParticipationRole(firstCourse.participationRole)
    const groupIsLearningCourse = groupParticipationRole === COURSE_ROLE_STUDENT
    const nextExternalTeacherName = externalTeacherName !== undefined
      ? sanitizeOptionalText(externalTeacherName)
      : sanitizeOptionalText(firstCourse.externalTeacherName)
    let nextExternalCourseName = externalCourseName !== undefined
      ? sanitizeOptionalText(externalCourseName)
      : sanitizeOptionalText(firstCourse.externalCourseName)
    const plannedLessonsForGroup = plannedLessons === undefined
      ? undefined
      : normalizePlannedLessons(plannedLessons)
    const teacherId = firstCourse.teacherId?._id || firstCourse.teacherId
    const learningCourseTypeForGroup = groupIsLearningCourse
      ? await resolveCourseTypeForLearning(courseTypeId || firstCourse.courseTypeId)
      : null

    if (groupIsLearningCourse) {
      nextExternalCourseName = nextExternalCourseName || learningCourseTypeForGroup?.name || ''

      if (!nextExternalTeacherName) {
        return res.status(400).json({ message: '请填写授课老师' })
      }

      if (!nextExternalCourseName) {
        return res.status(400).json({ message: '请填写课程名称' })
      }
    }
    
    let startIndex = 0
    if (fromCourseId) {
      startIndex = allGroupCourses.findIndex(c => c._id.toString() === fromCourseId)
      if (startIndex === -1) {
        startIndex = 0
      }
    }
    
    const coursesBefore = allGroupCourses.slice(0, startIndex)
    const coursesToProcess = allGroupCourses.slice(startIndex)
    
    const startDate = new Date(newStartDate)
    const endDate = new Date(newEndDate)
    const [hours, minutes] = newStartTime.split(':').map(Number)
    
    const newDayOfWeek = startDate.getDay()
    
    const newDates = []
    let currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      if (currentDate.getDay() === newDayOfWeek) {
        newDates.push(new Date(currentDate))
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    const newCourseTimes = newDates.map(date => {
      const startTime = new Date(date)
      startTime.setHours(hours, minutes, 0, 0)
      const endTime = new Date(startTime.getTime() + duration * 60000)
      return { startTime, endTime }
    })
    
    let updatedCount = 0
    let createdCount = 0
    let deletedCount = 0
    
    const usedIndices = new Set()
    
    for (let i = 0; i < newCourseTimes.length; i++) {
      const { startTime, endTime } = newCourseTimes[i]
      
      const existingIndex = coursesToProcess.findIndex((c, idx) => {
        if (usedIndices.has(idx)) return false
        const existingStart = new Date(c.startTime)
        return existingStart.getTime() === startTime.getTime()
      })
      
      if (existingIndex !== -1) {
        usedIndices.add(existingIndex)
        const course = coursesToProcess[existingIndex]
        await Course.findByIdAndUpdate(course._id, {
          startTime,
          endTime,
          studentId: groupIsLearningCourse ? null : (studentId || course.studentId),
          courseTypeId: groupIsLearningCourse
            ? (courseTypeId ? learningCourseTypeForGroup?._id || null : course.courseTypeId)
            : (courseTypeId || course.courseTypeId),
          notes: notes !== undefined ? notes : course.notes,
          participationRole: groupParticipationRole,
          externalTeacherName: groupIsLearningCourse ? nextExternalTeacherName : '',
          externalCourseName: groupIsLearningCourse ? nextExternalCourseName : '',
          ...(plannedLessonsForGroup === undefined ? {} : { plannedLessons: plannedLessonsForGroup }),
          reminderSent: false
        })
        updatedCount++
      } else {
        const courseData = {
          studentId: groupIsLearningCourse ? null : (studentId || firstCourse.studentId),
          courseTypeId: groupIsLearningCourse
            ? (courseTypeId ? learningCourseTypeForGroup?._id || null : firstCourse.courseTypeId)
            : (courseTypeId || firstCourse.courseTypeId),
          teacherId: teacherId,
          startTime,
          endTime,
          status: 'normal',
          groupId: groupId,
          notes: notes !== undefined ? notes : firstCourse.notes,
          participationRole: groupParticipationRole,
          externalTeacherName: groupIsLearningCourse ? nextExternalTeacherName : '',
          externalCourseName: groupIsLearningCourse ? nextExternalCourseName : '',
          plannedLessons: plannedLessonsForGroup === undefined
            ? normalizePlannedLessons(firstCourse.plannedLessons)
            : plannedLessonsForGroup,
          reminderSent: false
        }
        await Course.create(courseData)
        createdCount++
      }
    }
    
    for (let i = 0; i < coursesToProcess.length; i++) {
      if (!usedIndices.has(i)) {
        await Course.findByIdAndDelete(coursesToProcess[i]._id)
        deletedCount++
      }
    }
    
    res.json({
      message: `成功修改课程组：更新${updatedCount}节，新增${createdCount}节，删除${deletedCount}节`,
      data: {
        updatedCount,
        createdCount,
        deletedCount,
        totalCourses: coursesBefore.length + newCourseTimes.length
      }
    })
  } catch (error) {
    console.error('批量修改课程组时间错误:', error)
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message })
    }
    res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  updateCoursesByGroup,
  deleteCoursesByGroup,
  rescheduleCourseGroup
}
