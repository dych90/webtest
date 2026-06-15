const Student = require('../models/Student')
const User = require('../models/User')
const FeeStandard = require('../models/FeeStandard')
const LessonBalance = require('../models/LessonBalance')
const CourseType = require('../models/CourseType')
const {
  attachStudentRelationType,
  canManageStudent,
  canViewStudent,
  getTeacherStudentAccessFilter,
  isSameId
} = require('../utils/studentAccess')
const {
  canAccessTeacherAccount,
  getTeacherAccountFilter,
  getTeacherAccountId
} = require('../utils/teacherAccount')
const {
  attachAccountBillingToStudent,
  saveStudentAccountSettings
} = require('../utils/studentAccount')
const xlsx = require('xlsx')
const fs = require('fs')

const LEGACY_PARENT_NAME_COLUMN = '\u5bb6\u957f\u59d3\u540d'
const LEGACY_PARENT_PHONE_COLUMN = '\u5bb6\u957f\u7535\u8bdd'
const PRACTICE_COURSE_TYPE_NAME = '陪练课'
const ACCOUNT_UPDATE_FIELDS = ['paymentType', 'currentPrice', 'priceEffectiveDate']

const getOrCreatePracticeCourseType = async () => {
  return CourseType.findOneAndUpdate(
    { name: PRACTICE_COURSE_TYPE_NAME },
    {
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

const pickAccountUpdateData = (body = {}) => {
  return ACCOUNT_UPDATE_FIELDS.reduce((result, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      result[field] = body[field]
    }
    return result
  }, {})
}

const hasAccountUpdateData = (data = {}) => {
  return ACCOUNT_UPDATE_FIELDS.some(field => Object.prototype.hasOwnProperty.call(data, field))
}

const resolvePriceEffectiveDate = (value) => {
  if (!value) return new Date()

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

const getAccountCourseTypeId = async (student, teacherId, requestedCourseTypeId) => {
  const isPracticeAccount = isSameId(student.practiceTeacherId, teacherId) && !isSameId(student.teacherId, teacherId)
  if (isPracticeAccount) {
    const practiceCourseType = await getOrCreatePracticeCourseType()
    return practiceCourseType._id
  }

  return requestedCourseTypeId || student.defaultCourseTypeId
}

const syncAccountFeeStandard = async ({ student, teacherId, paymentType, currentPrice, priceEffectiveDate, courseTypeId }) => {
  if (!student || !teacherId) return

  const currentFeeFilter = {
    studentId: student._id,
    teacherId,
    expireDate: { $exists: false }
  }

  if (paymentType === 'free') {
    await FeeStandard.updateMany(currentFeeFilter, { expireDate: new Date() })
    return
  }

  if (currentPrice === undefined) return

  const newPrice = Number(currentPrice) || 0
  if (newPrice <= 0) return

  const effectiveCourseTypeId = await getAccountCourseTypeId(student, teacherId, courseTypeId)
  if (!effectiveCourseTypeId) return

  const effectiveDate = resolvePriceEffectiveDate(priceEffectiveDate)

  await FeeStandard.updateMany(currentFeeFilter, { expireDate: effectiveDate })
  await FeeStandard.create({
    studentId: student._id,
    teacherId,
    courseTypeId: effectiveCourseTypeId,
    price: newPrice,
    effectiveDate
  })
}

const resolvePracticeTeacherAssignment = async (studentData, ownerTeacherId) => {
  if (!studentData) return studentData

  const updateData = { ...studentData }
  const hasPracticeTeacherId = Object.prototype.hasOwnProperty.call(updateData, 'practiceTeacherId')
  const hasPracticeTeacherName = Object.prototype.hasOwnProperty.call(updateData, 'practiceTeacher')
  if (!hasPracticeTeacherId && !hasPracticeTeacherName) {
    return updateData
  }

  const rawPracticeTeacherId = updateData.practiceTeacherId
  const practiceTeacherName = hasPracticeTeacherName ? (updateData.practiceTeacher || '').toString().trim() : ''

  if (rawPracticeTeacherId) {
    if (ownerTeacherId && isSameId(rawPracticeTeacherId, ownerTeacherId)) {
      const error = new Error('陪练老师不能选择任课老师自己')
      error.status = 400
      throw error
    }

    const teacher = await User.findOne({ _id: rawPracticeTeacherId, role: 'teacher' })
      .select('name username')

    if (!teacher) {
      const error = new Error('陪练老师不存在')
      error.status = 400
      throw error
    }

    updateData.practiceTeacherId = teacher._id
    updateData.practiceTeacher = practiceTeacherName || teacher.name || teacher.username || ''
    return updateData
  }

  if (hasPracticeTeacherId) {
    updateData.practiceTeacherId = null
  }

  if (hasPracticeTeacherName || hasPracticeTeacherId) {
    updateData.practiceTeacher = practiceTeacherName
  }

  if (practiceTeacherName) {
    const matchedTeachers = await User.find({
      role: 'teacher',
      ...(ownerTeacherId ? { _id: { $ne: ownerTeacherId } } : {}),
      $or: [
        { name: practiceTeacherName },
        { username: practiceTeacherName }
      ]
    }).select('name username').limit(2)

    if (matchedTeachers.length === 1) {
      updateData.practiceTeacherId = matchedTeachers[0]._id
      updateData.practiceTeacher = matchedTeachers[0].name || matchedTeachers[0].username || practiceTeacherName
    }
  }

  return updateData
}

const getStudents = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    const query = {}
    
    if (user && user.role !== 'admin') {
      Object.assign(query, getTeacherStudentAccessFilter(req.userId))
    } else if (user && user.role === 'admin' && req.query.teacherId) {
      Object.assign(query, getTeacherStudentAccessFilter(req.query.teacherId))
    }

    const students = await Student.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate('defaultCourseTypeId', 'name duration')
      .populate('teacherId', 'name username')
      .populate('practiceTeacherId', 'name username phone')

    const studentData = await Promise.all(students.map(async (student) => {
      const relationStudent = attachStudentRelationType(student, user)
      const accountTeacherId = user?.role === 'admin'
        ? (req.query.teacherId || student.teacherId)
        : req.userId
      return attachAccountBillingToStudent(relationStudent, accountTeacherId)
    }))

    res.json({
      message: '获取成功',
      data: studentData
    })
  } catch (error) {
    console.error('获取学生列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const getStudentById = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.userId)
    
    const student = await Student.findById(id)
      .populate('defaultCourseTypeId', 'name duration')
      .populate('teacherId', 'name username')
      .populate('practiceTeacherId', 'name username phone')
    
    if (!student) {
      return res.status(404).json({ message: '学生不存在' })
    }
    
    if (!canViewStudent(student, user)) {
      return res.status(403).json({ message: '无权限查看此学生' })
    }
    
    const accountTeacherId = getTeacherAccountId(student, user, req.query.teacherId)
    const ownedStudentIds = isSameId(student.teacherId, accountTeacherId) ? [student._id] : []
    const balance = await LessonBalance.findOne({
      studentId: id,
      ...getTeacherAccountFilter(accountTeacherId, ownedStudentIds)
    })
    const studentData = await attachAccountBillingToStudent(attachStudentRelationType(student, user), accountTeacherId)
    studentData.remainingLessons = balance ? balance.remainingLessons : 0
    
    res.json({
      message: '获取成功',
      data: studentData
    })
  } catch (error) {
    console.error('获取学生详情错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const createStudent = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    
    let studentData = {
      ...req.body,
      teacherId: user.role === 'admin' && req.body.teacherId ? req.body.teacherId : req.userId
    }
    studentData = await resolvePracticeTeacherAssignment(studentData, studentData.teacherId)

    if (studentData.paymentType === 'free') {
      studentData.currentPrice = 0
    }
    
    if (req.body.currentPrice && req.body.currentPrice > 0) {
      studentData.priceEffectiveDate = req.body.priceEffectiveDate || new Date()
    }
    
    const student = await Student.create(studentData)
    
    if (studentData.paymentType !== 'free' && req.body.currentPrice && req.body.currentPrice > 0 && req.body.defaultCourseTypeId) {
      await FeeStandard.create({
        studentId: student._id,
        teacherId: student.teacherId,
        courseTypeId: req.body.defaultCourseTypeId,
        price: req.body.currentPrice,
        effectiveDate: studentData.priceEffectiveDate
      })
    }
    
    res.json({
      message: '创建成功',
      data: student
    })
  } catch (error) {
    console.error('创建学生错误:', error)
    res.status(error.status || 500).json({ message: error.status ? error.message : '服务器错误' })
  }
}

const importStudents = async (req, res) => {
  console.log('=== 开始导入学生 ===')
  console.log('文件信息:', req.file)
  console.log('用户ID:', req.userId)
  
  try {
    if (!req.file) {
      console.log('错误: 没有上传文件')
      return res.status(400).json({ message: '请上传文件' })
    }

    const user = await User.findById(req.userId)
    console.log('当前用户:', user ? user.username : '未找到')

    const workbook = xlsx.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = xlsx.utils.sheet_to_json(worksheet)
    console.log('读取到数据行数:', data.length)

    const errors = []
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      console.log(`=== 第 ${i + 2} 行原始数据 ===`)
      console.log('所有列名:', Object.keys(row))
      console.log('所有值:', row)
      
      try {
        let studentData = {
          name: row['姓名'] || row['name'] || '',
          gender: row['性别'] || row['gender'] || '',
          phone: row['联系电话'] || row['phone'] || '',
          parentName: row['联系人姓名'] || row[LEGACY_PARENT_NAME_COLUMN] || row['parentName'] || '',
          parentPhone: row['联系人电话'] || row[LEGACY_PARENT_PHONE_COLUMN] || row['parentPhone'] || '',
          practiceTeacher: row['陪练老师'] || row['practiceTeacher'] || '',
          notes: row['备注'] || row['notes'] || '',
          paymentType: 'prepaid',
          teacherId: req.userId
        }
        
        const birthdayValue = row['生日'] || row['birthday'] || row['出生日期'] || ''
        if (birthdayValue) {
          const birthdayDate = new Date(birthdayValue)
          if (!isNaN(birthdayDate.getTime())) {
            studentData.birthday = birthdayDate
          }
        }
        
        const paymentTypeValue = row['付费类型'] || row['paymentType'] || row['付费方式'] || ''
        console.log(`付费类型原始值:`, paymentTypeValue)
        if (paymentTypeValue) {
          if (paymentTypeValue === '预付费' || paymentTypeValue === 'prepaid') {
            studentData.paymentType = 'prepaid'
          } else if (paymentTypeValue === '单次付费' || paymentTypeValue === 'payPerLesson' || paymentTypeValue === '单次') {
            studentData.paymentType = 'payPerLesson'
          } else if (paymentTypeValue === '免费' || paymentTypeValue === 'free') {
            studentData.paymentType = 'free'
          }
        }
        console.log(`最终付费类型:`, studentData.paymentType)
        
        if (!studentData.name) {
          errors.push(`第 ${i + 2} 行：姓名不能为空`)
          failCount++
          continue
        }
        
        const courseTypeName = row['课程类型'] || row['courseType'] || row['默认课程类型'] || ''
        console.log(`第 ${i + 2} 行 - 学生: ${studentData.name}, 课程类型: ${courseTypeName}`)
        
        if (courseTypeName) {
          const CourseType = require('../models/CourseType')
          const courseType = await CourseType.findOne({ name: courseTypeName })
          console.log(`查找课程类型结果:`, courseType ? courseType.name : '未找到')
          if (courseType) {
            studentData.defaultCourseTypeId = courseType._id
          }
        }
        
        studentData = await resolvePracticeTeacherAssignment(studentData, req.userId)

        const existingStudent = await Student.findOne({ 
          name: studentData.name,
          teacherId: req.userId
        })
        console.log(`学生是否存在:`, existingStudent ? '是' : '否')
        
        if (existingStudent) {
          const updateData = { ...studentData }
          delete updateData.teacherId
          console.log(`更新数据:`, updateData)
          await Student.findByIdAndUpdate(existingStudent._id, updateData)
          successCount++
        } else {
          await Student.create(studentData)
          successCount++
        }
      } catch (error) {
        console.error(`第 ${i + 2} 行错误:`, error)
        errors.push(`第 ${i + 2} 行：${error.message}`)
        failCount++
      }
    }

    fs.unlinkSync(req.file.path)

    res.json({
      message: '导入完成',
      data: {
        successCount,
        failCount,
        errors
      }
    })
  } catch (error) {
    console.error('导入学生错误:', error)
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    res.status(500).json({ message: '导入失败: ' + error.message })
  }
}

const updateStudent = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.userId)
    
    const student = await Student.findById(id)
    
    if (!student) {
      return res.status(404).json({ message: '学生不存在' })
    }
    
    if (!canViewStudent(student, user)) {
      return res.status(403).json({ message: '无权限修改此学生' })
    }

    const accountTeacherId = getTeacherAccountId(student, user, req.body.accountTeacherId || req.body.teacherId)
    if (!canAccessTeacherAccount(student, user, accountTeacherId)) {
      return res.status(403).json({ message: '无权限修改此老师账户' })
    }

    if (!canManageStudent(student, user)) {
      const accountUpdateData = pickAccountUpdateData(req.body)
      if (!hasAccountUpdateData(accountUpdateData)) {
        const studentData = await attachAccountBillingToStudent(
          attachStudentRelationType(student, user),
          accountTeacherId
        )
        return res.json({
          message: '更新成功',
          data: studentData
        })
      }

      if (accountUpdateData.paymentType === 'free') {
        accountUpdateData.currentPrice = 0
      }

      await saveStudentAccountSettings({
        student,
        teacherId: accountTeacherId,
        ...accountUpdateData
      })
      await syncAccountFeeStandard({
        student,
        teacherId: accountTeacherId,
        paymentType: accountUpdateData.paymentType,
        currentPrice: accountUpdateData.currentPrice,
        priceEffectiveDate: accountUpdateData.priceEffectiveDate,
        courseTypeId: req.body.defaultCourseTypeId || student.defaultCourseTypeId
      })

      const updatedStudent = await Student.findById(id)
        .populate('defaultCourseTypeId', 'name duration')
        .populate('teacherId', 'name username')
        .populate('practiceTeacherId', 'name username phone')
      const studentData = await attachAccountBillingToStudent(
        attachStudentRelationType(updatedStudent, user),
        accountTeacherId
      )

      return res.json({
        message: '更新成功',
        data: studentData
      })
    }

    const nextOwnerTeacherId = user.role === 'admin' && req.body.teacherId ? req.body.teacherId : student.teacherId
    const updateData = await resolvePracticeTeacherAssignment(req.body, nextOwnerTeacherId)
    const feeTeacherId = student.teacherId
    const currentTeacherFeeFilter = {
      studentId: id,
      expireDate: { $exists: false },
      $or: [
        { teacherId: feeTeacherId },
        { teacherId: { $exists: false } }
      ]
    }

    if (updateData.paymentType === 'free') {
      updateData.currentPrice = 0
      await FeeStandard.updateMany(
        currentTeacherFeeFilter,
        { expireDate: new Date() }
      )
    }
    
    const oldPrice = student.currentPrice
    const newPrice = updateData.currentPrice
    const priceChanged = newPrice !== undefined && oldPrice !== newPrice
    
    if (priceChanged && newPrice > 0) {
      updateData.priceEffectiveDate = resolvePriceEffectiveDate(updateData.priceEffectiveDate)
      
      const courseTypeId = updateData.defaultCourseTypeId || student.defaultCourseTypeId
      if (courseTypeId) {
        await FeeStandard.updateMany(
          currentTeacherFeeFilter,
          { expireDate: updateData.priceEffectiveDate }
        )

        await FeeStandard.create({
          studentId: id,
          teacherId: feeTeacherId,
          courseTypeId: courseTypeId,
          price: newPrice,
          effectiveDate: updateData.priceEffectiveDate
        })
      }
    }
    
    const updatedStudent = await Student.findByIdAndUpdate(id, updateData, { new: true })
      .populate('defaultCourseTypeId', 'name duration')
      .populate('teacherId', 'name username')
      .populate('practiceTeacherId', 'name username phone')
    const studentData = await attachAccountBillingToStudent(
      attachStudentRelationType(updatedStudent, user),
      feeTeacherId
    )
    
    res.json({
      message: '更新成功',
      data: studentData
    })
  } catch (error) {
    console.error('更新学生错误:', error)
    res.status(error.status || 500).json({ message: error.status ? error.message : '服务器错误' })
  }
}

const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.userId)
    
    const student = await Student.findById(id)
    
    if (!student) {
      return res.status(404).json({ message: '学生不存在' })
    }
    
    if (!canManageStudent(student, user)) {
      return res.status(403).json({ message: '无权限删除此学生' })
    }
    
    await Student.findByIdAndDelete(id)
    
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除学生错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const getStudentPriceHistory = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.userId)
    
    const student = await Student.findById(id)
    if (!student) {
      return res.status(404).json({ message: '学生不存在' })
    }
    
    if (!canViewStudent(student, user)) {
      return res.status(403).json({ message: '无权限查看此学生' })
    }
    
    const accountTeacherId = getTeacherAccountId(student, user, req.query.teacherId)
    if (!canAccessTeacherAccount(student, user, accountTeacherId)) {
      return res.status(403).json({ message: '无权限查看此老师账户的价格历史' })
    }

    const ownedStudentIds = isSameId(student.teacherId, accountTeacherId) ? [student._id] : []
    const priceHistoryFilter = {
      studentId: id,
      ...getTeacherAccountFilter(accountTeacherId, ownedStudentIds)
    }

    const priceHistory = await FeeStandard.find(priceHistoryFilter)
      .sort({ effectiveDate: -1 })
      .populate('courseTypeId', 'name')
      .populate('teacherId', 'name username')
    
    res.json({
      message: '获取成功',
      data: priceHistory
    })
  } catch (error) {
    console.error('获取价格历史错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const updateStudentsSort = async (req, res) => {
  try {
    const { studentIds } = req.body
    const user = await User.findById(req.userId)
    
    if (!studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({ message: '无效的排序数据' })
    }
    
    let sortableStudentIds = studentIds
    if (user.role !== 'admin') {
      const ownedStudents = await Student.find({
        _id: { $in: studentIds },
        teacherId: req.userId
      }).select('_id')
      const ownedIdSet = new Set(ownedStudents.map(student => student._id.toString()))
      sortableStudentIds = studentIds.filter(id => ownedIdSet.has(id.toString()))
    }

    const updatePromises = sortableStudentIds.map((id, index) => {
      return Student.findByIdAndUpdate(id, { sortOrder: index })
    })
    
    await Promise.all(updatePromises)
    
    res.json({ message: '排序更新成功' })
  } catch (error) {
    console.error('更新排序错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  importStudents,
  updateStudent,
  deleteStudent,
  getStudentPriceHistory,
  updateStudentsSort
}
