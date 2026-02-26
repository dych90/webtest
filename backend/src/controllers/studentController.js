const Student = require('../models/Student')

const getStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .sort({ createdAt: -1 })
      .populate('defaultCourseTypeId', 'name duration')
    
    res.json({
      message: '获取成功',
      data: students
    })
  } catch (error) {
    console.error('获取学生列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const createStudent = async (req, res) => {
  try {
    const student = await Student.create(req.body)
    
    res.json({
      message: '创建成功',
      data: student
    })
  } catch (error) {
    console.error('创建学生错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const updateStudent = async (req, res) => {
  try {
    const { id } = req.params
    const student = await Student.findByIdAndUpdate(id, req.body, { new: true })
    
    if (!student) {
      return res.status(404).json({ message: '学生不存在' })
    }
    
    res.json({
      message: '更新成功',
      data: student
    })
  } catch (error) {
    console.error('更新学生错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params
    await Student.findByIdAndDelete(id)
    
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除学生错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent
}
