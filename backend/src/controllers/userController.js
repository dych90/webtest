const User = require('../models/User')
const bcrypt = require('bcryptjs')

const getUsers = async (req, res) => {
  try {
    const { role } = req.query
    const query = {}
    
    if (role) {
      query.role = role
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
    
    res.json({
      message: '获取成功',
      data: users
    })
  } catch (error) {
    console.error('获取用户列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const createUser = async (req, res) => {
  try {
    const { username, password, role, name, phone } = req.body
    
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const user = await User.create({
      username,
      password: hashedPassword,
      role: role || 'teacher',
      name,
      phone
    })
    
    res.json({
      message: '创建成功',
      data: {
        _id: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
        phone: user.phone
      }
    })
  } catch (error) {
    console.error('创建用户错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { password, name, phone, role } = req.body
    
    const updateData = { name, phone, role }
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }
    
    const user = await User.findByIdAndUpdate(id, updateData, { new: true })
      .select('-password')
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }
    
    res.json({
      message: '更新成功',
      data: user
    })
  } catch (error) {
    console.error('更新用户错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params
    
    if (id === req.user._id) {
      return res.status(400).json({ message: '不能删除自己的账号' })
    }
    
    await User.findByIdAndDelete(id)
    
    res.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除用户错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

const getTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .select('-password')
      .sort({ name: 1 })
    
    res.json({
      message: '获取成功',
      data: teachers
    })
  } catch (error) {
    console.error('获取教师列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getTeachers
}
