const FeeStandard = require('../models/FeeStandard')
const Student = require('../models/Student')
const CourseType = require('../models/CourseType')
const xlsx = require('xlsx')
const fs = require('fs')

const getFeeStandards = async (req, res) => {
  try {
    const { studentId } = req.query
    const filter = studentId ? { studentId } : {}
    const feeStandards = await FeeStandard.find(filter)
      .sort({ effectiveDate: -1 })
      .populate('studentId', 'name phone')
      .populate('courseTypeId', 'name duration')
    
    res.json({
      message: '获取成功',
      data: feeStandards
    })
  } catch (error) {
    console.error('获取收费标准列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const createFeeStandard = async (req, res) => {
  try {
    const feeStandard = await FeeStandard.create(req.body)
    
    res.json({
      message: '创建成功',
      data: feeStandard
    })
  } catch (error) {
    console.error('创建收费标准错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const updateFeeStandard = async (req, res) => {
  try {
    const { id } = req.params
    const feeStandard = await FeeStandard.findByIdAndUpdate(id, req.body, { new: true })
    
    if (!feeStandard) {
      return res.status(404).json({ message: '收费标准不存在' })
    }
    
    res.json({
      message: '更新成功',
      data: feeStandard
    })
  } catch (error) {
    console.error('更新收费标准错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const deleteFeeStandard = async (req, res) => {
  try {
    const { id } = req.params
    await FeeStandard.findByIdAndDelete(id)
    
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除收费标准错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const parseDate = (value) => {
      if (!value) return new Date()
      
      if (typeof value === 'number') {
        const excelEpoch = new Date('1900-01-01').getTime()
        const daysSince1900 = value - excelEpoch
        const result = new Date(excelEpoch + daysSince1900 * 24 * 60 * 60 * 1000)
        if (isNaN(result.getTime())) return new Date()
        return result
      }
      
      if (typeof value === 'string') {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return date
        }
        
        const match = value.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
        if (match) {
          const [, year, month, day] = match
          const result = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          if (!isNaN(result.getTime())) return result
        }
      }
      
      return new Date()
    }

const importFeeStandards = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传文件' })
    }

    const workbook = xlsx.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = xlsx.utils.sheet_to_json(worksheet, { dateNF: 'yyyy-mm-dd' })
    
    const errors = []
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      
      const effectiveDate = parseDate(row['生效日期'])
      const expireDate = row['失效日期'] ? parseDate(row['失效日期']) : null
      
      console.log(`第 ${i + 2} 行数据：`, {
        原始值: row['生效日期'],
        解析后: effectiveDate,
        失效日期: row['失效日期'],
        解析后失效: expireDate
      })
      
      if (!effectiveDate) {
        console.log(`第 ${i + 2} 行：生效日期格式无效，跳过`)
        failCount++
        continue
      }
      
      const feeStandardData = {
        price: parseFloat(row['单价']) || 0,
        effectiveDate: effectiveDate,
        expireDate: expireDate
      }
      
      if (!feeStandardData.price || feeStandardData.price <= 0) {
        errors.push(`第 ${i + 2} 行：单价必须大于0`)
        failCount++
        continue
      }
      
      try {
        const student = await Student.findOne({ name: row['学生姓名'] })
        
        if (!student) {
          errors.push(`第 ${i + 2} 行：学生"${row['学生姓名']}"不存在`)
          failCount++
          continue
        }
        
        let courseTypeId = row['课程类型ID'] || null
        if (!courseTypeId && row['课程类型']) {
          const courseType = await CourseType.findOne({ name: row['课程类型'] })
          if (courseType) {
            courseTypeId = courseType._id
          } else {
            errors.push(`第 ${i + 2} 行：课程类型"${row['课程类型']}"不存在`)
            failCount++
            continue
          }
        }
        
        if (!courseTypeId) {
          errors.push(`第 ${i + 2} 行：必须提供课程类型ID或课程类型名称`)
          failCount++
          continue
        }
        
        await FeeStandard.create({
          ...feeStandardData,
          studentId: student._id,
          courseTypeId: courseTypeId
        })
        successCount++
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
    console.error('导入收费标准错误:', error)
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    res.status(500).json({ message: '导入失败: ' + error.message })
  }
}

module.exports = {
  getFeeStandards,
  createFeeStandard,
  updateFeeStandard,
  deleteFeeStandard,
  importFeeStandards
}
