const LessonRecord = require('../models/LessonRecord')
const LessonBalance = require('../models/LessonBalance')
const Student = require('../models/Student')
const Course = require('../models/Course')
const CourseType = require('../models/CourseType')
const Payment = require('../models/Payment')
const User = require('../models/User')
const GuardianBinding = require('../models/GuardianBinding')
const { canViewStudent, getTeacherStudentAccessFilter, isSameId } = require('../utils/studentAccess')
const { getAccountCoursePrice } = require('../utils/feeStandard')
const {
  getDocumentTeacherId,
  getTeacherAccountFilter
} = require('../utils/teacherAccount')
const {
  attachAccountBillingToStudent,
  getEffectivePaymentType
} = require('../utils/studentAccount')
const { verifyToken } = require('../utils/jwt')
const { sendSubscribeMessage, formatTime } = require('../utils/wechat')
const mongoose = require('mongoose')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const MEDIA_ROOT = path.resolve(__dirname, '../../uploads/lesson-record-media')
const MAX_MEDIA_SIZE = 20 * 1024 * 1024

const getMediaExtension = (mimeType, fileName = '') => {
  const ext = path.extname(fileName || '').toLowerCase()
  if (/^\.[a-z0-9]+$/.test(ext)) {
    return ext
  }

  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/aac': '.aac',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav'
  }

  return map[mimeType] || ''
}

const buildMediaItem = ({ mediaType, fileKey, originalName, mimeType, size, duration }) => {
  const mediaId = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  return {
    id: mediaId,
    type: mediaType,
    fileKey,
    url: `/lesson-records/media/${mediaId}`,
    originalName: originalName || '',
    mimeType: mimeType || '',
    size: size || 0,
    duration: Number(duration) || 0,
    createdAt: new Date()
  }
}

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

const mergeLessonRecordMediaItems = (oldMediaItems = [], requestedMediaItems = []) => {
  if (!Array.isArray(requestedMediaItems)) return undefined

  const oldMediaMap = {}
  oldMediaItems.forEach((item) => {
    if (!item || !item.id) return
    const plainItem = item.toObject ? item.toObject() : item
    oldMediaMap[plainItem.id.toString()] = plainItem
  })

  return requestedMediaItems
    .slice(0, 12)
    .map((item) => {
      if (!item || !item.id || !['image', 'audio'].includes(item.type)) {
        return null
      }

      const itemId = item.id.toString()
      if (oldMediaMap[itemId]) {
        return oldMediaMap[itemId]
      }

      return sanitizeMediaItems([item])[0] || null
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

  const student = record.studentId?._id ? record.studentId : await Student.findById(record.studentId)
  return canViewStudent(student, user)
}

const getLessonRecordTeacherId = async (record, student) => {
  if (!record) return ''
  if (record.teacherId) return record.teacherId

  if (record.courseId) {
    const courseId = record.courseId?._id || record.courseId
    const course = await Course.findById(courseId).select('teacherId')
    if (course?.teacherId) return course.teacherId
  }

  return student?.teacherId?._id || student?.teacherId
}

const canUserMutateRecord = async (record, user) => {
  if (!record || !user) return false
  if (user.role === 'admin') return true

  const student = record.studentId?._id ? record.studentId : await Student.findById(record.studentId)
  if (!student || !canViewStudent(student, user)) return false

  const teacherId = await getLessonRecordTeacherId(record, student)
  return isSameId(teacherId, user._id || user.id)
}

const getLessonRecords = async (req, res) => {
  try {
    const { studentId, courseId, accountOnly } = req.query
    const user = await User.findById(req.userId)
    const isTeacher = user && user.role !== 'admin'
    
    let filter = {}
    let accessibleStudents = []
    if (courseId) {
      filter.courseId = courseId
    }
    
    if (isTeacher) {
      accessibleStudents = await Student.find(getTeacherStudentAccessFilter(req.userId))
      const studentIds = accessibleStudents.map(s => s._id.toString())
      
      if (studentId) {
        if (studentIds.includes(studentId)) {
          filter.studentId = studentId
        } else {
          return res.json({ message: '获取成功', data: [] })
        }
      } else {
        filter.studentId = { $in: accessibleStudents.map(s => s._id) }
      }

      if (accountOnly === 'true' || accountOnly === true) {
        const ownedStudentIds = accessibleStudents
          .filter(student => isSameId(student.teacherId, req.userId))
          .map(student => student._id)
        Object.assign(filter, getTeacherAccountFilter(req.userId, ownedStudentIds))
      }
    } else {
      if (studentId) {
        filter.studentId = studentId
      }
    }
    
    const lessonRecords = await LessonRecord.find(filter)
      .sort({ recordDate: -1 })
      .populate('studentId', 'name phone paymentType currentPrice priceEffectiveDate teacherId practiceTeacherId')
      .populate('courseId', 'startTime endTime')
      .populate('courseTypeId', 'name duration')
      .populate('teacherId', 'name username')
    
    // 获取学生剩余课时
    const studentIds = [...new Set(lessonRecords.map(r => r.studentId?._id).filter(Boolean))]
    const balanceQuery = { studentId: { $in: studentIds } }
    if (isTeacher && (accountOnly === 'true' || accountOnly === true)) {
      const ownedStudentIds = accessibleStudents
        .filter(student => isSameId(student.teacherId, req.userId))
        .map(student => student._id)
      Object.assign(balanceQuery, getTeacherAccountFilter(req.userId, ownedStudentIds))
    }
    const balances = await LessonBalance.find(balanceQuery)
      .populate('studentId', 'teacherId')
    const balanceMap = {}
    balances.forEach(b => {
      const teacherId = b.teacherId || b.studentId?.teacherId
      balanceMap[`${b.studentId?._id || b.studentId}:${teacherId}`] = b.remainingLessons
    })
    
    // 将remainingLessons添加到返回数据中
    const recordsWithBalance = await Promise.all(lessonRecords.map(async (r) => {
      const record = r.toObject()
      if (record.studentId) {
        const teacherId = record.teacherId?._id || record.teacherId || await getLessonRecordTeacherId(r, r.studentId)
        record.studentId = await attachAccountBillingToStudent(record.studentId, teacherId)
        record.studentId.remainingLessons = balanceMap[`${record.studentId._id}:${teacherId}`] || 0
      }
      record.canManageRecord = !isTeacher || await canUserMutateRecord(r, user)
      return record
    }))
    
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
      .populate('studentId', 'name phone paymentType currentPrice priceEffectiveDate teacherId practiceTeacherId')
      .populate('courseId', 'startTime endTime')
      .populate('courseTypeId', 'name duration')
      .populate('teacherId', 'name username')
    
    if (!record) {
      return res.status(404).json({ message: '消课记录不存在' })
    }
    
    if (isTeacher) {
      const student = await Student.findById(record.studentId._id || record.studentId)
      if (!student || !canViewStudent(student, user)) {
        return res.status(403).json({ message: '无权限查看此消课记录' })
      }
    }
    
    const recordData = record.toObject()
    if (recordData.studentId) {
      const recordTeacherId = recordData.teacherId?._id || recordData.teacherId || await getLessonRecordTeacherId(record, record.studentId)
      recordData.studentId = await attachAccountBillingToStudent(recordData.studentId, recordTeacherId)
    }
    recordData.canManageRecord = !isTeacher || await canUserMutateRecord(record, user)

    res.json({
      message: '获取成功',
      data: recordData
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

    const mediaItem = buildMediaItem({
      mediaType,
      fileKey: path.basename(req.file.filename),
      originalName: req.file.originalname || '',
      mimeType: req.file.mimetype || '',
      size: req.file.size || 0,
      duration: req.body.duration
    })

    res.json({
      message: '上传成功',
      data: mediaItem
    })
  } catch (error) {
    console.error('上传课后记录媒体失败:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const uploadLessonRecordMediaData = async (req, res) => {
  try {
    const { mediaType, fileName, mimeType, data, duration } = req.body

    if (!['image', 'audio'].includes(mediaType)) {
      return res.status(400).json({ message: '不支持的媒体类型' })
    }

    if (!data || typeof data !== 'string') {
      return res.status(400).json({ message: '缺少文件内容' })
    }

    const base64Data = data.includes(',') ? data.split(',').pop() : data
    const buffer = Buffer.from(base64Data, 'base64')
    if (!buffer.length) {
      return res.status(400).json({ message: '文件内容无效' })
    }

    if (buffer.length > MAX_MEDIA_SIZE) {
      return res.status(400).json({ message: '文件不能超过20MB' })
    }

    fs.mkdirSync(MEDIA_ROOT, { recursive: true })
    const ext = getMediaExtension(mimeType, fileName)
    const fileKey = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`
    const filePath = path.join(MEDIA_ROOT, fileKey)
    fs.writeFileSync(filePath, buffer)

    const mediaItem = buildMediaItem({
      mediaType,
      fileKey,
      originalName: fileName || '',
      mimeType: mimeType || '',
      size: buffer.length,
      duration
    })

    res.json({
      message: '上传成功',
      data: mediaItem
    })
  } catch (error) {
    console.error('上传课后记录媒体数据失败:', error)
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
      .populate('studentId', 'name teacherId practiceTeacherId')

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
    
    if (isTeacher && !canViewStudent(student, user)) {
      return res.status(403).json({ message: '无权限为此学生创建消课记录' })
    }

    let course = null
    let lessonTeacherId = user.role === 'admin' ? (req.body.teacherId || student.teacherId) : req.userId

    if (req.body.courseId) {
      course = await Course.findById(req.body.courseId)
      if (!course) {
        return res.status(404).json({ message: '课程不存在' })
      }

      if (!isSameId(course.studentId, student._id)) {
        return res.status(400).json({ message: '课程和学生不匹配' })
      }

      if (isTeacher && !isSameId(course.teacherId, req.userId)) {
        return res.status(403).json({ message: '无权限为其他老师的课程消课' })
      }

      lessonTeacherId = course.teacherId || lessonTeacherId
    }

    let effectiveCourseTypeId = course?.courseTypeId || req.body.courseTypeId
    if (!effectiveCourseTypeId && isTeacher && isSameId(student.practiceTeacherId, req.userId) && !isSameId(student.teacherId, req.userId)) {
      const practiceCourseType = await CourseType.findOneAndUpdate(
        { name: '陪练课' },
        {
          $setOnInsert: {
            name: '陪练课',
            duration: 60,
            isDefault: false,
            sortOrder: 999
          }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )
      effectiveCourseTypeId = practiceCourseType._id
    }
    
    let unitPrice = 0
    let isGiftLesson = false
    const accountPaymentType = await getEffectivePaymentType(student, lessonTeacherId)
    const priceAt = course?.startTime || req.body.courseStartTime || req.body.recordDate || new Date()
    
    if (accountPaymentType === 'prepaid') {
      const paymentInfo = await calculateUnitPriceAndGiftStatus(req.body.studentId, lessonTeacherId, req.body.lessonsConsumed || 1)
      unitPrice = await getAccountCoursePrice({
        student,
        courseTypeId: effectiveCourseTypeId,
        teacherId: lessonTeacherId,
        at: priceAt,
        fallbackPrice: paymentInfo.unitPrice
      })
      isGiftLesson = paymentInfo.isGiftLesson
      console.log('预付费学生 - 单价:', unitPrice, '是否赠课:', isGiftLesson)
    } else if (accountPaymentType === 'payPerLesson') {
      let courseTypeId = effectiveCourseTypeId
      console.log('========== 单次付费学生处理 ==========')
      console.log('学生ID:', req.body.studentId)
      console.log('课程类型ID:', courseTypeId)
      console.log('课程类型ID类型:', typeof courseTypeId)

      if (courseTypeId) {
        console.log('正在查找收费标准...')
        unitPrice = await getAccountCoursePrice({
          student,
          courseTypeId,
          teacherId: lessonTeacherId,
          at: priceAt,
          fallbackPrice: 0
        })

        if (unitPrice > 0) {
          console.log('✅ 找到收费标准:', {
            price: unitPrice,
            courseTypeId,
            studentId: student._id,
            teacherId: lessonTeacherId
          })
        } else {
          console.log('❌ 未找到收费标准')
          console.log('提示：请确认已在收费标准中配置该课程类型的单价')
        }
      } else {
        console.log('❌ 未提供课程类型ID (courseTypeId)')
      }
      if (unitPrice <= 0) {
        unitPrice = await getAccountCoursePrice({
          student,
          teacherId: lessonTeacherId,
          at: priceAt,
          fallbackPrice: 0
        })
      }
    } else if (accountPaymentType === 'free') {
      console.log('免费学生 - 不计算单价，不扣课时，不创建缴费记录')
    }
    
    const lessonRecordData = {
      ...req.body,
      courseTypeId: effectiveCourseTypeId,
      teacherId: lessonTeacherId,
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
        courseTypeId: effectiveCourseTypeId,
        startTime: courseStartTime,
        endTime: courseEndTime,
        status: lessonRecordData.isDeducted ? 'completed' : 'normal',
        isGiftLesson: isGiftLesson,
        teacherId: lessonTeacherId,
        fromLessonRecord: true
      })
      
      lessonRecord.courseId = newCourse._id
      await lessonRecord.save()
      console.log('自动创建课程记录:', newCourse._id)
    }
    
    if (accountPaymentType === 'prepaid') {
      const studentIdStr = lessonRecord.studentId._id ? lessonRecord.studentId._id.toString() : lessonRecord.studentId.toString()
      if (lessonRecord.isDeducted) {
        console.log('扣减课时:', studentIdStr, -lessonRecord.lessonsConsumed)
        await updateLessonBalance(studentIdStr, lessonTeacherId, -lessonRecord.lessonsConsumed)
      } else {
        console.log('增加课时:', studentIdStr, lessonRecord.lessonsConsumed)
        await updateLessonBalance(studentIdStr, lessonTeacherId, lessonRecord.lessonsConsumed)
      }
    } else if (accountPaymentType === 'payPerLesson' && lessonRecord.isDeducted) {
      console.log('========== 单次付费学生创建缴费记录 ==========')
      console.log('unitPrice:', unitPrice)
      console.log('lessonsConsumed:', lessonRecord.lessonsConsumed)
      console.log('计算金额:', unitPrice * lessonRecord.lessonsConsumed)

      if (unitPrice > 0) {
        const paymentData = {
          studentId: lessonRecord.studentId,
          teacherId: lessonTeacherId,
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
        const courseType = effectiveCourseTypeId ? await CourseType.findById(effectiveCourseTypeId) : null
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

const calculateUnitPriceAndGiftStatus = async (studentId, teacherId, lessonsToConsume = 1) => {
  try {
    const student = await Student.findById(studentId).select('teacherId')
    const ownedStudentIds = student && isSameId(student.teacherId, teacherId) ? [student._id] : []
    const accountFilter = getTeacherAccountFilter(teacherId, ownedStudentIds)
    const payments = await Payment.find({
      studentId,
      ...accountFilter
    }).sort({ paymentDate: 1 })
    
    if (payments.length === 0) {
      return { unitPrice: 0, isGiftLesson: false }
    }
    
    const lessonRecords = await LessonRecord.find({ 
      studentId, 
      isDeducted: true,
      ...accountFilter
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
      teacherId,
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
    
    if (isTeacher && !(await canUserMutateRecord(oldRecord, user))) {
      return res.status(403).json({ message: '无权限修改此消课记录' })
    }

    const updateData = { ...req.body }
    const oldRecordTeacherId = await getLessonRecordTeacherId(oldRecord, oldRecord.studentId)
    let nextRecordTeacherId = updateData.teacherId || oldRecordTeacherId
    if (isTeacher) {
      delete updateData.teacherId
      nextRecordTeacherId = oldRecordTeacherId
    }
    if (isTeacher && req.body.courseId) {
      const targetCourse = await Course.findById(req.body.courseId).select('studentId teacherId')
      if (!targetCourse) {
        return res.status(404).json({ message: '课程不存在' })
      }
      if (!isSameId(targetCourse.teacherId, req.userId)) {
        return res.status(403).json({ message: '无权限关联其他老师的课程' })
      }
      const targetStudentId = req.body.studentId || oldRecord.studentId?._id || oldRecord.studentId
      if (!isSameId(targetCourse.studentId, targetStudentId)) {
        return res.status(400).json({ message: '课程和学生不匹配' })
      }
      nextRecordTeacherId = targetCourse.teacherId
      updateData.teacherId = targetCourse.teacherId
    }

    if (!updateData.teacherId && nextRecordTeacherId) {
      updateData.teacherId = nextRecordTeacherId
    }

    if (Array.isArray(req.body.mediaItems)) {
      updateData.mediaItems = mergeLessonRecordMediaItems(oldRecord.mediaItems, req.body.mediaItems)
    }

    const lessonRecord = await LessonRecord.findByIdAndUpdate(id, updateData, { new: true })
    
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
    
    if (student) {
      const oldPaymentType = await getEffectivePaymentType(student, oldRecordTeacherId)
      const nextPaymentType = await getEffectivePaymentType(student, nextRecordTeacherId)
      const studentIdStr = oldRecord.studentId._id ? oldRecord.studentId._id.toString() : oldRecord.studentId.toString()
      const oldDeductedLessons = oldRecord.isDeducted ? Number(oldRecord.lessonsConsumed || 0) : 0
      const nextIsDeducted = Object.prototype.hasOwnProperty.call(req.body, 'isDeducted')
        ? (req.body.isDeducted === true || req.body.isDeducted === 'true')
        : oldRecord.isDeducted
      const nextLessonsConsumed = Object.prototype.hasOwnProperty.call(req.body, 'lessonsConsumed')
        ? Number(req.body.lessonsConsumed || 0)
        : Number(oldRecord.lessonsConsumed || 0)
      const nextDeductedLessons = nextIsDeducted ? nextLessonsConsumed : 0

      if (oldPaymentType === 'prepaid' && nextPaymentType === 'prepaid' && isSameId(oldRecordTeacherId, nextRecordTeacherId)) {
        const lessonsChange = oldDeductedLessons - nextDeductedLessons
        if (lessonsChange) {
          await updateLessonBalance(studentIdStr, nextRecordTeacherId, lessonsChange)
        }
      } else {
        if (oldPaymentType === 'prepaid' && oldDeductedLessons) {
          await updateLessonBalance(studentIdStr, oldRecordTeacherId, oldDeductedLessons)
        }
        if (nextPaymentType === 'prepaid' && nextDeductedLessons) {
          await updateLessonBalance(studentIdStr, nextRecordTeacherId, -nextDeductedLessons)
        }
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
    
    if (isTeacher && !(await canUserMutateRecord(record, user))) {
      return res.status(403).json({ message: '无权限删除此消课记录' })
    }
    
    const student = await Student.findById(record.studentId._id)
    const recordTeacherId = await getLessonRecordTeacherId(record, student)
    
    const studentIdStr = record.studentId._id ? record.studentId._id.toString() : record.studentId.toString()
    
    const accountPaymentType = student
      ? await getEffectivePaymentType(student, recordTeacherId)
      : ''

    if (student && accountPaymentType === 'prepaid' && record.isDeducted) {
      await updateLessonBalance(studentIdStr, recordTeacherId, record.lessonsConsumed)
    } else if (student && accountPaymentType === 'payPerLesson' && record.isDeducted) {
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
          teacherId: recordTeacherId,
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

const updateLessonBalance = async (studentId, teacherId, lessonsChange) => {
  if (!teacherId || !lessonsChange) return

  try {
    console.log('updateLessonBalance 调用 - studentId:', studentId, 'lessonsChange:', lessonsChange)
    
    const mongoose = require('mongoose')
    let studentObjectId
    let teacherObjectId
    try {
      studentObjectId = new mongoose.Types.ObjectId(studentId)
      teacherObjectId = new mongoose.Types.ObjectId(teacherId)
    } catch (e) {
      console.error('无效的 studentId:', studentId)
      return
    }
    
    const result = await LessonBalance.findOneAndUpdate(
      { studentId: studentObjectId, teacherId: teacherObjectId },
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
  uploadLessonRecordMediaData,
  getLessonRecordMedia,
  createLessonRecord,
  updateLessonRecord,
  deleteLessonRecord
}
