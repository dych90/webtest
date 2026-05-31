const Course = require('../models/Course')
const Student = require('../models/Student')
const CourseType = require('../models/CourseType')
const User = require('../models/User')
const LessonRecord = require('../models/LessonRecord')
const LessonBalance = require('../models/LessonBalance')

const getCourses = async (req, res) => {
  try {
    const { studentId, startTime, endTime, teacherId } = req.query
    const user = await User.findById(req.userId)
    
    console.log('课程查询参数:', req.query)
    console.log('当前用户ID:', req.userId, '角色:', user?.role)
    
    const filter = {}
    
    if (user && user.role !== 'admin') {
      filter.teacherId = req.userId
    } else if (user && user.role === 'admin' && teacherId) {
      filter.teacherId = teacherId
    }
    
    if (studentId) {
      filter.studentId = studentId
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
      .populate('studentId', 'name phone')
      .populate('courseTypeId', 'name duration')
      .populate('teacherId', 'name username')
    
    console.log('查询到的课程数量:', courses.length)
    
    res.json({
      message: '获取成功',
      data: courses
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
      .populate('studentId', 'name phone')
      .populate('courseTypeId', 'name duration')
      .populate('teacherId', 'name username')
    
    if (!course) {
      return res.status(404).json({ message: '课程不存在' })
    }
    
    const courseTeacherId = course.teacherId?._id?.toString() || course.teacherId?.toString()
    
    if (user.role !== 'admin' && courseTeacherId !== req.userId.toString()) {
      return res.status(403).json({ message: '无权限查看此课程' })
    }
    
    res.json({
      message: '获取成功',
      data: course
    })
  } catch (error) {
    console.error('获取课程详情错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const createCourse = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    
    const courseData = {
      ...req.body,
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
      
      if (student && student.paymentType === 'prepaid' && lessonRecord.isDeducted) {
        const studentIdStr = lessonRecord.studentId.toString()
        await LessonBalance.findOneAndUpdate(
          { studentId: studentIdStr },
          { 
            $inc: { remainingLessons: lessonRecord.lessonsConsumed },
            $set: { lastUpdated: new Date() }
          }
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
    
    const { studentId, courseTypeId, startTime, endTime, status, notes } = req.body
    
    const updateData = {}
    if (studentId !== undefined) updateData.studentId = studentId
    if (courseTypeId !== undefined) updateData.courseTypeId = courseTypeId
    if (startTime !== undefined) updateData.startTime = startTime
    if (endTime !== undefined) updateData.endTime = endTime
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    
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
      
      if (student && student.paymentType === 'prepaid' && record.isDeducted) {
        const studentIdStr = record.studentId.toString()
        await LessonBalance.findOneAndUpdate(
          { studentId: studentIdStr },
          { 
            $inc: { remainingLessons: record.lessonsConsumed },
            $set: { lastUpdated: new Date() }
          }
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
      notes
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
    const teacherId = firstCourse.teacherId?._id || firstCourse.teacherId
    
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
          studentId: studentId || course.studentId,
          courseTypeId: courseTypeId || course.courseTypeId,
          notes: notes !== undefined ? notes : course.notes,
          reminderSent: false
        })
        updatedCount++
      } else {
        const courseData = {
          studentId: studentId || firstCourse.studentId,
          courseTypeId: courseTypeId || firstCourse.courseTypeId,
          teacherId: teacherId,
          startTime,
          endTime,
          status: 'normal',
          groupId: groupId,
          notes: notes !== undefined ? notes : firstCourse.notes,
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
