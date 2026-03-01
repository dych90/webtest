const LessonRecord = require('../models/LessonRecord')
const LessonBalance = require('../models/LessonBalance')
const Student = require('../models/Student')
const Course = require('../models/Course')
const Payment = require('../models/Payment')
const FeeStandard = require('../models/FeeStandard')
const User = require('../models/User')
const mongoose = require('mongoose')

const getLessonRecords = async (req, res) => {
  try {
    const { studentId, courseId } = req.query
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'
    
    let filter = {}
    if (studentId) {
      filter.studentId = studentId
    }
    if (courseId) {
      filter.courseId = courseId
    }
    
    if (isTeacher) {
      const students = await Student.find({ teacherId: req.userId })
      const studentIds = students.map(s => s._id)
      filter.studentId = studentId && studentIds.includes(studentId) ? studentId : { $in: studentIds }
    }
    
    const lessonRecords = await LessonRecord.find(filter)
      .sort({ recordDate: -1 })
      .populate('studentId', 'name phone')
      .populate('courseId', 'startTime endTime')
    
    res.json({
      message: '获取成功',
      data: lessonRecords
    })
  } catch (error) {
    console.error('获取消课记录错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const getLessonRecordById = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'
    
    const record = await LessonRecord.findById(id)
      .populate('studentId', 'name phone')
      .populate('courseId', 'startTime endTime')
    
    if (!record) {
      return res.status(404).json({ message: '消课记录不存在' })
    }
    
    if (isTeacher) {
      const student = await Student.findById(record.studentId._id || record.studentId)
      if (!student || student.teacherId?.toString() !== req.userId) {
        return res.status(403).json({ message: '无权限查看此消课记录' })
      }
    }
    
    res.json({
      message: '获取成功',
      data: record
    })
  } catch (error) {
    console.error('获取消课记录详情错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const createLessonRecord = async (req, res) => {
  try {
    console.log('创建消课记录，请求体:', req.body)
    
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'
    
    const student = await Student.findById(req.body.studentId)
    
    if (!student) {
      return res.status(404).json({ message: '学生不存在' })
    }
    
    if (isTeacher && student.teacherId.toString() !== req.userId) {
      return res.status(403).json({ message: '无权限为此学生创建消课记录' })
    }
    
    let unitPrice = 0
    let isGiftLesson = false
    
    if (student.paymentType === 'prepaid') {
      const paymentInfo = await calculateUnitPriceAndGiftStatus(req.body.studentId, req.body.lessonsConsumed || 1)
      unitPrice = paymentInfo.unitPrice
      isGiftLesson = paymentInfo.isGiftLesson
      console.log('预付费学生 - 单价:', unitPrice, '是否赠课:', isGiftLesson)
    } else if (student.paymentType === 'payPerLesson') {
      let courseTypeId = null
      if (req.body.courseId) {
        const course = await Course.findById(req.body.courseId)
        if (course) {
          courseTypeId = course.courseTypeId
        }
      }
      
      if (courseTypeId) {
        const feeStandard = await FeeStandard.findOne({
          courseTypeId: courseTypeId,
          $or: [
            { studentId: student._id },
            { studentId: { $exists: false } }
          ]
        }).sort({ studentId: -1, effectiveDate: -1 })
        
        if (feeStandard) {
          unitPrice = feeStandard.price
        }
      }
    }
    
    const lessonRecordData = {
      ...req.body,
      unitPrice,
      isGiftLesson
    }
    
    const lessonRecord = await LessonRecord.create(lessonRecordData)
    console.log('创建消课记录成功:', lessonRecord)
    console.log('isDeducted:', lessonRecord.isDeducted, 'lessonsConsumed:', lessonRecord.lessonsConsumed)
    
    if (req.body.courseId) {
      await Course.findByIdAndUpdate(req.body.courseId, { isGiftLesson })
      console.log('更新课程赠课标记:', req.body.courseId, isGiftLesson)
    }
    
    if (student.paymentType === 'prepaid') {
      const studentIdStr = lessonRecord.studentId._id ? lessonRecord.studentId._id.toString() : lessonRecord.studentId.toString()
      if (lessonRecord.isDeducted) {
        console.log('扣减课时:', studentIdStr, -lessonRecord.lessonsConsumed)
        await updateLessonBalance(studentIdStr, -lessonRecord.lessonsConsumed)
      } else {
        console.log('增加课时:', studentIdStr, lessonRecord.lessonsConsumed)
        await updateLessonBalance(studentIdStr, lessonRecord.lessonsConsumed)
      }
    } else if (student.paymentType === 'payPerLesson' && lessonRecord.isDeducted) {
      console.log('单次付费学生上课，创建缴费记录')
      
      if (unitPrice > 0) {
        await Payment.create({
          studentId: lessonRecord.studentId,
          paymentType: '现金',
          amount: unitPrice * lessonRecord.lessonsConsumed,
          totalLessons: 0,
          bonusLessons: 0,
          paymentDate: new Date(),
          notes: `单次付费 - ${lessonRecord.lessonsConsumed}节课`
        })
        console.log('已创建缴费记录，金额:', unitPrice * lessonRecord.lessonsConsumed)
      } else {
        console.log('未找到收费标准，无法创建缴费记录')
      }
    } else {
      console.log('学生为单次付费模式，不扣减课时')
    }
    
    res.json({
      message: '创建成功',
      data: lessonRecord
    })
  } catch (error) {
    console.error('创建消课记录错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const calculateUnitPriceAndGiftStatus = async (studentId, lessonsToConsume = 1) => {
  try {
    const payments = await Payment.find({ studentId }).sort({ paymentDate: 1 })
    
    if (payments.length === 0) {
      return { unitPrice: 0, isGiftLesson: false }
    }
    
    const lessonRecords = await LessonRecord.find({ 
      studentId, 
      isDeducted: true 
    }).sort({ recordDate: 1 })
    
    const totalConsumed = lessonRecords.reduce((sum, r) => sum + r.lessonsConsumed, 0)
    
    let accumulatedLessons = 0
    let accumulatedPaidLessons = 0
    let currentPayment = null
    
    for (const payment of payments) {
      const paidLessons = payment.totalLessons || 0
      const bonusLessons = payment.bonusLessons || 0
      const paymentTotalLessons = paidLessons + bonusLessons
      
      if (totalConsumed < accumulatedLessons + paymentTotalLessons) {
        currentPayment = payment
        break
      }
      accumulatedLessons += paymentTotalLessons
      accumulatedPaidLessons += paidLessons
    }
    
    if (!currentPayment && payments.length > 0) {
      currentPayment = payments[payments.length - 1]
    }
    
    if (!currentPayment) {
      return { unitPrice: 0, isGiftLesson: false }
    }
    
    const paidLessons = currentPayment.totalLessons || 0
    const bonusLessons = currentPayment.bonusLessons || 0
    
    let unitPrice = 0
    if (paidLessons > 0) {
      unitPrice = currentPayment.amount / paidLessons
    }
    
    const consumedInCurrentPayment = totalConsumed - accumulatedLessons
    const isGiftLesson = consumedInCurrentPayment >= paidLessons && bonusLessons > 0
    
    console.log('计算单价和赠课状态:', {
      studentId,
      totalConsumed,
      accumulatedLessons,
      currentPayment: {
        amount: currentPayment.amount,
        paidLessons,
        bonusLessons,
        totalLessons: paidLessons + bonusLessons
      },
      consumedInCurrentPayment,
      unitPrice: Math.round(unitPrice * 100) / 100,
      isGiftLesson
    })
    
    return { unitPrice: Math.round(unitPrice * 100) / 100, isGiftLesson }
  } catch (error) {
    console.error('计算单价和赠课状态错误:', error)
    return { unitPrice: 0, isGiftLesson: false }
  }
}

const updateLessonRecord = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'
    
    const oldRecord = await LessonRecord.findById(id).populate('studentId')
    
    if (!oldRecord) {
      return res.status(404).json({ message: '消课记录不存在' })
    }
    
    if (isTeacher && oldRecord.studentId.teacherId?.toString() !== req.userId) {
      return res.status(403).json({ message: '无权限修改此消课记录' })
    }
    
    const lessonRecord = await LessonRecord.findByIdAndUpdate(id, req.body, { new: true })
    
    const student = await Student.findById(oldRecord.studentId._id)
    
    if (student && student.paymentType === 'prepaid') {
      const studentIdStr = oldRecord.studentId._id ? oldRecord.studentId._id.toString() : oldRecord.studentId.toString()
      if (oldRecord.isDeducted && !req.body.isDeducted) {
        await updateLessonBalance(studentIdStr, oldRecord.lessonsConsumed)
      } else if (!oldRecord.isDeducted && req.body.isDeducted) {
        await updateLessonBalance(studentIdStr, -req.body.lessonsConsumed)
      }
    }
    
    res.json({
      message: '更新成功',
      data: lessonRecord
    })
  } catch (error) {
    console.error('更新消课记录错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const deleteLessonRecord = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'
    
    const record = await LessonRecord.findById(id).populate('studentId')
    
    if (!record) {
      return res.status(404).json({ message: '消课记录不存在' })
    }
    
    if (isTeacher && record.studentId.teacherId?.toString() !== req.userId) {
      return res.status(403).json({ message: '无权限删除此消课记录' })
    }
    
    const student = await Student.findById(record.studentId._id)
    
    const studentIdStr = record.studentId._id ? record.studentId._id.toString() : record.studentId.toString()
    
    if (student && student.paymentType === 'prepaid' && record.isDeducted) {
      await updateLessonBalance(studentIdStr, record.lessonsConsumed)
    } else if (student && student.paymentType === 'payPerLesson' && record.isDeducted) {
      console.log('删除单次付费学生的消课记录，查找并删除对应的缴费记录')
      
      const payment = await Payment.findOne({
        studentId: record.studentId._id,
        notes: { $regex: `单次付费 - ${record.lessonsConsumed}节课`, $options: 'i' }
      })
      
      if (payment) {
        console.log('找到对应的缴费记录，删除:', payment._id)
        await Payment.findByIdAndDelete(payment._id)
      } else {
        console.log('未找到对应的缴费记录')
      }
    }
    
    if (record.courseId) {
      await Course.findByIdAndUpdate(record.courseId, { isGiftLesson: false })
      console.log('重置课程赠课标记:', record.courseId)
    }
    
    await LessonRecord.findByIdAndDelete(id)
    
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除消课记录错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const updateLessonBalance = async (studentId, lessonsChange) => {
  try {
    console.log('updateLessonBalance 调用 - studentId:', studentId, 'lessonsChange:', lessonsChange)
    
    const mongoose = require('mongoose')
    let studentObjectId
    try {
      studentObjectId = new mongoose.Types.ObjectId(studentId)
    } catch (e) {
      console.error('无效的 studentId:', studentId)
      return
    }
    
    const balance = await LessonBalance.findOne({ studentId: studentObjectId })
    console.log('查找到的余额记录:', balance)
    
    if (balance) {
      balance.remainingLessons += lessonsChange
      balance.lastUpdated = new Date()
      await balance.save()
      console.log('更新后余额:', balance.remainingLessons)
    } else {
      const newBalance = await LessonBalance.create({
        studentId: studentObjectId,
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
  getLessonRecords,
  getLessonRecordById,
  createLessonRecord,
  updateLessonRecord,
  deleteLessonRecord
}
