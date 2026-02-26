const Repertoire = require('../models/Repertoire')
const Student = require('../models/Student')

const getRepertoires = async (req, res) => {
  try {
    const { studentId } = req.query
    const filter = studentId ? { studentId } : {}
    const repertoires = await Repertoire.find(filter)
      .sort({ recordDate: -1 })
      .populate('studentId', 'name phone')
    
    res.json({
      message: '获取成功',
      data: repertoires
    })
  } catch (error) {
    console.error('获取曲目列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const createRepertoire = async (req, res) => {
  try {
    const repertoire = await Repertoire.create(req.body)
    
    res.json({
      message: '创建成功',
      data: repertoire
    })
  } catch (error) {
    console.error('创建曲目错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const updateRepertoire = async (req, res) => {
  try {
    const { id } = req.params
    const repertoire = await Repertoire.findByIdAndUpdate(id, req.body, { new: true })
    
    if (!repertoire) {
      return res.status(404).json({ message: '曲目不存在' })
    }
    
    res.json({
      message: '更新成功',
      data: repertoire
    })
  } catch (error) {
    console.error('更新曲目错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const deleteRepertoire = async (req, res) => {
  try {
    const { id } = req.params
    await Repertoire.findByIdAndDelete(id)
    
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除曲目错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = {
  getRepertoires,
  createRepertoire,
  updateRepertoire,
  deleteRepertoire
}
