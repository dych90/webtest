const Course = require('../models/Course')
const Student = require('../models/Student')
const CourseType = require('../models/CourseType')
const User = require('../models/User')

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
      teacherId: user.role === 'admin' && req.body.teacherId ? req.body.teacherId : req.userId
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
    
    const updatedCourse = await Course.findByIdAndUpdate(id, req.body, { new: true })
    
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
    
    await Course.findByIdAndDelete(id)
    
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除课程错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse
}
