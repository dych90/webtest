const Payment = require('../models/Payment')
const Student = require('../models/Student')
const LessonBalance = require('../models/LessonBalance')
const User = require('../models/User')

const getPayments = async (req, res) => {
  try {
    const { studentId } = req.query
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'
    
    let filter = {}
    if (studentId) {
      filter.studentId = studentId
    }
    
    if (isTeacher) {
      const students = await Student.find({ teacherId: req.userId })
      const studentIds = students.map(s => s._id)
      filter.studentId = studentId && studentIds.includes(studentId) ? studentId : { $in: studentIds }
    }
    
    const payments = await Payment.find(filter).sort({ paymentDate: -1 }).populate('studentId', 'name phone paymentType')
    
    res.json({
      message: '获取成功',
      data: payments
    })
  } catch (error) {
    console.error('获取缴费列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'
    
    const payment = await Payment.findById(id).populate('studentId', 'name phone paymentType')
    
    if (!payment) {
      return res.status(404).json({ message: '缴费记录不存在' })
    }
    
    if (isTeacher) {
      const student = await Student.findById(payment.studentId._id || payment.studentId)
      if (!student || student.teacherId?.toString() !== req.userId) {
        return res.status(403).json({ message: '无权限查看此缴费记录' })
      }
    }
    
    res.json({
      message: '获取成功',
      data: payment
    })
  } catch (error) {
    console.error('获取缴费详情错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const createPayment = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'
    
    const student = await Student.findById(req.body.studentId)
    
    if (!student) {
      return res.status(404).json({ message: '学生不存在' })
    }
    
    if (isTeacher && student.teacherId.toString() !== req.userId) {
      return res.status(403).json({ message: '无权限为此学生创建缴费记录' })
    }
    
    const payment = await Payment.create(req.body)
    
    if (student.paymentType === 'prepaid') {
      console.log('创建缴费记录:', payment)
      console.log('准备更新课费余额，学生ID:', payment.studentId, '课时变化:', payment.totalLessons + payment.bonusLessons)
      await updateLessonBalance(payment.studentId, payment.totalLessons + payment.bonusLessons)
    } else {
      console.log('学生为单次付费模式，不更新课时余额')
    }
    
    res.json({
      message: '创建成功',
      data: payment
    })
  } catch (error) {
    console.error('创建缴费记录错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const updatePayment = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'
    
    const oldPayment = await Payment.findById(id).populate('studentId')
    
    if (!oldPayment) {
      return res.status(404).json({ message: '缴费记录不存在' })
    }
    
    if (isTeacher && oldPayment.studentId.teacherId?.toString() !== req.userId) {
      return res.status(403).json({ message: '无权限修改此缴费记录' })
    }
    
    const payment = await Payment.findByIdAndUpdate(id, req.body, { new: true })
    
    const student = await Student.findById(payment.studentId)
    
    if (student && student.paymentType === 'prepaid' && oldPayment) {
      const lessonsChange = (payment.totalLessons + payment.bonusLessons) - (oldPayment.totalLessons + oldPayment.bonusLessons)
      await updateLessonBalance(payment.studentId, lessonsChange)
    }
    
    res.json({
      message: '更新成功',
      data: payment
    })
  } catch (error) {
    console.error('更新缴费记录错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const deletePayment = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'
    
    const payment = await Payment.findById(id).populate('studentId')
    
    if (!payment) {
      return res.status(404).json({ message: '缴费记录不存在' })
    }
    
    if (isTeacher && payment.studentId.teacherId?.toString() !== req.userId) {
      return res.status(403).json({ message: '无权限删除此缴费记录' })
    }
    
    const student = await Student.findById(payment.studentId._id)
    
    if (student && student.paymentType === 'prepaid') {
      await updateLessonBalance(payment.studentId, -(payment.totalLessons + payment.bonusLessons))
    }
    
    await Payment.findByIdAndDelete(id)
    
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除缴费记录错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const updateLessonBalance = async (studentId, lessonsChange) => {
  try {
    console.log('updateLessonBalance调用，学生ID:', studentId, '课时变化:', lessonsChange)
    const balance = await LessonBalance.findOne({ studentId })
    
    console.log('找到的余额记录:', balance)
    
    if (balance) {
      const oldRemaining = balance.remainingLessons
      balance.remainingLessons += lessonsChange
      balance.lastUpdated = new Date()
      await balance.save()
      console.log('更新余额，从', oldRemaining, '到', balance.remainingLessons)
    } else {
      const newBalance = await LessonBalance.create({
        studentId,
        remainingLessons: Math.max(0, lessonsChange),
        lastUpdated: new Date()
      })
      console.log('创建新余额记录:', newBalance)
    }
  } catch (error) {
    console.error('更新课费余额错误:', error)
  }
}

module.exports = {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment
}
