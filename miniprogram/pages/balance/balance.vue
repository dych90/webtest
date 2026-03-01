<template>
  <view class="balance-container">
    <view v-if="balances.length === 0" class="empty-tip">
      暂无课费余额数据
    </view>
    
    <view v-else class="balance-list">
      <view v-for="item in balances" :key="item._id" class="balance-item">
        <view class="balance-header">
          <text class="student-name">{{ item.studentId?.name || '未分配' }}</text>
          <text class="payment-type" :class="item.studentId?.paymentType">
            {{ item.studentId?.paymentType === 'prepaid' ? '预付费' : '单次付费' }}
          </text>
        </view>
        <view class="balance-body">
          <view class="balance-info">
            <text class="info-label">剩余课时</text>
            <text class="info-value" :class="{ warning: item.remainingLessons <= 5 }">
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
              <button class="minus-btn" @click="form.remainingLessons = Math.max(0, form.remainingLessons - 1)">-</button>
              <input class="number-field" v-model="form.remainingLessons" type="number" />
              <button class="plus-btn" @click="form.remainingLessons++">+</button>
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
            </view>
            
            <view class="report-details">
              <text class="details-title">上课明细</text>
              <view class="lesson-list">
                <view v-for="(lesson, index) in reportData.lessonDetails" :key="index" class="lesson-item">
                  <view class="lesson-info">
                    <text class="lesson-date">{{ formatDate(lesson.date) }}</text>
                    <text class="lesson-time">{{ formatTime(lesson.startTime) }}</text>
                  </view>
                  <view class="lesson-status">
                    <text v-if="lesson.isGiftLesson" class="status-tag gift">赠课</text>
                    <text v-else :class="['status-tag', lesson.status === 'attended' ? 'attended' : 'absent']">
                      {{ lesson.status === 'attended' ? '已上课' : '缺席' }}
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
import { onShow } from '@dcloudio/uni-app'
import { get, put } from '@/utils/request'

const balances = ref([])
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
  lessonDetails: []
})

const fetchBalances = async () => {
  try {
    const res = await get('/lesson-balances')
    balances.value = res.data || []
  } catch (error) {
    console.error('获取课费余额列表失败', error)
  }
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const handleUpdate = (item) => {
  form.studentId = item.studentId?._id || ''
  form.studentName = item.studentId?.name || '未分配'
  form.currentRemainingLessons = item.remainingLessons || 0
  form.remainingLessons = item.remainingLessons || 0
  dialogVisible.value = true
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
    const res = await get('/lesson-records', {
      studentId: reportForm.studentId
    })
    
    const startDate = new Date(reportForm.startDate)
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(reportForm.endDate)
    endDate.setHours(23, 59, 59, 999)
    
    const records = (res.data || []).filter(record => {
      const recordDate = new Date(record.recordDate)
      recordDate.setHours(0, 0, 0, 0)
      return recordDate >= startDate && recordDate <= endDate
    })
    
    const lessonDetails = records.map(record => ({
      date: record.recordDate,
      startTime: record.courseStartTime || record.recordDate,
      status: record.isDeducted ? 'attended' : 'missed',
      isGiftLesson: record.isGiftLesson || false
    }))
    
    reportData.totalLessons = records.length
    reportData.attendedLessons = records.filter(r => r.isDeducted).length
    reportData.missedLessons = records.filter(r => !r.isDeducted).length
    reportData.lessonDetails = lessonDetails
    reportData.remainingLessons = reportForm.remainingLessons
    reportData.paymentType = reportForm.paymentType
    
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
  const height = 600 + reportData.lessonDetails.length * 40
  
  canvasWidth.value = width * dpr
  canvasHeight.value = height * dpr
  ctx.scale(dpr, dpr)
  
  ctx.setFillStyle('#F9F7F2')
  ctx.fillRect(0, 0, width, height)
  
  ctx.setFillStyle('#2C3E50')
  ctx.setFontSize(18)
  ctx.setTextAlign('center')
  ctx.fillText(`「${reportForm.studentName}」· 上课情况报告`, width / 2, 40)
  
  ctx.setFillStyle('#909399')
  ctx.setFontSize(12)
  ctx.fillText(`时间范围：${formatDate(reportForm.startDate)} 至 ${formatDate(reportForm.endDate)}`, width / 2, 65)
  
  ctx.setFillStyle('#2C3E50')
  const summaryY = 100
  const summaryWidth = (width - 60) / 2
  roundRect(ctx, 20, summaryY, summaryWidth - 10, 80, 8, '#2C3E50')
  roundRect(ctx, summaryWidth + 30, summaryY, summaryWidth - 10, 80, 8, '#2C3E50')
  
  ctx.setFillStyle('#fff')
  ctx.setFontSize(12)
  ctx.setTextAlign('center')
  ctx.fillText('已上课', 20 + (summaryWidth - 10) / 2, summaryY + 30)
  ctx.setFontSize(28)
  ctx.setFillStyle('#67C23A')
  ctx.fillText(String(reportData.attendedLessons), 20 + (summaryWidth - 10) / 2, summaryY + 60)
  
  if (reportData.paymentType === 'prepaid') {
    ctx.setFillStyle('#fff')
    ctx.setFontSize(12)
    ctx.fillText('剩余课时', summaryWidth + 30 + (summaryWidth - 10) / 2, summaryY + 30)
    ctx.setFontSize(28)
    ctx.setFillStyle('#E6A23C')
    ctx.fillText(String(reportData.remainingLessons), summaryWidth + 30 + (summaryWidth - 10) / 2, summaryY + 60)
  }
  
  ctx.setFillStyle('#2C3E50')
  ctx.setFontSize(14)
  ctx.setTextAlign('left')
  ctx.fillText('上课明细', 20, 220)
  
  let y = 250
  reportData.lessonDetails.forEach((lesson, index) => {
    if (y > height - 50) return
    
    ctx.setFillStyle('#f5f7fa')
    roundRect(ctx, 20, y, width - 40, 35, 6, '#f5f7fa')
    
    ctx.setFillStyle('#333')
    ctx.setFontSize(12)
    ctx.fillText(`${formatDate(lesson.date)} ${formatTime(lesson.startTime)}`, 30, y + 22)
    
    const statusText = lesson.isGiftLesson ? '赠课' : (lesson.status === 'attended' ? '已上课' : '缺席')
    const statusColor = lesson.isGiftLesson ? '#9b59b6' : (lesson.status === 'attended' ? '#67C23A' : '#F56C6C')
    ctx.setFillStyle(statusColor)
    ctx.setTextAlign('right')
    ctx.fillText(statusText, width - 30, y + 22)
    ctx.setTextAlign('left')
    
    y += 45
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
  text += `\n上课明细：\n`
  
  reportData.lessonDetails.forEach(lesson => {
    const statusText = lesson.isGiftLesson ? '赠课' : (lesson.status === 'attended' ? '已上课' : '缺席')
    text += `${formatDate(lesson.date)} ${formatTime(lesson.startTime)} - ${statusText}\n`
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
</script>

<style scoped>
.balance-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.empty-tip {
  text-align: center;
  padding: 100rpx 0;
  color: #909399;
  font-size: 28rpx;
}

.balance-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.balance-item {
  background-color: #fff;
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

.student-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.payment-type {
  font-size: 22rpx;
  padding: 6rpx 12rpx;
  border-radius: 6rpx;
}

.payment-type.prepaid {
  background-color: #ecf5ff;
  color: #409EFF;
}

.payment-type.payPerLesson {
  background-color: #f0f9eb;
  color: #67C23A;
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
  color: #909399;
}

.info-value {
  font-size: 26rpx;
  color: #333;
  font-weight: bold;
}

.info-value.warning {
  color: #E6A23C;
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
  background-color: #67C23A;
  color: #fff;
  font-size: 24rpx;
  border: none;
  border-radius: 8rpx;
}

.btn-update {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  background-color: #409EFF;
  color: #fff;
  font-size: 24rpx;
  border: none;
  border-radius: 8rpx;
}

.btn-update[disabled] {
  background-color: #c0c4cc;
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
  background-color: #fff;
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
  color: #333;
}

.dialog-close {
  font-size: 40rpx;
  color: #909399;
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
  color: #333;
  margin-bottom: 12rpx;
}

.form-value {
  font-size: 28rpx;
  color: #606266;
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
  color: #909399;
}

.number-input {
  display: flex;
  align-items: center;
}

.minus-btn, .plus-btn {
  width: 80rpx;
  height: 80rpx;
  font-size: 36rpx;
  background-color: #f5f7fa;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
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
  background-color: #fff;
  color: #606266;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-save {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #409EFF;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-share {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #67C23A;
  color: #fff;
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
  color: #333;
  margin-bottom: 12rpx;
}

.report-subtitle {
  font-size: 24rpx;
  color: #909399;
}

.report-summary {
  display: flex;
  justify-content: center;
  gap: 40rpx;
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
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
}

.summary-value.attended {
  color: #67C23A;
}

.summary-value.remaining {
  color: #E6A23C;
}

.report-details {
  margin-bottom: 20rpx;
}

.details-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
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
  background-color: #f5f7fa;
  border-radius: 8rpx;
  border-left: 4rpx solid #409EFF;
}

.lesson-info {
  display: flex;
  gap: 16rpx;
}

.lesson-date {
  font-size: 26rpx;
  color: #333;
}

.lesson-time {
  font-size: 24rpx;
  color: #909399;
}

.status-tag {
  font-size: 22rpx;
  padding: 6rpx 12rpx;
  border-radius: 4rpx;
  color: #fff;
}

.status-tag.attended {
  background-color: #67C23A;
}

.status-tag.absent {
  background-color: #F56C6C;
}

.status-tag.gift {
  background-color: #9b59b6;
}

.share-canvas {
  position: fixed;
  left: -9999rpx;
  top: 0;
}
</style>
