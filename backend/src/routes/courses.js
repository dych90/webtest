const express = require('express')
const router = express.Router()
const courseController = require('../controllers/courseController')
const { authenticateToken } = require('../middleware/auth')

router.get('/courses', authenticateToken, (req, res, next) => {
  console.log('GET /courses - 获取课程列表')
  next()
}, courseController.getCourses)

router.post('/courses', authenticateToken, (req, res, next) => {
  console.log('POST /courses - 创建课程')
  next()
}, courseController.createCourse)

router.put('/courses/:id', authenticateToken, (req, res, next) => {
  console.log('PUT /courses/:id - 更新课程，ID:', req.params.id)
  console.log('请求体:', req.body)
  next()
}, courseController.updateCourse)

router.delete('/courses/:id', authenticateToken, (req, res, next) => {
  console.log('DELETE /courses/:id - 删除课程，ID:', req.params.id)
  next()
}, courseController.deleteCourse)

module.exports = router
