<template>
  <view class="schedule-container">
    <view class="view-tabs">
      <view 
        class="tab-item" 
        :class="{ active: viewMode === 'month' }" 
        @click="viewMode = 'month'"
      >
        月
      </view>
      <view 
        class="tab-item" 
        :class="{ active: viewMode === 'week' }" 
        @click="viewMode = 'week'"
      >
        周
      </view>
      <view 
        class="tab-item" 
        :class="{ active: viewMode === 'day' }" 
        @click="viewMode = 'day'"
      >
        日
      </view>
    </view>
    
    <view class="date-nav">
      <view class="nav-btn" @click="prevPeriod">
        <text>‹</text>
      </view>
      <view class="current-period">
        <text>{{ periodText }}</text>
      </view>
      <view class="nav-btn" @click="nextPeriod">
        <text>›</text>
      </view>
      <view class="today-btn" @click="goToday">
        <text>今天</text>
      </view>
    </view>
    
    <view v-if="viewMode === 'month'" class="month-view">
      <view class="month-header">
        <view class="month-day-name" v-for="name in dayNames" :key="name">{{ name }}</view>
      </view>
      <view class="month-grid">
        <view 
          v-for="(day, index) in monthDays" 
          :key="index"
          class="month-day"
          :class="{ 
            'other-month': day.otherMonth,
            'is-today': day.isToday,
            'is-selected': day.date === selectedDate,
            'has-courses': day.hasCourses
          }"
          @click="selectDate(day)"
        >
          <text class="day-number">{{ day.dayNumber }}</text>
          <view v-if="day.courseCount > 0" class="course-dots">
            <view class="dot" v-for="i in Math.min(day.courseCount, 3)" :key="i"></view>
          </view>
        </view>
      </view>
    </view>
    
    <view v-if="viewMode === 'week'" class="week-view">
      <view class="week-days">
        <view 
          v-for="day in weekDays" 
          :key="day.date" 
          class="day-item"
          :class="{ 'is-today': day.isToday, 'is-selected': day.date === selectedDate }"
          @click="selectDate(day)"
        >
          <text class="day-name">{{ day.dayName }}</text>
          <text class="day-number">{{ day.dayNumber }}</text>
          <view v-if="day.courseCount > 0" class="has-course-dot"></view>
        </view>
      </view>
    </view>
    
    <view v-if="viewMode === 'day'" class="day-header">
      <text class="day-title">{{ selectedDateText }}</text>
    </view>
    
    <view class="course-list">
      <view v-if="dayCourses.length === 0" class="empty-tip">
        当日暂无课程安排
      </view>
      
      <view v-else class="course-timeline">
        <view 
          v-for="course in dayCourses" 
          :key="course._id" 
          class="course-item"
          :class="{
            'completed': course.status === 'completed',
            'cancelled': course.status === 'cancelled'
          }"
          @click="goToDetail(course)"
        >
          <view class="timeline-dot"></view>
          <view class="timeline-line"></view>
          <view class="course-content">
            <view class="course-time">
              <text>{{ formatTime(course.startTime) }} - {{ formatTime(course.endTime) }}</text>
            </view>
            <view class="course-main">
              <text class="student-name">{{ course.studentId?.name || '未分配' }}</text>
              <text class="course-type">{{ course.courseTypeId?.name || '未设置' }}</text>
            </view>
            <view class="course-status">
              <text 
                class="status-tag"
                :class="{
                  'status-normal': course.status === 'normal',
                  'status-completed': course.status === 'completed',
                  'status-cancelled': course.status === 'cancelled'
                }"
              >
                {{ getStatusText(course.status) }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
    
    <view class="add-btn" @click="handleAdd">
      <text>+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get } from '@/utils/request'

function formatDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const viewMode = ref('month')
const currentMonth = ref(new Date())
const currentWeekStart = ref(new Date())
const selectedDate = ref(formatDateString(new Date()))
const courses = ref([])
const dayNames = ['日', '一', '二', '三', '四', '五', '六']

const monthDays = computed(() => {
  const days = []
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const today = formatDateString(new Date())
  
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  
  const prevMonth = new Date(year, month, 0)
  const prevMonthDays = prevMonth.getDate()
  
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthDays - i
    const date = formatDateString(new Date(year, month - 1, day))
    days.push({
      date,
      dayNumber: day,
      otherMonth: true,
      isToday: false,
      courseCount: getCourseCount(date)
    })
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const date = formatDateString(new Date(year, month, i))
    days.push({
      date,
      dayNumber: i,
      otherMonth: false,
      isToday: date === today,
      courseCount: getCourseCount(date)
    })
  }
  
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    const date = formatDateString(new Date(year, month + 1, i))
    days.push({
      date,
      dayNumber: i,
      otherMonth: true,
      isToday: false,
      courseCount: getCourseCount(date)
    })
  }
  
  return days
})

const weekDays = computed(() => {
  const days = []
  const today = formatDateString(new Date())
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart.value)
    date.setDate(date.getDate() + i)
    const dateStr = formatDateString(date)
    
    days.push({
      date: dateStr,
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      isToday: dateStr === today,
      courseCount: getCourseCount(dateStr)
    })
  }
  
  return days
})

const periodText = computed(() => {
  if (viewMode.value === 'month') {
    const year = currentMonth.value.getFullYear()
    const month = currentMonth.value.getMonth() + 1
    return `${year}年${month}月`
  } else {
    const start = currentWeekStart.value
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    
    const startMonth = start.getMonth() + 1
    const endMonth = end.getMonth() + 1
    
    if (startMonth === endMonth) {
      return `${startMonth}月${start.getDate()}日 - ${end.getDate()}日`
    }
    return `${startMonth}月${start.getDate()}日 - ${endMonth}月${end.getDate()}日`
  }
})

const selectedDateText = computed(() => {
  if (!selectedDate.value) return ''
  const date = new Date(selectedDate.value)
  const weekDay = dayNames[date.getDay()]
  return `${date.getMonth() + 1}月${date.getDate()}日 周${weekDay}`
})

const dayCourses = computed(() => {
  return courses.value
    .filter(c => formatDateString(new Date(c.startTime)) === selectedDate.value)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
})

function getCourseCount(dateStr) {
  return courses.value.filter(c => formatDateString(new Date(c.startTime)) === dateStr).length
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getStatusText(status) {
  const statusMap = {
    'normal': '待上课',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[status] || '待上课'
}

const prevPeriod = () => {
  if (viewMode.value === 'month') {
    const newDate = new Date(currentMonth.value)
    newDate.setMonth(newDate.getMonth() - 1)
    currentMonth.value = newDate
  } else {
    const newDate = new Date(currentWeekStart.value)
    newDate.setDate(newDate.getDate() - 7)
    currentWeekStart.value = newDate
  }
  fetchCourses()
}

const nextPeriod = () => {
  if (viewMode.value === 'month') {
    const newDate = new Date(currentMonth.value)
    newDate.setMonth(newDate.getMonth() + 1)
    currentMonth.value = newDate
  } else {
    const newDate = new Date(currentWeekStart.value)
    newDate.setDate(newDate.getDate() + 7)
    currentWeekStart.value = newDate
  }
  fetchCourses()
}

const goToday = () => {
  const today = new Date()
  currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
  const dayOfWeek = today.getDay()
  currentWeekStart.value = new Date(today)
  currentWeekStart.value.setDate(today.getDate() - dayOfWeek)
  selectedDate.value = formatDateString(today)
  fetchCourses()
}

const selectDate = (day) => {
  if (day.otherMonth) {
    const date = new Date(day.date)
    currentMonth.value = new Date(date.getFullYear(), date.getMonth(), 1)
  }
  selectedDate.value = day.date
  if (viewMode.value === 'month') {
    viewMode.value = 'day'
  }
}

const fetchCourses = async () => {
  try {
    let start, end
    
    if (viewMode.value === 'month') {
      start = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1)
      start.setDate(start.getDate() - start.getDay())
      end = new Date(start)
      end.setDate(end.getDate() + 42)
    } else {
      start = new Date(currentWeekStart.value)
      start.setHours(0, 0, 0, 0)
      end = new Date(start)
      end.setDate(end.getDate() + 7)
    }
    
    end.setHours(23, 59, 59, 999)
    
    const res = await get('/courses', {
      startTime: start.toISOString(),
      endTime: end.toISOString()
    })
    
    courses.value = res.data || []
  } catch (error) {
    console.error('获取课程列表失败', error)
  }
}

const goToDetail = (course) => {
  uni.navigateTo({
    url: `/pages/schedule/detail?id=${course._id}`
  })
}

const handleAdd = () => {
  uni.navigateTo({
    url: `/pages/schedule/add?date=${selectedDate.value}`
  })
}

watch(viewMode, () => {
  fetchCourses()
})

onMounted(() => {
  const today = new Date()
  currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
  
  const dayOfWeek = today.getDay()
  currentWeekStart.value = new Date(today)
  currentWeekStart.value.setDate(today.getDate() - dayOfWeek)
  
  fetchCourses()
})

onShow(() => {
  fetchCourses()
})
</script>

<style scoped>
.schedule-container {
  background-color: #f8f8f8;
  min-height: 100vh;
}

.view-tabs {
  display: flex;
  background-color: #fff;
  padding: 16rpx 20rpx;
  gap: 16rpx;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 28rpx;
  color: #606266;
  background-color: #f5f7fa;
  border-radius: 8rpx;
}

.tab-item.active {
  background-color: #409EFF;
  color: #fff;
}

.date-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #ebeef5;
}

.nav-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn text {
  font-size: 36rpx;
  color: #409EFF;
}

.current-period {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.today-btn {
  padding: 8rpx 20rpx;
  background-color: #409EFF;
  color: #fff;
  font-size: 24rpx;
  border-radius: 6rpx;
}

.month-view {
  background-color: #fff;
  padding: 20rpx;
}

.month-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 16rpx;
}

.month-day-name {
  text-align: center;
  font-size: 24rpx;
  color: #909399;
  padding: 8rpx 0;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4rpx;
}

.month-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  position: relative;
}

.month-day.other-month .day-number {
  color: #c0c4cc;
}

.month-day.is-today {
  background-color: #ecf5ff;
}

.month-day.is-selected {
  background-color: #409EFF;
}

.month-day.is-selected .day-number {
  color: #fff;
}

.day-number {
  font-size: 26rpx;
  color: #333;
}

.course-dots {
  display: flex;
  gap: 4rpx;
  margin-top: 4rpx;
}

.dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background-color: #409EFF;
}

.month-day.is-selected .dot {
  background-color: #fff;
}

.week-view {
  background-color: #fff;
  padding: 20rpx;
}

.week-days {
  display: flex;
  justify-content: space-between;
}

.day-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 0;
  border-radius: 12rpx;
  position: relative;
}

.day-item.is-today {
  background-color: #ecf5ff;
}

.day-item.is-selected {
  background-color: #409EFF;
}

.day-item.is-selected .day-name,
.day-item.is-selected .day-number {
  color: #fff;
}

.day-name {
  font-size: 22rpx;
  color: #909399;
  margin-bottom: 8rpx;
}

.day-number {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.has-course-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background-color: #409EFF;
  margin-top: 6rpx;
}

.day-item.is-selected .has-course-dot {
  background-color: #fff;
}

.day-header {
  background-color: #fff;
  padding: 20rpx;
  text-align: center;
}

.day-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.course-list {
  padding: 20rpx;
}

.empty-tip {
  text-align: center;
  padding: 100rpx 0;
  color: #909399;
  font-size: 28rpx;
}

.course-timeline {
  display: flex;
  flex-direction: column;
}

.course-item {
  display: flex;
  position: relative;
  padding-bottom: 30rpx;
}

.course-item:last-child {
  padding-bottom: 0;
}

.course-item:last-child .timeline-line {
  display: none;
}

.timeline-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background-color: #409EFF;
  margin-right: 20rpx;
  margin-top: 10rpx;
  flex-shrink: 0;
}

.course-item.completed .timeline-dot {
  background-color: #67C23A;
}

.course-item.cancelled .timeline-dot {
  background-color: #F56C6C;
}

.timeline-line {
  position: absolute;
  left: 9rpx;
  top: 30rpx;
  bottom: 0;
  width: 2rpx;
  background-color: #e4e7ed;
}

.course-content {
  flex: 1;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.course-time {
  font-size: 24rpx;
  color: #909399;
  margin-bottom: 12rpx;
}

.course-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.student-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.course-type {
  font-size: 26rpx;
  color: #606266;
}

.course-status {
  text-align: right;
}

.status-tag {
  display: inline-block;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.status-normal {
  background-color: #ecf5ff;
  color: #409EFF;
}

.status-completed {
  background-color: #f0f9eb;
  color: #67C23A;
}

.status-cancelled {
  background-color: #fef0f0;
  color: #F56C6C;
}

.add-btn {
  position: fixed;
  right: 40rpx;
  bottom: 120rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(64, 158, 255, 0.4);
}

.add-btn text {
  color: #fff;
  font-size: 48rpx;
  font-weight: 300;
}
</style>
