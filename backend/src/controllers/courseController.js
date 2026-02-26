const Course = require('../models/Course')
const Student = require('../models/Student')
const CourseType = require('../models/CourseType')

const getCourses = async (req, res) => {
  try {
    const { studentId, startTime, endTime } = req.query
    const filter = studentId ? { studentId } : {}
    
    if (startTime && endTime) {
      filter.startTime = {
        $gte: new Date(startTime),
        $lte: new Date(endTime)
      }
    }
    
    console.log('查询课程条件:', filter)
    
    const courses = await Course.find(filter)
      .sort({ startTime: -1 })
      .populate('studentId', 'name phone')
      .populate('courseTypeId', 'name duration')
    
    console.log('查询到的课程数量:', courses.length)
    console.log('查询到的课程:', courses.map(c => ({
      id: c._id,
      startTime: c.startTime,
      endTime: c.endTime
    })))
    
    res.json({
      message: '获取成功',
      data: courses
    })
  } catch (error) {
    console.error('获取课程列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const createCourse = async (req, res) => {
  try {
    const course = await Course.create(req.body)
    
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
    console.log('更新课程，ID:', id)
    console.log('更新课程数据:', req.body)
    
    const course = await Course.findByIdAndUpdate(id, req.body, { new: true })
    
    if (!course) {
      return res.status(404).json({ message: '课程不存在' })
    }
    
    console.log('更新后的课程:', course)
    
    res.json({
      message: '更新成功',
      data: course
    })
  } catch (error) {
    console.error('更新课程错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params
    await Course.findByIdAndDelete(id)
    
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除课程错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse
}
