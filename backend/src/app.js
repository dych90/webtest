const express = require('express')
const cors = require('cors')
const { connectDB } = require('./utils/database')
require('dotenv').config()

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.json({ message: '钢琴工作室管理系统 API' })
})

const authRoutes = require('./routes/auth')
const studentRoutes = require('./routes/students')
const courseTypeRoutes = require('./routes/courseTypes')
const paymentRoutes = require('./routes/payments')
const courseRoutes = require('./routes/courses')
const lessonRecordRoutes = require('./routes/lessonRecords')
const repertoireRoutes = require('./routes/repertoires')
const lessonBalanceRoutes = require('./routes/lessonBalances')
const statisticsRoutes = require('./routes/statistics')
const feeStandardRoutes = require('./routes/feeStandards')
const reminderRoutes = require('./routes/reminders')

app.use('/api', authRoutes)
app.use('/api', studentRoutes)
app.use('/api', courseTypeRoutes)
app.use('/api', paymentRoutes)
app.use('/api', courseRoutes)
app.use('/api', lessonRecordRoutes)
app.use('/api', repertoireRoutes)
app.use('/api', lessonBalanceRoutes)
app.use('/api', statisticsRoutes)
app.use('/api', feeStandardRoutes)
app.use('/api', reminderRoutes)

const PORT = process.env.PORT || 3000

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })
}).catch((error) => {
  console.error('数据库连接失败:', error)
  process.exit(1)
})
