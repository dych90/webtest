const CourseType = require('../models/CourseType')

const getCourseTypes = async (req, res) => {
  try {
    const courseTypes = await CourseType.find().sort({ sortOrder: 1, createdAt: -1 })
    
    res.json({
      message: '获取成功',
      data: courseTypes
    })
  } catch (error) {
    console.error('获取课程类型列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const createCourseType = async (req, res) => {
  try {
    const courseType = await CourseType.create(req.body)
    
    res.json({
      message: '创建成功',
      data: courseType
    })
  } catch (error) {
    console.error('创建课程类型错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const updateCourseType = async (req, res) => {
  try {
    const { id } = req.params
    const courseType = await CourseType.findByIdAndUpdate(id, req.body, { new: true })
    
    if (!courseType) {
      return res.status(404).json({ message: '课程类型不存在' })
    }
    
    res.json({
      message: '更新成功',
      data: courseType
    })
  } catch (error) {
    console.error('更新课程类型错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const deleteCourseType = async (req, res) => {
  try {
    const { id } = req.params
    await CourseType.findByIdAndDelete(id)
    
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除课程类型错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const updateCourseTypesSort = async (req, res) => {
  try {
    const { courseTypeIds } = req.body
    
    if (!courseTypeIds || !Array.isArray(courseTypeIds)) {
      return res.status(400).json({ message: '无效的排序数据' })
    }
    
    const updatePromises = courseTypeIds.map((id, index) => {
      return CourseType.findByIdAndUpdate(id, { sortOrder: index })
    })
    
    await Promise.all(updatePromises)
    
    res.json({ message: '排序更新成功' })
  } catch (error) {
    console.error('更新排序错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = {
  getCourseTypes,
  createCourseType,
  updateCourseType,
  deleteCourseType,
  updateCourseTypesSort
}
