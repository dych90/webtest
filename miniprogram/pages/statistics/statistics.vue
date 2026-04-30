<template>
  <view class="statistics-container">
    <view class="section-title">总体数据</view>
    <view class="stats-grid">
      <view class="stat-card">
        <text class="stat-value">{{ statistics.studentCount }}</text>
        <text class="stat-label">学生总数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value revenue">¥{{ statistics.totalRevenue }}</text>
        <text class="stat-label">总收入</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ statistics.totalLessonsAttended }}</text>
        <text class="stat-label">总上课数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value warning">{{ statistics.totalRemainingLessons }}</text>
        <text class="stat-label">剩余课时</text>
      </view>
    </view>
    
    <view class="section-header">
      <text class="section-title">月度数据</text>
      <view class="month-nav">
        <view class="nav-btn" @click="prevMonth">
          <text>‹</text>
        </view>
        <text class="month-text">{{ monthDisplayText }}</text>
        <view class="nav-btn" @click="nextMonth" :class="{ 'nav-disabled': isCurrentMonth }">
          <text>›</text>
        </view>
      </view>
    </view>
    <view class="stats-grid">
      <view class="stat-card">
        <text class="stat-value warning">¥{{ statistics.monthlyPrepaidRevenue }}</text>
        <text class="stat-label">{{ monthLabel }}预收入</text>
      </view>
      <view class="stat-card">
        <text class="stat-value success">¥{{ statistics.monthlyActualRevenue }}</text>
        <text class="stat-label">{{ monthLabel }}实际收入</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ statistics.monthlyLessonsConsumed }}</text>
        <text class="stat-label">{{ monthLabel }}应上课时</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ statistics.monthlyLessonsAttended }}</text>
        <text class="stat-label">{{ monthLabel }}上课数</text>
      </view>
    </view>
    
    <view class="chart-section">
      <view class="chart-header">
        <view class="chart-tabs">
          <view 
            class="chart-tab" 
            :class="{ active: chartType === 'month' }" 
            @click="switchChartType('month')"
          >
            按月统计
          </view>
          <view 
            class="chart-tab" 
            :class="{ active: chartType === 'year' }" 
            @click="switchChartType('year')"
          >
            按年统计
          </view>
        </view>
        <view class="year-selector" v-if="chartType === 'month'">
          <picker mode="selector" :range="yearOptions" :value="getYearIndex()" @change="onYearChange">
            <view class="year-picker">
              <text>{{ currentYear }}年</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>
      
      <view class="chart-card">
        <view class="chart-title">收入统计</view>
        <view class="chart-canvas-wrapper">
          <canvas 
            canvas-id="incomeChart" 
            id="incomeChart"
            class="chart-canvas"
            type="2d"
          ></canvas>
        </view>
        <view class="chart-legend">
          <view class="legend-item">
            <view class="legend-color prepaid"></view>
            <text>预收入</text>
          </view>
          <view class="legend-item">
            <view class="legend-color actual"></view>
            <text>实际收入</text>
          </view>
        </view>
      </view>
      
      <view class="chart-card">
        <view class="chart-title">消课统计</view>
        <view class="chart-canvas-wrapper">
          <canvas 
            canvas-id="lessonChart" 
            id="lessonChart"
            class="chart-canvas"
            type="2d"
          ></canvas>
        </view>
        <view class="chart-legend">
          <view class="legend-item">
            <view class="legend-color lessons"></view>
            <text>消课数</text>
          </view>
          <view class="legend-item">
            <view class="legend-color attended"></view>
            <text>上课数</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get } from '@/utils/request'

const statistics = ref({
  studentCount: 0,
  totalRevenue: 0,
  totalCourses: 0,
  totalLessonsSold: 0,
  totalLessonsConsumed: 0,
  totalLessonsAttended: 0,
  totalRemainingLessons: 0,
  prepaidLessonsConsumed: 0,
  monthlyPrepaidRevenue: 0,
  monthlyActualRevenue: 0,
  monthlyLessonsConsumed: 0,
  monthlyLessonsAttended: 0
})

const chartType = ref('month')
const currentYear = ref(new Date().getFullYear().toString())
const yearOptions = ref(['2022年', '2023年', '2024年', '2025年', '2026年'])

const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonthIndex = ref(now.getMonth())

const chartData = ref({
  labels: [],
  prepaidRevenue: [],
  actualRevenue: [],
  lessonsConsumed: [],
  lessonsAttended: []
})

const fetchStatistics = async () => {
  try {
    const monthStr = `${selectedYear.value}-${String(selectedMonthIndex.value + 1).padStart(2, '0')}`
    const params = { month: monthStr }
    console.log('获取统计数据，参数:', params)
    
    uni.showLoading({ title: '加载中...' })
    
    const res = await get('/statistics', params)
    console.log('统计数据响应:', res)
    
    const data = res.data || res
    console.log('统计数据详情:', data)
    console.log('月度预收入:', data.monthlyPrepaidRevenue)
    console.log('月度实际收入:', data.monthlyActualRevenue)
    console.log('月度消课:', data.monthlyLessonsConsumed)
    console.log('月度上课数:', data.monthlyLessonsAttended)
    
    statistics.value.studentCount = data.studentCount || 0
    statistics.value.totalRevenue = data.totalRevenue || 0
    statistics.value.totalCourses = data.totalCourses || 0
    statistics.value.totalLessonsSold = data.totalLessonsSold || 0
    statistics.value.totalLessonsConsumed = data.totalLessonsConsumed || 0
    statistics.value.totalLessonsAttended = data.totalLessonsAttended || 0
    statistics.value.totalRemainingLessons = data.totalRemainingLessons || 0
    statistics.value.prepaidLessonsConsumed = data.prepaidLessonsConsumed || 0
    statistics.value.monthlyPrepaidRevenue = data.monthlyPrepaidRevenue || 0
    statistics.value.monthlyActualRevenue = data.monthlyActualRevenue || 0
    statistics.value.monthlyLessonsConsumed = data.monthlyLessonsConsumed || 0
    statistics.value.monthlyLessonsAttended = data.monthlyLessonsAttended || 0
    
    console.log('更新后的统计数据:', JSON.stringify(statistics.value))
    
    uni.hideLoading()
  } catch (error) {
    console.error('获取统计数据失败', error)
    uni.hideLoading()
    uni.showToast({ title: '获取数据失败', icon: 'none' })
  }
}

const monthDisplayText = computed(() => {
  return `${selectedYear.value}年${selectedMonthIndex.value + 1}月`
})

const isCurrentMonth = computed(() => {
  const now = new Date()
  return selectedYear.value === now.getFullYear() && selectedMonthIndex.value === now.getMonth()
})

const monthLabel = computed(() => {
  if (isCurrentMonth.value) return '本月'
  return `${selectedMonthIndex.value + 1}月`
})

const prevMonth = () => {
  if (selectedMonthIndex.value === 0) {
    selectedYear.value--
    selectedMonthIndex.value = 11
  } else {
    selectedMonthIndex.value--
  }
  fetchStatistics()
}

const nextMonth = () => {
  if (isCurrentMonth.value) return
  
  if (selectedMonthIndex.value === 11) {
    selectedYear.value++
    selectedMonthIndex.value = 0
  } else {
    selectedMonthIndex.value++
  }
  fetchStatistics()
}

const fetchChartStatistics = async () => {
  try {
    const params = {
      type: chartType.value,
      year: currentYear.value
    }
    const res = await get('/statistics/chart', params)
    console.log('Chart data:', res.data)
    chartData.value = res.data
    
    await nextTick()
    setTimeout(() => {
      drawCharts()
    }, 300)
  } catch (error) {
    console.error('获取图表数据失败', error)
  }
}

const switchChartType = (type) => {
  chartType.value = type
  fetchChartStatistics()
}

const onYearChange = (e) => {
  const idx = e.detail.value
  const selectedYear = yearOptions.value[idx]
  currentYear.value = selectedYear.replace('年', '')
  fetchChartStatistics()
}

const getYearIndex = () => {
  const yearStr = currentYear.value + '年'
  const idx = yearOptions.value.indexOf(yearStr)
  return idx >= 0 ? idx : yearOptions.value.length - 1
}

const drawCharts = () => {
  drawIncomeChart()
  drawLessonChart()
}

const drawIncomeChart = () => {
  const query = uni.createSelectorQuery()
  query.select('#incomeChart')
    .fields({ node: true, size: true })
    .exec((res) => {
      if (!res || !res[0]) {
        console.log('incomeChart canvas not found')
        return
      }
      
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = uni.getSystemInfoSync().pixelRatio
      const width = res[0].width
      const height = res[0].height
      
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
      
      const padding = { top: 20, right: 20, bottom: 40, left: 50 }
      const chartWidth = width - padding.left - padding.right
      const chartHeight = height - padding.top - padding.bottom
      
      ctx.clearRect(0, 0, width, height)
      
      const data = chartData.value
      console.log('Income chart data:', data.labels, data.prepaidRevenue, data.actualRevenue)
      if (!data.labels || data.labels.length === 0) {
        ctx.fillStyle = '#909399'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('暂无数据', width / 2, height / 2)
        return
      }
      
      const maxPrepaid = Math.max(...data.prepaidRevenue, 1)
      const maxActual = Math.max(...data.actualRevenue, 1)
      const maxValue = Math.max(maxPrepaid, maxActual)
      const minValueForLabel = maxValue * 0.08
      const barCount = data.labels.length
      const groupWidth = chartWidth / barCount
      const barWidth = groupWidth * 0.3
      const gap = groupWidth * 0.1
      
      ctx.strokeStyle = '#e4e7ed'
      ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(width - padding.right, y)
        ctx.stroke()
        
        const value = Math.round(maxValue * (1 - i / 4))
        ctx.fillStyle = '#909399'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText('¥' + value, padding.left - 5, y + 4)
      }
      
      data.labels.forEach((label, i) => {
        const x = padding.left + groupWidth * i + groupWidth / 2
        
        ctx.fillStyle = '#909399'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(label, x, height - padding.bottom + 20)
        
        const prepaidHeight = (data.prepaidRevenue[i] / maxValue) * chartHeight
        const prepaidX = x - barWidth - gap / 2
        const prepaidY = padding.top + chartHeight - prepaidHeight
        
        ctx.fillStyle = '#409EFF'
        ctx.beginPath()
        ctx.rect(prepaidX, prepaidY, barWidth, prepaidHeight)
        ctx.fill()
        
        const actualHeight = (data.actualRevenue[i] / maxValue) * chartHeight
        const actualX = x + gap / 2
        const actualY = padding.top + chartHeight - actualHeight
        
        ctx.fillStyle = '#67C23A'
        ctx.beginPath()
        ctx.rect(actualX, actualY, barWidth, actualHeight)
        ctx.fill()
        
        ctx.font = '9px sans-serif'
        ctx.textAlign = 'center'
        
        const prepaidVal = data.prepaidRevenue[i]
        const actualVal = data.actualRevenue[i]
        
        if (prepaidVal > 0 && actualVal > 0) {
          const maxVal = Math.max(prepaidVal, actualVal)
          const minVal = Math.min(prepaidVal, actualVal)
          
          if (maxVal > minValueForLabel) {
            ctx.fillStyle = '#333'
            if (prepaidVal >= actualVal) {
              ctx.fillText(prepaidVal, prepaidX + barWidth / 2, Math.max(prepaidY - 8, padding.top + 12))
              if (actualHeight > 20 && minVal > minValueForLabel) {
                ctx.fillStyle = '#fff'
                ctx.fillText(actualVal, actualX + barWidth / 2, actualY + 14)
              }
            } else {
              ctx.fillText(actualVal, actualX + barWidth / 2, Math.max(actualY - 8, padding.top + 12))
              if (prepaidHeight > 20 && minVal > minValueForLabel) {
                ctx.fillStyle = '#fff'
                ctx.fillText(prepaidVal, prepaidX + barWidth / 2, prepaidY + 14)
              }
            }
          }
        } else if (prepaidVal > 0 && prepaidVal > minValueForLabel) {
          ctx.fillStyle = '#333'
          ctx.fillText(prepaidVal, prepaidX + barWidth / 2, Math.max(prepaidY - 5, padding.top + 12))
        } else if (actualVal > 0 && actualVal > minValueForLabel) {
          ctx.fillStyle = '#333'
          ctx.fillText(actualVal, actualX + barWidth / 2, Math.max(actualY - 5, padding.top + 12))
        }
      })
    })
}

const drawLessonChart = () => {
  const query = uni.createSelectorQuery()
  query.select('#lessonChart')
    .fields({ node: true, size: true })
    .exec((res) => {
      if (!res || !res[0]) {
        console.log('lessonChart canvas not found')
        return
      }
      
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = uni.getSystemInfoSync().pixelRatio
      const width = res[0].width
      const height = res[0].height
      
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
      
      const padding = { top: 20, right: 20, bottom: 40, left: 50 }
      const chartWidth = width - padding.left - padding.right
      const chartHeight = height - padding.top - padding.bottom
      
      ctx.clearRect(0, 0, width, height)
      
      const data = chartData.value
      if (!data.labels || data.labels.length === 0) return
      
      const maxConsumed = Math.max(...data.lessonsConsumed, 1)
      const maxAttended = Math.max(...data.lessonsAttended, 1)
      const maxValue = Math.max(maxConsumed, maxAttended)
      const pointCount = data.labels.length
      const stepX = chartWidth / (pointCount - 1 || 1)
      
      ctx.strokeStyle = '#e4e7ed'
      ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(width - padding.right, y)
        ctx.stroke()
        
        const value = Math.round(maxValue * (1 - i / 4))
        ctx.fillStyle = '#909399'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(value.toString(), padding.left - 5, y + 4)
      }
      
      data.labels.forEach((label, i) => {
        const x = padding.left + stepX * i
        
        ctx.fillStyle = '#909399'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(label, x, height - padding.bottom + 20)
      })
      
      const drawLine = (dataArr, color, isSecondLine) => {
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        
        dataArr.forEach((value, i) => {
          const x = padding.left + stepX * i
          const y = padding.top + chartHeight - (value / maxValue) * chartHeight
          
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        ctx.stroke()
        
        dataArr.forEach((value, i) => {
          const x = padding.left + stepX * i
          const y = padding.top + chartHeight - (value / maxValue) * chartHeight
          
          ctx.fillStyle = '#fff'
          ctx.beginPath()
          ctx.arc(x, y, 4, 0, Math.PI * 2)
          ctx.fill()
          
          ctx.strokeStyle = color
          ctx.lineWidth = 2
          ctx.stroke()
          
          if (value > minValueForLabel) {
            ctx.fillStyle = '#333'
            ctx.font = '9px sans-serif'
            ctx.textAlign = 'center'
            if (isSecondLine) {
              ctx.fillText(value, x, y + 14)
            } else {
              ctx.fillText(value, x, y - 10)
            }
          }
        })
      }
      
      drawLine(data.lessonsConsumed, '#E6A23C', false)
      drawLine(data.lessonsAttended, '#67C23A', true)
    })
}

onMounted(() => {
  fetchStatistics()
  fetchChartStatistics()
})

onShow(() => {
  fetchStatistics()
  fetchChartStatistics()
})
</script>

<style scoped>
.statistics-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  padding-left: 10rpx;
  border-left: 6rpx solid #409EFF;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.nav-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  border-radius: 50%;
}

.nav-btn text {
  font-size: 32rpx;
  color: #409EFF;
  font-weight: bold;
}

.nav-disabled {
  opacity: 0.3;
}

.nav-disabled text {
  color: #c0c4cc;
}

.month-text {
  font-size: 28rpx;
  color: #409EFF;
  font-weight: bold;
  min-width: 160rpx;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-bottom: 30rpx;
}

.stat-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 12rpx;
}

.stat-value.revenue {
  color: #E6A23C;
}

.stat-value.success {
  color: #67C23A;
}

.stat-value.warning {
  color: #E6A23C;
}

.stat-label {
  font-size: 24rpx;
  color: #909399;
}

.chart-section {
  margin-top: 20rpx;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.chart-tabs {
  display: flex;
  background-color: #fff;
  border-radius: 12rpx;
  overflow: hidden;
}

.chart-tab {
  padding: 16rpx 32rpx;
  font-size: 26rpx;
  color: #606266;
  background-color: #fff;
}

.chart-tab.active {
  background-color: #409EFF;
  color: #fff;
}

.year-selector {
  background-color: #fff;
  border-radius: 12rpx;
  padding: 12rpx 20rpx;
}

.year-picker {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: #333;
}

.picker-arrow {
  font-size: 18rpx;
  color: #909399;
}

.chart-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.chart-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.chart-canvas-wrapper {
  width: 100%;
  height: 400rpx;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 40rpx;
  margin-top: 20rpx;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.legend-item text {
  font-size: 22rpx;
  color: #606266;
}

.legend-color {
  width: 24rpx;
  height: 24rpx;
  border-radius: 4rpx;
}

.legend-color.prepaid {
  background-color: #409EFF;
}

.legend-color.actual {
  background-color: #67C23A;
}

.legend-color.lessons {
  background-color: #E6A23C;
}

.legend-color.attended {
  background-color: #67C23A;
}
</style>
