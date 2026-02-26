const FeeStandard = require('../models/FeeStandard')
const Student = require('../models/Student')
const CourseType = require('../models/CourseType')

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

module.exports = {
  getFeeStandards,
  createFeeStandard,
  updateFeeStandard,
  deleteFeeStandard
}
