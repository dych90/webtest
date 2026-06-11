const LessonRecord = require('../models/LessonRecord')
const LessonBalance = require('../models/LessonBalance')
const Student = require('../models/Student')
const Course = require('../models/Course')
const CourseType = require('../models/CourseType')
const Payment = require('../models/Payment')
const FeeStandard = require('../models/FeeStandard')
const User = require('../models/User')
const GuardianBinding = require('../models/GuardianBinding')
const { verifyToken } = require('../utils/jwt')
const { sendSubscribeMessage, formatTime } = require('../utils/wechat')
const mongoose = require('mongoose')
const path = require('path')
const fs = require('fs')
const ObjectId = mongoose.Types.ObjectId
const MEDIA_ROOT = path.resolve(__dirname, '../../uploads/lesson-record-media')

const safeText = (value, maxLength = 20) => {
  const text = (value || '').toString().replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

const sanitizeMediaItems = (mediaItems) => {
  if (!Array.isArray(mediaItems)) return []

  return mediaItems
    .slice(0, 12)
    .map((item) => {
      if (!item || !item.id || !item.fileKey || !['image', 'audio'].includes(item.type)) {
        return null
      }

      const fileKey = path.basename(item.fileKey.toString())
      if (fileKey !== item.fileKey) {
        return null
      }

      return {
        id: item.id.toString(),
        type: item.type,
        fileKey,
        url: `/lesson-records/media/${item.id}`,
        originalName: item.originalName || '',
        mimeType: item.mimeType || '',
        size: Number(item.size) || 0,
        duration: Number(item.duration) || 0,
        createdAt: item.createdAt || new Date()
      }
    })
    .filter(Boolean)
}

const buildLessonRecordNotifyData = (lessonRecord, student, courseType) => {
  const mediaCount = Array.isArray(lessonRecord.mediaItems) ? lessonRecord.mediaItems.length : 0
  const summaryParts = []
  const courseTypeName = courseType?.name || '课程'

  summaryParts.push(courseTypeName)
  if (lessonRecord.lessonContent) {
    summaryParts.push('有文字')
  }
  if (mediaCount > 0) {
    summaryParts.push(`${mediaCount}个素材`)
  }

  return {
    time2: {
      value: formatTime(lessonRecord.recordDate || new Date())
    },
    thing11: {
      value: safeText(student?.name || '学生')
    },
    thing12: {
      value: safeText(summaryParts.join(' ') || '课后记录')
    },
    phrase16: {
      value: '课后记录'
    }
  }
}

const sendLessonRecordNotification = async (lessonRecord, student, courseType) => {
  const bindings = await GuardianBinding.find({
    studentId: student._id,
    status: 'active'
  })

  const openIds = [...new Set(bindings.map(binding => binding.openId).filter(Boolean))]
  const result = {
    total: openIds.length,
    success: 0,
    failed: 0
  }

  if (openIds.length === 0) {
    return result
  }

  const messageData = buildLessonRecordNotifyData(lessonRecord, student, courseType)
  const page = `pages/guardian/records?studentId=${student._id}&recordId=${lessonRecord._id}`

  for (const openId of openIds) {
    try {
      await sendSubscribeMessage(openId, messageData, page)
      result.success += 1
    } catch (error) {
      result.failed += 1
      console.error(`发送课后记录订阅消息失败 openId=${openId}:`, error.message)
    }
  }

  return result
}

const canUserAccessRecord = async (decoded, record) => {
  if (decoded.type === 'guardian') {
    const binding = await GuardianBinding.findOne({
      openId: decoded.openId,
      studentId: record.studentId?._id || record.studentId,
      status: 'active'
    })
    return Boolean(binding)
  }

  if (decoded.type && decoded.type !== 'user') {
    return false
  }

  const user = await User.findById(decoded.userId)
  if (!user) return false
  if (user.role === 'admin') return true

  const student = record.studentId?._id ? record.studentId : await Student.findById(record.studentId)
  return student?.teacherId?.toString() === decoded.userId?.toString()
}

const getLessonRecords = async (req, res) => {
  try {
    const { studentId, courseId } = req.query
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'
    
    let filter = {}
    if (courseId) {
      filter.courseId = courseId
    }
    
    if (isTeacher) {
      const students = await Student.find({ teacherId: req.userId })
      const studentIds = students.map(s => s._id.toString())
      
      if (studentId) {
        if (studentIds.includes(studentId)) {
          filter.studentId = studentId
        } else {
          return res.json({ message: '获取成功', data: [] })
        }
      } else {
        filter.studentId = { $in: students.map(s => s._id) }
      }
    } else {
      if (studentId) {
        filter.studentId = studentId
      }
    }
    
    const lessonRecords = await LessonRecord.find(filter)
      .sort({ recordDate: -1 })
      .populate('studentId', 'name phone paymentType')
      .populate('courseId', 'startTime endTime')
      .populate('courseTypeId', 'name duration')
    
    // 获取学生剩余课时
    const studentIds = [...new Set(lessonRecords.map(r => r.studentId?._id).filter(Boolean))]
    const balances = await LessonBalance.find({ studentId: { $in: studentIds } })
    const balanceMap = {}
    balances.forEach(b => { balanceMap[b.studentId.toString()] = b.remainingLessons })
    
    // 将remainingLessons添加到返回数据中
    const recordsWithBalance = lessonRecords.map(r => {
      const record = r.toObject()
      if (record.studentId) {
        const studentIdStr = record.studentId._id.toString()
        record.studentId.remainingLessons = balanceMap[studentIdStr] || 0
      }
      return record
    })
    
    res.json({
      message: '获取成功',
      data: recordsWithBalance
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
      .populate('courseTypeId', 'name duration')
    
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

const uploadLessonRecordMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '未上传文件' })
    }

    const mediaType = req.body.mediaType
    if (!['image', 'audio'].includes(mediaType)) {
      fs.unlink(req.file.path, () => {})
      return res.status(400).json({ message: '不支持的媒体类型' })
    }

    const mediaId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const fileKey = path.basename(req.file.filename)
    const mediaItem = {
      id: mediaId,
      type: mediaType,
      fileKey,
      url: `/lesson-records/media/${mediaId}`,
      originalName: req.file.originalname || '',
      mimeType: req.file.mimetype || '',
      size: req.file.size || 0,
      duration: Number(req.body.duration) || 0,
      createdAt: new Date()
    }

    res.json({
      message: '上传成功',
      data: mediaItem
    })
  } catch (error) {
    console.error('上传课后记录媒体失败:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const getLessonRecordMedia = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ message: '未提供认证令牌' })
    }

    let decoded
    try {
      decoded = verifyToken(token)
    } catch (error) {
      return res.status(401).json({ message: '无效的认证令牌' })
    }
    const { mediaId } = req.params
    const record = await LessonRecord.findOne({ 'mediaItems.id': mediaId })
      .populate('studentId', 'name teacherId')

    if (!record) {
      return res.status(404).json({ message: '媒体不存在' })
    }

    const hasAccess = await canUserAccessRecord(decoded, record)
    if (!hasAccess) {
      return res.status(403).json({ message: '无权限查看此媒体' })
    }

    const mediaItem = record.mediaItems.find(item => item.id === mediaId)
    if (!mediaItem) {
      return res.status(404).json({ message: '媒体不存在' })
    }

    if (!mediaItem.fileKey) {
      return res.status(404).json({ message: '媒体不存在' })
    }

    const fileKey = path.basename(mediaItem.fileKey)
    if (fileKey !== mediaItem.fileKey) {
      return res.status(404).json({ message: '媒体不存在' })
    }

    const filePath = path.resolve(MEDIA_ROOT, fileKey)
    const relativePath = path.relative(MEDIA_ROOT, filePath)
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: '媒体文件不存在' })
    }

    res.setHeader('Content-Type', mediaItem.mimeType || 'application/octet-stream')
    res.sendFile(filePath)
  } catch (error) {
    console.error('读取课后记录媒体失败:', error)
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
      let courseTypeId = req.body.courseTypeId
      console.log('========== 单次付费学生处理 ==========')
      console.log('学生ID:', req.body.studentId)
      console.log('课程类型ID:', courseTypeId)
      console.log('课程类型ID类型:', typeof courseTypeId)

      if (courseTypeId) {
        console.log('正在查找收费标准...')
        const query = {
          courseTypeId: courseTypeId,
          $or: [
            { studentId: student._id },
            { studentId: { $exists: false } }
          ]
        }
        console.log('查询条件:', JSON.stringify(query, (key, value) =>
          value instanceof ObjectId ? value.toString() : value
        ))

        const feeStandard = await FeeStandard.findOne(query).sort({ studentId: -1, effectiveDate: -1 })

        if (feeStandard) {
          unitPrice = feeStandard.price
          console.log('✅ 找到收费标准:', {
            _id: feeStandard._id,
            price: feeStandard.price,
            courseTypeId: feeStandard.courseTypeId,
            studentId: feeStandard.studentId,
            effectiveDate: feeStandard.effectiveDate
          })
        } else {
          console.log('❌ 未找到收费标准')
          console.log('提示：请确认已在收费标准中配置该课程类型的单价')
        }
      } else {
        console.log('❌ 未提供课程类型ID (courseTypeId)')
      }
    } else if (student.paymentType === 'free') {
      console.log('免费学生 - 不计算单价，不扣课时，不创建缴费记录')
    }
    
    const lessonRecordData = {
      ...req.body,
      mediaItems: sanitizeMediaItems(req.body.mediaItems),
      unitPrice,
      isGiftLesson,
      isDeducted: req.body.isDeducted === true || req.body.isDeducted === 'true'
    }
    
    const lessonRecord = await LessonRecord.create(lessonRecordData)
    console.log('创建消课记录成功:', lessonRecord)
    console.log('isDeducted:', lessonRecord.isDeducted, 'lessonsConsumed:', lessonRecord.lessonsConsumed)
    
    if (req.body.courseId) {
      const courseUpdate = { isGiftLesson }
      if (lessonRecordData.isDeducted) {
        courseUpdate.status = 'completed'
      }
      await Course.findByIdAndUpdate(req.body.courseId, courseUpdate)
      console.log('更新课程状态:', req.body.courseId, courseUpdate)
    } else if (req.body.courseStartTime) {
      const courseStartTime = new Date(req.body.courseStartTime)
      const duration = 60
      const courseEndTime = new Date(courseStartTime.getTime() + duration * 60 * 1000)
      
      const newCourse = await Course.create({
        studentId: req.body.studentId,
        courseTypeId: req.body.courseTypeId,
        startTime: courseStartTime,
        endTime: courseEndTime,
        status: lessonRecordData.isDeducted ? 'completed' : 'normal',
        isGiftLesson: isGiftLesson,
        teacherId: student.teacherId || req.userId,
        fromLessonRecord: true
      })
      
      lessonRecord.courseId = newCourse._id
      await lessonRecord.save()
      console.log('自动创建课程记录:', newCourse._id)
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
      console.log('========== 单次付费学生创建缴费记录 ==========')
      console.log('unitPrice:', unitPrice)
      console.log('lessonsConsumed:', lessonRecord.lessonsConsumed)
      console.log('计算金额:', unitPrice * lessonRecord.lessonsConsumed)

      if (unitPrice > 0) {
        const paymentData = {
          studentId: lessonRecord.studentId,
          paymentType: '微信',
          amount: unitPrice * lessonRecord.lessonsConsumed,
          totalLessons: 0,
          bonusLessons: 0,
          paymentDate: new Date(),
          notes: `单次付费 - ${lessonRecord.lessonsConsumed}节课`
        }
        console.log('准备创建缴费记录:', paymentData)

        const newPayment = await Payment.create(paymentData)
        console.log('✅ 缴费记录创建成功！')
        console.log('缴费记录ID:', newPayment._id)
        console.log('缴费金额:', newPayment.amount)
        console.log('缴费日期:', newPayment.paymentDate)

        lessonRecord.paymentId = newPayment._id
        await lessonRecord.save()
        console.log('✅ 已将paymentId保存到消课记录:', lessonRecord._id)
      } else {
        console.log('❌ unitPrice 为 0，无法创建缴费记录')
        console.log('可能原因：')
        console.log('1. 未找到对应的收费标准 (FeeStandard)')
        console.log('2. courseTypeId 未正确传递')
        console.log('3. 数据库中该课程类型没有配置价格')
      }
    } else {
      if (lessonRecord.isDeducted) {
        console.log('学生为免费模式，不创建缴费记录')
      } else {
        console.log('学生未标记为已上课，不创建缴费记录')
      }
    }
    
    let notifyResult = null
    if (req.body.notifyGuardian === true || req.body.notifyGuardian === 'true') {
      try {
        const courseType = req.body.courseTypeId ? await CourseType.findById(req.body.courseTypeId) : null
        notifyResult = await sendLessonRecordNotification(lessonRecord, student, courseType)
        console.log('课后记录订阅消息发送结果:', notifyResult)
      } catch (notifyError) {
        notifyResult = { total: 0, success: 0, failed: 1, error: notifyError.message }
        console.error('课后记录订阅消息发送异常:', notifyError.message)
      }
    }

    res.json({
      message: '创建成功',
      data: lessonRecord,
      notifyResult
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
    
    if (req.body.courseId || oldRecord.courseId) {
      const courseId = req.body.courseId || oldRecord.courseId
      const courseUpdate = { isGiftLesson: lessonRecord.isGiftLesson }
      if (lessonRecord.isDeducted) {
        courseUpdate.status = 'completed'
      } else {
        courseUpdate.status = 'normal'
      }
      await Course.findByIdAndUpdate(courseId, courseUpdate)
      console.log('更新消课记录时同步课程状态:', courseId, courseUpdate)
    }
    
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

      if (record.paymentId) {
        console.log('✅ 找到关联的paymentId:', record.paymentId)
        const deletedPayment = await Payment.findByIdAndDelete(record.paymentId)
        if (deletedPayment) {
          console.log('✅ 成功删除对应的缴费记录:', {
            _id: deletedPayment._id,
            amount: deletedPayment.amount,
            notes: deletedPayment.notes
          })
        } else {
          console.log('⚠️ paymentId存在但未找到对应的缴费记录，可能已被删除')
        }
      } else {
        console.log('⚠️ 该消课记录没有关联的paymentId（可能是旧数据），尝试通过notes字段查找')
        const payment = await Payment.findOne({
          studentId: record.studentId._id,
          notes: { $regex: `单次付费 - ${record.lessonsConsumed}节课`, $options: 'i' }
        })

        if (payment) {
          console.log('找到对应的缴费记录（通过notes匹配）,删除:', payment._id)
          await Payment.findByIdAndDelete(payment._id)
        } else {
          console.log('未找到对应的缴费记录')
        }
      }
    }
    
    if (record.courseId) {
      const course = await Course.findById(record.courseId)
      if (course && course.fromLessonRecord) {
        await Course.findByIdAndDelete(record.courseId)
        console.log('删除由消课记录创建的课程:', record.courseId)
      } else {
        await Course.findByIdAndUpdate(record.courseId, { isGiftLesson: false, status: 'normal' })
        console.log('重置课程状态:', record.courseId)
      }
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
    
    const result = await LessonBalance.findOneAndUpdate(
      { studentId: studentObjectId },
      { 
        $inc: { remainingLessons: lessonsChange },
        $set: { lastUpdated: new Date() }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    console.log('更新后余额:', result.remainingLessons)
  } catch (error) {
    console.error('更新课费余额错误:', error)
  }
}

module.exports = {
  getLessonRecords,
  getLessonRecordById,
  uploadLessonRecordMedia,
  getLessonRecordMedia,
  createLessonRecord,
  updateLessonRecord,
  deleteLessonRecord
}
