const Student = require('../models/Student')
const User = require('../models/User')
const xlsx = require('xlsx')
const fs = require('fs')
const path = require('path')

const getStudents = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    const query = {}
    
    if (user && user.role !== 'admin') {
      query.teacherId = req.userId
    } else if (user && user.role === 'admin' && req.query.teacherId) {
      query.teacherId = req.query.teacherId
    }
    
    const students = await Student.find(query)
      .sort({ createdAt: -1 })
      .populate('defaultCourseTypeId', 'name duration')
      .populate('teacherId', 'name username')
    
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
    const user = await User.findById(req.userId)
    
    const studentData = {
      ...req.body,
      teacherId: user.role === 'admin' && req.body.teacherId ? req.body.teacherId : req.userId
    }
    
    const student = await Student.create(studentData)
    
    res.json({
      message: '创建成功',
      data: student
    })
  } catch (error) {
    console.error('创建学生错误:', error)
    res.status(500).json({ message: '服务器错误' })
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
        const studentData = {
          name: row['姓名'] || row['name'] || '',
          gender: row['性别'] || row['gender'] || '',
          age: parseInt(row['年龄'] || row['age']) || 0,
          phone: row['联系电话'] || row['phone'] || '',
          practiceTeacher: row['陪练老师'] || row['practiceTeacher'] || '',
          notes: row['备注'] || row['notes'] || '',
          paymentType: 'prepaid',
          teacherId: req.userId
        }
        
        const paymentTypeValue = row['付费类型'] || row['paymentType'] || row['付费方式'] || ''
        console.log(`付费类型原始值:`, paymentTypeValue)
        if (paymentTypeValue) {
          if (paymentTypeValue === '预付费' || paymentTypeValue === 'prepaid') {
            studentData.paymentType = 'prepaid'
          } else if (paymentTypeValue === '单次付费' || paymentTypeValue === 'payPerLesson' || paymentTypeValue === '单次') {
            studentData.paymentType = 'payPerLesson'
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
    
    if (user.role !== 'admin' && student.teacherId.toString() !== req.userId) {
      return res.status(403).json({ message: '无权限修改此学生' })
    }
    
    const updatedStudent = await Student.findByIdAndUpdate(id, req.body, { new: true })
    
    res.json({
      message: '更新成功',
      data: updatedStudent
    })
  } catch (error) {
    console.error('更新学生错误:', error)
    res.status(500).json({ message: '服务器错误' })
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
    
    if (user.role !== 'admin' && student.teacherId.toString() !== req.userId) {
      return res.status(403).json({ message: '无权限删除此学生' })
    }
    
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
  importStudents,
  updateStudent,
  deleteStudent
}
