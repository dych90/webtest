<template>
  <view class="schedule-container">
    <view class="date-picker">
      <view class="date-nav">
        <view class="nav-btn" @click="prevWeek">
          <text>‹</text>
        </view>
        <view class="current-date" @click="showDatePicker = true">
          <text>{{ dateRangeText }}</text>
        </view>
        <view class="nav-btn" @click="nextWeek">
          <text>›</text>
        </view>
      </view>
      <view class="week-days">
        <view 
          v-for="day in weekDays" 
          :key="day.date" 
          class="day-item"
          :class="{ 'is-today': day.isToday, 'is-selected': day.date === selectedDate }"
          @click="selectDate(day.date)"
        >
          <text class="day-name">{{ day.dayName }}</text>
          <text class="day-number">{{ day.dayNumber }}</text>
        </view>
      </view>
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
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get } from '@/utils/request'

function formatDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const currentWeekStart = ref(new Date())
const selectedDate = ref(formatDateString(new Date()))
const courses = ref([])
const showDatePicker = ref(false)

const weekDays = computed(() => {
  const days = []
  const dayNames = ['日', '一', '二', '三', '四', '五', '六']
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
      isSelected: dateStr === selectedDate.value
    })
  }
  
  return days
})

const dateRangeText = computed(() => {
  const start = currentWeekStart.value
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  
  const startMonth = start.getMonth() + 1
  const endMonth = end.getMonth() + 1
  
  if (startMonth === endMonth) {
    return `${startMonth}月${start.getDate()}日 - ${end.getDate()}日`
  }
  return `${startMonth}月${start.getDate()}日 - ${endMonth}月${end.getDate()}日`
})

const dayCourses = computed(() => {
  return courses.value
    .filter(c => formatDateString(new Date(c.startTime)) === selectedDate.value)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
})

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

const prevWeek = () => {
  const newDate = new Date(currentWeekStart.value)
  newDate.setDate(newDate.getDate() - 7)
  currentWeekStart.value = newDate
  fetchCourses()
}

const nextWeek = () => {
  const newDate = new Date(currentWeekStart.value)
  newDate.setDate(newDate.getDate() + 7)
  currentWeekStart.value = newDate
  fetchCourses()
}

const selectDate = (date) => {
  selectedDate.value = date
}

const fetchCourses = async () => {
  try {
    const start = new Date(currentWeekStart.value)
    start.setHours(0, 0, 0, 0)
    
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    end.setHours(23, 59, 59, 999)
    
    console.log('查询课程时间范围:', start.toISOString(), '到', end.toISOString())
    
    const res = await get('/courses', {
      startTime: start.toISOString(),
      endTime: end.toISOString()
    })
    
    console.log('课程列表响应:', res)
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

onMounted(() => {
  const today = new Date()
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

.date-picker {
  background-color: #fff;
  padding: 20rpx;
}

.date-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10rpx 0;
  margin-bottom: 20rpx;
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

.current-date {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
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
