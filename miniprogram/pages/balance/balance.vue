<template>
  <view class="balance-container">
    <view class="search-bar">
      <input 
        class="search-input" 
        placeholder="搜索学生姓名" 
        v-model="searchKeyword"
        @input="filterBalances"
      />
      <view class="search-icon">🔍</view>
    </view>
    
    <view v-if="filteredBalances.length === 0" class="empty-tip">
      {{ searchKeyword ? '未找到匹配的学生' : '暂无课费余额数据' }}
    </view>
    
    <view v-else class="balance-list">
      <view v-for="(item, index) in filteredBalances" :key="item._id" class="balance-item">
        <view class="balance-header">
          <view class="student-info-row">
            <view class="student-index">
              <text>{{ index + 1 }}</text>
            </view>
            <text class="student-name">{{ formatStudentName(item.studentId?.name) }}</text>
          </view>
          <text class="payment-type" :class="item.studentId?.paymentType">
            {{ getPaymentTypeText(item.studentId?.paymentType) }}
          </text>
        </view>
        <view class="balance-body">
          <view class="balance-info">
            <text class="info-label">剩余课时</text>
            <text class="info-value" :class="{ warning: item.studentId?.paymentType === 'prepaid' && item.remainingLessons <= 5 }">
              {{ item.studentId?.paymentType === 'prepaid' ? item.remainingLessons + ' 课时' : '-' }}
            </text>
          </view>
          <view class="balance-info">
            <text class="info-label">最后更新</text>
            <text class="info-value">{{ formatDate(item.lastUpdated) }}</text>
          </view>
        </view>
        <view class="balance-actions">
          <button class="btn-report" @click="handleGenerateReport(item)">生成报告</button>
          <button 
            class="btn-update" 
            @click="handleUpdate(item)"
            :disabled="item.studentId?.paymentType !== 'prepaid'"
          >
            更新余额
          </button>
        </view>
      </view>
    </view>
    
    <view class="dialog-mask" v-if="dialogVisible" @click="dialogVisible = false">
      <view class="dialog-content" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">更新课费余额</text>
          <text class="dialog-close" @click="dialogVisible = false">×</text>
        </view>
        <view class="dialog-body">
          <view class="form-item">
            <text class="form-label">学生</text>
            <text class="form-value">{{ form.studentName }}</text>
          </view>
          <view class="form-item">
            <text class="form-label">当前余额</text>
            <text class="form-value">{{ form.currentRemainingLessons }} 课时</text>
          </view>
          <view class="form-item">
            <text class="form-label">新余额</text>
            <view class="number-input">
              <button class="sign-btn" @click="toggleSign">{{ form.remainingLessons < 0 ? '+' : '-' }}</button>
              <button class="minus-btn" @click="adjustBalance(-0.5)">-0.5</button>
              <input class="number-field" v-model="form.remainingLessons" type="digit" />
              <button class="plus-btn" @click="adjustBalance(0.5)">+0.5</button>
            </view>
          </view>
        </view>
        <view class="dialog-footer">
          <button class="btn-cancel" @click="dialogVisible = false">取消</button>
          <button class="btn-save" @click="handleSave">保存</button>
        </view>
      </view>
    </view>
    
    <view class="dialog-mask" v-if="reportDialogVisible" @click="reportDialogVisible = false">
      <view class="dialog-content report-dialog" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">上课情况报告</text>
          <text class="dialog-close" @click="reportDialogVisible = false">×</text>
        </view>
        <view class="dialog-body">
          <view class="form-item">
            <text class="form-label">学生</text>
            <text class="form-value">{{ reportForm.studentName }}</text>
          </view>
          <view class="form-item">
            <text class="form-label">开始日期</text>
            <picker mode="date" :value="reportForm.startDate" @change="onStartDateChange">
              <view class="form-picker">
                <text>{{ reportForm.startDate || '请选择日期' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">结束日期</text>
            <picker mode="date" :value="reportForm.endDate" @change="onEndDateChange">
              <view class="form-picker">
                <text>{{ reportForm.endDate || '请选择日期' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
        </view>
        <view class="dialog-footer">
          <button class="btn-cancel" @click="reportDialogVisible = false">取消</button>
          <button class="btn-save" @click="handleGenerateReportData">生成报告</button>
        </view>
      </view>
    </view>
    
    <view class="dialog-mask" v-if="reportDataVisible" @click="reportDataVisible = false">
      <view class="dialog-content report-result" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">上课情况报告</text>
          <text class="dialog-close" @click="reportDataVisible = false">×</text>
        </view>
        <scroll-view scroll-y class="report-scroll">
          <view class="report-container" id="reportContainer">
            <view class="report-header">
              <text class="report-title">「{{ reportForm.studentName }}」· 上课情况报告</text>
              <text class="report-subtitle">
                时间范围：{{ formatDate(reportForm.startDate) }} 至 {{ formatDate(reportForm.endDate) }}
              </text>
            </view>
            
            <view class="report-summary">
              <view class="summary-item">
                <text class="summary-label">已上课</text>
                <text class="summary-value attended">{{ reportData.attendedLessons }}</text>
              </view>
              <view class="summary-item" v-if="reportData.paymentType === 'prepaid'">
                <text class="summary-label">剩余课时</text>
                <text class="summary-value remaining">{{ reportData.remainingLessons }}</text>
              </view>
              <view class="summary-item">
                <text class="summary-label">成长等级</text>
                <text class="summary-value growth">{{ reportData.growthLevel }}</text>
              </view>
              <view class="summary-item">
                <text class="summary-label">可用积分</text>
                <text class="summary-value points">{{ reportData.availablePoints }}</text>
              </view>
            </view>
            
            <view class="report-details">
              <text class="details-title">上课明细</text>
              <view class="lesson-list">
                <view v-for="(lesson, index) in reportData.lessonDetails" :key="index" class="lesson-item">
                  <view class="lesson-index">
                    <text>{{ index + 1 }}</text>
                  </view>
                  <view class="lesson-info">
                    <view class="lesson-main-row">
                      <text class="lesson-date">{{ formatDate(lesson.date) }} {{ getWeekDay(lesson.date) }}</text>
                      <text class="lesson-time">{{ formatTime(lesson.startTime) }}</text>
                    </view>
                    <text v-if="lesson.notes" class="lesson-note">备注：{{ lesson.notes }}</text>
                  </view>
                  <view class="lesson-status">
                    <text v-if="lesson.isGiftLesson" class="status-tag gift">{{ getLessonStatusText(lesson) }}</text>
                    <text v-else :class="['status-tag', lesson.status === 'attended' ? 'attended' : 'absent']">
                      {{ getLessonStatusText(lesson) }}
                    </text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="dialog-footer">
          <button class="btn-cancel" @click="reportDataVisible = false">关闭</button>
          <button class="btn-share" @click="handleShareReport">分享报告</button>
        </view>
      </view>
    </view>
    
    <canvas canvas-id="shareCanvas" class="share-canvas" :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"></canvas>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import { get, put } from '@/utils/request'
import { getPaymentTypeText } from '@/utils/paymentType'
import { formatGrowthLevel } from '@/utils/reward'

const balances = ref([])
const searchKeyword = ref('')
const filteredBalances = ref([])
const dialogVisible = ref(false)
const reportDialogVisible = ref(false)
const reportDataVisible = ref(false)
const canvasWidth = ref(375)
const canvasHeight = ref(800)

const form = reactive({
  studentId: '',
  studentName: '',
  currentRemainingLessons: 0,
  remainingLessons: 0
})

const reportForm = reactive({
  studentId: '',
  studentName: '',
  startDate: '',
  endDate: '',
  remainingLessons: 0,
  paymentType: 'prepaid'
})

const reportData = reactive({
  totalLessons: 0,
  attendedLessons: 0,
  missedLessons: 0,
  remainingLessons: 0,
  paymentType: 'prepaid',
  growthLevel: '成长值：0',
  totalGrowthStars: 0,
  availablePoints: 0,
  lessonDetails: []
})

const SYSTEM_REPORT_NOTES = new Set([
  '批量添加',
  '批量添加-自动消课',
  '从课程详情上课',
  '从首页直接上课',
  '从消课管理直接上课',
  '从排课直接上课'
])

const fetchBalances = async () => {
  try {
    const res = await get('/lesson-balances')
    balances.value = res.data || []
    filterBalances()
  } catch (error) {
    console.error('获取课费余额列表失败', error)
  }
}

const filterBalances = () => {
  if (!searchKeyword.value.trim()) {
    filteredBalances.value = balances.value
  } else {
    const keyword = searchKeyword.value.trim().toLowerCase()
    filteredBalances.value = balances.value.filter(item => {
      const name = item.studentId?.name || ''
      return name.toLowerCase().includes(keyword)
    })
  }
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatStudentName = (name) => {
  if (!name) return '未分配'
  return name.replace(/（/g, '(').replace(/）/g, ')')
}

const formatTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const getWeekDay = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[d.getDay()]
}

const formatLessonCount = (value) => {
  const count = Number(value)
  if (!Number.isFinite(count) || count <= 0 || Math.abs(count - 1) < 0.001) {
    return ''
  }

  return `${Number.isInteger(count) ? count : count.toFixed(2).replace(/\.?0+$/, '')}课时`
}

const getLessonStatusText = (lesson) => {
  const statusText = lesson.isGiftLesson ? '赠课' : (lesson.status === 'attended' ? '已上课' : '缺席')
  const lessonCountText = formatLessonCount(lesson.lessonsConsumed)
  return lessonCountText ? `${statusText} · ${lessonCountText}` : statusText
}

const getVisibleNotes = (value) => {
  const notes = String(value || '').trim()
  if (!notes || SYSTEM_REPORT_NOTES.has(notes)) return ''
  return notes
}

const getReportNotes = (record) => {
  return getVisibleNotes(record.courseId?.notes) || getVisibleNotes(record.notes)
}

const getWrappedNoteLines = (notes, maxLength = 22) => {
  const text = String(notes || '').trim()
  if (!text) return []

  const lines = []
  for (let i = 0; i < text.length; i += maxLength) {
    lines.push(text.slice(i, i + maxLength))
  }
  return lines
}

const handleUpdate = (item) => {
  form.studentId = item.studentId?._id || ''
  form.studentName = item.studentId?.name || '未分配'
  form.currentRemainingLessons = item.remainingLessons || 0
  form.remainingLessons = item.remainingLessons || 0
  dialogVisible.value = true
}

const toggleSign = () => {
  form.remainingLessons = -form.remainingLessons
}

const adjustBalance = (amount) => {
  const current = parseFloat(form.remainingLessons) || 0
  form.remainingLessons = (current + amount).toFixed(1)
}

const handleSave = async () => {
  try {
    await put('/lesson-balances', {
      studentId: form.studentId,
      remainingLessons: form.remainingLessons
    })
    uni.showToast({ title: '更新成功', icon: 'success' })
    dialogVisible.value = false
    await fetchBalances()
  } catch (error) {
    uni.showToast({ title: error.message || '更新失败', icon: 'none' })
  }
}

const handleGenerateReport = async (item) => {
  try {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    
    reportForm.studentId = item.studentId?._id || ''
    reportForm.studentName = item.studentId?.name || '未分配'
    reportForm.startDate = formatDate(startDate)
    reportForm.endDate = formatDate(now)
    reportForm.remainingLessons = item.remainingLessons || 0
    reportForm.paymentType = item.studentId?.paymentType || 'prepaid'
    
    reportDialogVisible.value = true
  } catch (error) {
    uni.showToast({ title: error.message || '操作失败', icon: 'none' })
  }
}

const onStartDateChange = (e) => {
  reportForm.startDate = e.detail.value
}

const onEndDateChange = (e) => {
  reportForm.endDate = e.detail.value
}

const handleGenerateReportData = async () => {
  try {
    const [res, rewardRes] = await Promise.all([
      get('/lesson-records', {
        studentId: reportForm.studentId,
        accountOnly: true
      }),
      get(`/students/${reportForm.studentId}/reward-overview`)
    ])
    
    const startDate = new Date(reportForm.startDate)
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(reportForm.endDate)
    endDate.setHours(23, 59, 59, 999)
    
    const records = (res.data || []).filter(record => {
      const courseStartTime = record.courseStartTime ? new Date(record.courseStartTime) : new Date(record.recordDate)
      courseStartTime.setHours(0, 0, 0, 0)
      return courseStartTime >= startDate && courseStartTime <= endDate
    })
    
    const uniqueRecords = []
    const seenCourses = new Set()
    
    for (const record of records) {
      if (record.courseId) {
        const courseIdStr = record.courseId._id || record.courseId
        if (seenCourses.has(courseIdStr.toString())) {
          continue
        }
        seenCourses.add(courseIdStr.toString())
      }
      uniqueRecords.push(record)
    }
    
    const lessonDetails = uniqueRecords.map(record => ({
      date: record.courseStartTime || record.recordDate,
      startTime: record.courseStartTime || record.recordDate,
      status: record.isDeducted ? 'attended' : 'missed',
      isGiftLesson: record.isGiftLesson || false,
      lessonsConsumed: record.lessonsConsumed || 0,
      notes: getReportNotes(record)
    })).sort((a, b) => new Date(a.date) - new Date(b.date))
    
    const attendedLessons = uniqueRecords
      .filter(r => r.isDeducted)
      .reduce((sum, r) => sum + (r.lessonsConsumed || 0), 0)
    
    const missedLessons = uniqueRecords
      .filter(r => !r.isDeducted)
      .reduce((sum, r) => sum + (r.lessonsConsumed || 0), 0)
    
    reportData.totalLessons = attendedLessons + missedLessons
    reportData.attendedLessons = attendedLessons
    reportData.missedLessons = missedLessons
    reportData.lessonDetails = lessonDetails
    reportData.remainingLessons = reportForm.remainingLessons
    reportData.paymentType = reportForm.paymentType
    reportData.growthLevel = formatGrowthLevel(rewardRes.data?.growthOverview)
    reportData.totalGrowthStars = rewardRes.data?.growthOverview?.totalGrowthStars || 0
    reportData.availablePoints = rewardRes.data?.pointBalance?.availablePoints || 0
    
    reportDialogVisible.value = false
    reportDataVisible.value = true
  } catch (error) {
    uni.showToast({ title: error.message || '生成报告失败', icon: 'none' })
  }
}

const handleShareReport = () => {
  uni.showActionSheet({
    itemList: ['保存图片到相册', '复制报告内容'],
    success: (res) => {
      if (res.tapIndex === 0) {
        saveReportImage()
      } else if (res.tapIndex === 1) {
        copyReportText()
      }
    }
  })
}

const saveReportImage = () => {
  uni.showLoading({ title: '生成图片中...' })
  
  const ctx = uni.createCanvasContext('shareCanvas')
  const dpr = uni.getSystemInfoSync().pixelRatio || 2
  const width = 375
  const noteLineCount = reportData.lessonDetails
    .reduce((sum, lesson) => sum + getWrappedNoteLines(lesson.notes).length, 0)
  const height = 680 + reportData.lessonDetails.length * 40 + noteLineCount * 18
  
  canvasWidth.value = width * dpr
  canvasHeight.value = height * dpr
  ctx.scale(dpr, dpr)
  
  ctx.setFillStyle('#F9F7F2')
  ctx.fillRect(0, 0, width, height)
  
  ctx.setFillStyle('#2C3E50')
  ctx.setFontSize(18)
  ctx.setTextAlign('center')
  ctx.fillText(`「${reportForm.studentName}」· 上课情况报告`, width / 2, 40)
  
  ctx.setFillStyle('#8B8176')
  ctx.setFontSize(12)
  ctx.fillText(`时间范围：${formatDate(reportForm.startDate)} 至 ${formatDate(reportForm.endDate)}`, width / 2, 65)
  
  ctx.setFillStyle('#2C3E50')
  const summaryY = 100
  const summaryWidth = (width - 60) / 2
  const summaryItems = [
    { label: '已上课', value: String(reportData.attendedLessons), color: '#5F724C' }
  ]

  if (reportData.paymentType === 'prepaid') {
    summaryItems.push({ label: '剩余课时', value: String(reportData.remainingLessons), color: '#A26B39' })
  }

  summaryItems.push(
    { label: '成长等级', value: reportData.growthLevel, color: '#FFFDF8', small: true },
    { label: '可用积分', value: `${reportData.availablePoints}积分`, color: '#FFFDF8', small: true }
  )

  summaryItems.forEach((item, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const x = col === 0 ? 20 : summaryWidth + 30
    const y = summaryY + row * 90

    roundRect(ctx, x, y, summaryWidth - 10, 80, 8, '#2C3E50')
    ctx.setFillStyle('#FFFDF8')
    ctx.setFontSize(12)
    ctx.setTextAlign('center')
    ctx.fillText(item.label, x + (summaryWidth - 10) / 2, y + 28)
    ctx.setFontSize(item.small ? 16 : 28)
    ctx.setFillStyle(item.color)
    ctx.fillText(item.value, x + (summaryWidth - 10) / 2, y + 60)
  })
  
  const detailsTitleY = summaryY + Math.ceil(summaryItems.length / 2) * 90 + 30
  ctx.setFillStyle('#2C3E50')
  ctx.setFontSize(14)
  ctx.setTextAlign('left')
  ctx.fillText('上课明细', 20, detailsTitleY)
  
  let y = detailsTitleY + 30
  reportData.lessonDetails.forEach((lesson, index) => {
    if (y > height - 50) return
    const noteLines = getWrappedNoteLines(lesson.notes)
    const itemHeight = 35 + noteLines.length * 18
    
    ctx.setFillStyle('#FBF6EE')
    roundRect(ctx, 20, y, width - 40, itemHeight, 6, '#FBF6EE')
    
    ctx.setFillStyle('#5F724C')
    ctx.setFontSize(10)
    ctx.fillText(`${index + 1}.`, 30, y + 22)
    
    ctx.setFillStyle('#3F352B')
    ctx.setFontSize(12)
    ctx.fillText(`${formatDate(lesson.date)} ${getWeekDay(lesson.date)} ${formatTime(lesson.startTime)}`, 50, y + 22)
    
    const statusText = getLessonStatusText(lesson)
    const statusColor = lesson.isGiftLesson ? '#B8793E' : (lesson.status === 'attended' ? '#5F724C' : '#A0523E')
    ctx.setFillStyle(statusColor)
    ctx.setTextAlign('right')
    ctx.fillText(statusText, width - 30, y + 22)
    ctx.setTextAlign('left')

    if (noteLines.length > 0) {
      ctx.setFillStyle('#8B8176')
      ctx.setFontSize(10)
      noteLines.forEach((line, lineIndex) => {
        const prefix = lineIndex === 0 ? '备注：' : '　　　'
        ctx.fillText(`${prefix}${line}`, 50, y + 42 + lineIndex * 18)
      })
    }
    
    y += itemHeight + 10
  })
  
  ctx.draw(false, () => {
    setTimeout(() => {
      uni.canvasToTempFilePath({
        canvasId: 'shareCanvas',
        success: (res) => {
          uni.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              uni.hideLoading()
              uni.showToast({ title: '已保存到相册', icon: 'success' })
            },
            fail: (err) => {
              uni.hideLoading()
              if (err.errMsg.includes('auth deny')) {
                uni.showModal({
                  title: '提示',
                  content: '需要您授权保存图片到相册',
                  confirmText: '去授权',
                  success: (res) => {
                    if (res.confirm) {
                      uni.openSetting()
                    }
                  }
                })
              } else {
                uni.showToast({ title: '保存失败', icon: 'none' })
              }
            }
          })
        },
        fail: () => {
          uni.hideLoading()
          uni.showToast({ title: '生成图片失败', icon: 'none' })
        }
      })
    }, 500)
  })
}

const roundRect = (ctx, x, y, width, height, radius, color) => {
  ctx.setFillStyle(color)
  ctx.beginPath()
  ctx.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5)
  ctx.arc(x + width - radius, y + radius, radius, Math.PI * 1.5, Math.PI * 2)
  ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI * 0.5)
  ctx.arc(x + radius, y + height - radius, radius, Math.PI * 0.5, Math.PI)
  ctx.closePath()
  ctx.fill()
}

const copyReportText = () => {
  let text = `「${reportForm.studentName}」上课情况报告\n`
  text += `时间范围：${formatDate(reportForm.startDate)} 至 ${formatDate(reportForm.endDate)}\n\n`
  text += `已上课：${reportData.attendedLessons} 节\n`
  if (reportData.paymentType === 'prepaid') {
    text += `剩余课时：${reportData.remainingLessons} 课时\n`
  }
  text += `成长等级：${reportData.growthLevel}\n`
  text += `可用积分：${reportData.availablePoints} 积分\n`
  text += `\n上课明细：\n`
  
  reportData.lessonDetails.forEach((lesson, index) => {
    const statusText = getLessonStatusText(lesson)
    const notesText = lesson.notes ? `（备注：${lesson.notes}）` : ''
    text += `${index + 1}. ${formatDate(lesson.date)} ${getWeekDay(lesson.date)} ${formatTime(lesson.startTime)} - ${statusText}${notesText}\n`
  })
  
  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
    }
  })
}

onMounted(() => {
  fetchBalances()
})

onShow(() => {
  fetchBalances()
})

onLoad((options) => {
  if (options.search) {
    searchKeyword.value = decodeURIComponent(options.search)
    // 延迟执行搜索，确保数据已加载
    setTimeout(() => {
      filterBalances()
    }, 300)
  }
})
</script>

<style scoped>
.balance-container {
  padding: 20rpx;
  background-color: #F7EFE3;
  min-height: 100vh;
}

.search-bar {
  display: flex;
  align-items: center;
  background-color: #FFFDF8;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 20rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  border: none;
  outline: none;
  background: transparent;
}

.search-input::placeholder {
  color: #C4AA84;
}

.search-icon {
  font-size: 32rpx;
  color: #8B8176;
  margin-left: 16rpx;
}

.empty-tip {
  text-align: center;
  padding: 100rpx 0;
  color: #8B8176;
  font-size: 28rpx;
}

.balance-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.balance-item {
  background-color: #FFFDF8;
  border-radius: 16rpx;
  padding: 24rpx;
}

.balance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.student-info-row {
  display: flex;
  align-items: center;
}

.student-index {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: #5F724C;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.student-index text {
  font-size: 22rpx;
  color: #FFFDF8;
  font-weight: bold;
}

.student-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #3F352B;
}

.payment-type {
  font-size: 22rpx;
  padding: 6rpx 12rpx;
  border-radius: 6rpx;
}

.payment-type.prepaid {
  background-color: #E7EFE3;
  color: #5F724C;
}

.payment-type.payPerLesson {
  background-color: #EAF1E3;
  color: #5F724C;
}

.payment-type.free {
  background-color: #F3EBDD;
  color: #8B8176;
}

.balance-body {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.balance-info {
  display: flex;
  justify-content: space-between;
}

.info-label {
  font-size: 26rpx;
  color: #8B8176;
}

.info-value {
  font-size: 26rpx;
  color: #3F352B;
  font-weight: bold;
}

.info-value.warning {
  color: #A26B39;
}

.balance-actions {
  display: flex;
  gap: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.btn-report {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  background-color: #5F724C;
  color: #FFFDF8;
  font-size: 24rpx;
  border: none;
  border-radius: 8rpx;
}

.btn-update {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  background-color: #5F724C;
  color: #FFFDF8;
  font-size: 24rpx;
  border: none;
  border-radius: 8rpx;
}

.btn-update[disabled] {
  background-color: #C4AA84;
}

.dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.dialog-content {
  width: 90%;
  max-width: 600rpx;
  background-color: #FFFDF8;
  border-radius: 20rpx;
  overflow: hidden;
}

.report-dialog {
  max-width: 650rpx;
}

.report-result {
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #3F352B;
}

.dialog-close {
  font-size: 40rpx;
  color: #8B8176;
}

.dialog-body {
  padding: 30rpx;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #3F352B;
  margin-bottom: 12rpx;
}

.form-value {
  font-size: 28rpx;
  color: #6F6254;
}

.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 80rpx;
  padding: 0 20rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.picker-arrow {
  font-size: 20rpx;
  color: #8B8176;
}

.number-input {
  display: flex;
  align-items: center;
}

.minus-btn, .plus-btn {
  width: 100rpx;
  height: 80rpx;
  font-size: 28rpx;
  background-color: #FBF6EE;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sign-btn {
  width: 80rpx;
  height: 80rpx;
  font-size: 36rpx;
  font-weight: bold;
  background-color: #E7EFE3;
  border: 2rpx solid #91d5ff;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5F724C;
}

.number-field {
  flex: 1;
  height: 80rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: bold;
  border: 2rpx solid #dcdfe6;
  border-left: none;
  border-right: none;
}

.dialog-footer {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
}

.btn-cancel {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #FFFDF8;
  color: #6F6254;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-save {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #5F724C;
  color: #FFFDF8;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-share {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #5F724C;
  color: #FFFDF8;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.report-scroll {
  max-height: 60vh;
}

.report-container {
  padding: 20rpx;
}

.report-header {
  text-align: center;
  margin-bottom: 30rpx;
}

.report-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #3F352B;
  margin-bottom: 12rpx;
}

.report-subtitle {
  font-size: 24rpx;
  color: #8B8176;
}

.report-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
  padding: 30rpx;
  background: linear-gradient(135deg, #2C3E50 0%, #1A252F 100%);
  border-radius: 12rpx;
  margin-bottom: 30rpx;
}

.summary-item {
  text-align: center;
}

.summary-label {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8rpx;
}

.summary-value {
  display: block;
  font-size: 40rpx;
  line-height: 48rpx;
  font-weight: bold;
  color: #FFFDF8;
  word-break: break-all;
}

.summary-value.attended {
  color: #5F724C;
}

.summary-value.remaining {
  color: #A26B39;
}

.summary-value.growth,
.summary-value.points {
  color: #FFFDF8;
  font-size: 30rpx;
}

.report-details {
  margin-bottom: 20rpx;
}

.details-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #3F352B;
  margin-bottom: 20rpx;
}

.lesson-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.lesson-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  background-color: #FBF6EE;
  border-radius: 8rpx;
  border-left: 4rpx solid #5F724C;
}

.lesson-index {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background-color: #5F724C;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.lesson-index text {
  font-size: 20rpx;
  color: #FFFDF8;
  font-weight: bold;
}

.lesson-info {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}

.lesson-main-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-wrap: wrap;
}

.lesson-date {
  font-size: 26rpx;
  color: #3F352B;
}

.lesson-time {
  font-size: 24rpx;
  color: #8B8176;
}

.lesson-note {
  font-size: 22rpx;
  line-height: 30rpx;
  color: #8B8176;
  word-break: break-all;
}

.lesson-status {
  flex-shrink: 0;
}

.status-tag {
  font-size: 22rpx;
  padding: 6rpx 12rpx;
  border-radius: 4rpx;
  color: #FFFDF8;
}

.status-tag.attended {
  background-color: #5F724C;
}

.status-tag.absent {
  background-color: #A0523E;
}

.status-tag.gift {
  background-color: #B8793E;
}

.share-canvas {
  position: fixed;
  left: -9999rpx;
  top: 0;
}
</style>
