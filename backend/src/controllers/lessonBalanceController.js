const LessonBalance = require('../models/LessonBalance')
const Student = require('../models/Student')

const getLessonBalances = async (req, res) => {
  try {
    const { studentId } = req.query
    
    const students = await Student.find(studentId ? { _id: studentId } : {})
      .sort({ createdAt: -1 })
    
    const balances = await LessonBalance.find({})
    
    const result = students.map(student => {
      const balance = balances.find(b => b.studentId.toString() === student._id.toString())
      return {
        studentId: student,
        remainingLessons: balance ? balance.remainingLessons : 0,
        lastUpdated: balance ? balance.lastUpdated : student.createdAt,
        _id: balance ? balance._id : null
      }
    })
    
    res.json({
      message: '获取成功',
      data: result
    })
  } catch (error) {
    console.error('获取课费余额列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const updateLessonBalance = async (req, res) => {
  try {
    const { studentId, remainingLessons } = req.body
    
    const student = await Student.findById(studentId)
    
    if (student && student.paymentType !== 'prepaid') {
      return res.status(400).json({ message: '单次付费模式的学生不能更新课时余额' })
    }
    
    const balance = await LessonBalance.findOne({ studentId })
    
    if (balance) {
      balance.remainingLessons = remainingLessons
      balance.lastUpdated = new Date()
      await balance.save()
    } else {
      await LessonBalance.create({
        studentId,
        remainingLessons,
        lastUpdated: new Date()
      })
    }
    
    res.json({
      message: '更新成功',
      data: { studentId, remainingLessons }
    })
  } catch (error) {
    console.error('更新课费余额错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = {
  getLessonBalances,
  updateLessonBalance
}
