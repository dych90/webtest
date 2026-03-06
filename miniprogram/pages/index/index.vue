<template>
  <view class="index-container">
    <view class="header-section">
      <view class="header-left">
        <text class="greeting">{{ greeting }}，{{ userStore.userInfo?.name || '老师' }}</text>
      </view>
      <view class="header-right">
        <text class="date">{{ currentDate }}</text>
      </view>
    </view>
    
    <view class="quick-actions">
      <view class="action-grid">
        <view class="action-item" @click="goToPage('/pages/students/students')">
          <view class="action-icon student-icon">👤</view>
          <text class="action-text">学生管理</text>
        </view>
        <view class="action-item" @click="goToPage('/pages/schedule/schedule')">
          <view class="action-icon schedule-icon">📅</view>
          <text class="action-text">排课管理</text>
        </view>
        <view class="action-item" @click="goToPage('/pages/payments/payments')">
          <view class="action-icon payment-icon">💰</view>
          <text class="action-text">缴费管理</text>
        </view>
        <view class="action-item" @click="goToPage('/pages/balance/balance')">
          <view class="action-icon balance-icon">🎫</view>
          <text class="action-text">剩余课费</text>
        </view>
      </view>
    </view>
    
    <view class="schedule-section">
      <view class="section-header">
        <view class="date-nav">
          <view class="nav-btn" @click="prevDay">
            <text>‹</text>
          </view>
          <text class="section-title">{{ courseDateText }}</text>
          <view class="nav-btn" @click="nextDay">
            <text>›</text>
          </view>
        </view>
        <text class="section-more" @click="goToSchedule">查看全部</text>
      </view>
      
      <view v-if="todayCourses.length === 0" class="empty-tip">
        {{ isToday ? '今日暂无课程安排' : '该日暂无课程安排' }}
      </view>
      
      <view v-else class="course-list">
        <view 
          v-for="(course, index) in todayCourses" 
          :key="course._id" 
          class="course-item"
          :class="{ 'course-completed': course.status === 'completed' }"
          @click="goToCourseDetail(course)"
        >
          <view class="course-index">
            <text>{{ index + 1 }}</text>
          </view>
          <view class="course-time">
            <text class="time">{{ formatTime(course.startTime) }}</text>
          </view>
          <view class="course-info">
            <text class="student-name">{{ formatStudentName(course.studentId?.name) }}</text>
            <text class="course-type">{{ course.courseTypeId?.name || '未设置' }}</text>
          </view>
          <view class="course-actions">
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
            <button 
              v-if="course.status === 'normal'" 
              class="btn-attend" 
              @click.stop="handleAttendCourse(course)"
            >
              上课
            </button>
            <button 
              v-if="course.status === 'completed'" 
              class="btn-cancel-attend" 
              @click.stop="handleCancelAttendCourse(course)"
            >
              取消
            </button>
            <text class="arrow-icon">›</text>
          </view>
        </view>
      </view>
    </view>
    
    <view class="stats-section">
      <view class="section-title">本月数据</view>
      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-value warning">¥{{ statistics.monthlyPrepaidRevenue }}</text>
          <text class="stat-label">本月预收入</text>
        </view>
        <view class="stat-card">
          <text class="stat-value success">¥{{ statistics.monthlyActualRevenue }}</text>
          <text class="stat-label">本月实际收入</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ statistics.monthlyLessonsConsumed }}</text>
          <text class="stat-label">本月消课</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ statistics.monthlyLessonsAttended }}</text>
          <text class="stat-label">本月上课数</text>
        </view>
      </view>
    </view>
    
    <view class="dialog-mask" v-if="attendDialogVisible" @click="attendDialogVisible = false">
      <view class="dialog-content" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">确认上课</text>
          <text class="dialog-close" @click="attendDialogVisible = false">×</text>
        </view>
        <view class="dialog-body">
          <view class="attend-info">
            <text class="attend-student">{{ currentCourse?.studentId?.name || '未分配' }}</text>
            <text class="attend-course">{{ currentCourse?.courseTypeId?.name || '未设置' }}</text>
            <text class="attend-time">{{ formatTime(currentCourse?.startTime) }}</text>
          </view>
          <view class="form-item">
            <text class="form-label">消课数量</text>
            <picker :value="lessonCountIndex" :range="lessonCountOptions" @change="onLessonCountChange">
              <view class="form-picker">
                <text>{{ lessonCountOptions[lessonCountIndex] }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
        </view>
        <view class="dialog-footer">
          <button class="btn-cancel" @click="attendDialogVisible = false">取消</button>
          <button class="btn-confirm" @click="confirmAttend">确认上课</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { get, post, put, del } from '@/utils/request'

const userStore = useUserStore()

const statistics = ref({
  studentCount: 0,
  totalRevenue: 0,
  totalLessonsSold: 0,
  totalCourses: 0,
  totalLessonsConsumed: 0,
  totalLessonsAttended: 0,
  totalRemainingLessons: 0,
  prepaidLessonsConsumed: 0,
  monthlyPrepaidRevenue: 0,
  monthlyActualRevenue: 0,
  monthlyLessonsConsumed: 0,
  monthlyLessonsAttended: 0
})

const todayCourses = ref([])
const selectedDate = ref(new Date())
const dayNames = ['日', '一', '二', '三', '四', '五', '六']
const attendDialogVisible = ref(false)
const currentCourse = ref(null)
const lessonCountIndex = ref(1)

const lessonCountOptions = ['0.5节', '1节', '1.5节', '2节', '2.5节', '3节', '3.5节', '4节', '4.5节', '5节']
const lessonCountValues = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 17) return '下午好'
  if (hour < 19) return '傍晚好'
  return '晚上好'
})

const currentDate = computed(() => {
  const now = new Date()
  return `${now.getMonth() + 1}月${now.getDate()}日 周${dayNames[now.getDay()]}`
})

const isToday = computed(() => {
  const today = new Date()
  return selectedDate.value.getFullYear() === today.getFullYear() &&
         selectedDate.value.getMonth() === today.getMonth() &&
         selectedDate.value.getDate() === today.getDate()
})

const courseDateText = computed(() => {
  const d = selectedDate.value
  if (isToday.value) {
    return '今日课程'
  }
  return `${d.getMonth() + 1}月${d.getDate()}日 周${dayNames[d.getDay()]}`
})

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const formatStudentName = (name) => {
  if (!name) return '未分配'
  return name.replace(/（/g, '(').replace(/）/g, ')')
}

const getStatusText = (status) => {
  const statusMap = {
    'normal': '待上课',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[status] || '待上课'
}

const prevDay = () => {
  const newDate = new Date(selectedDate.value)
  newDate.setDate(newDate.getDate() - 1)
  selectedDate.value = newDate
  fetchDayCourses()
}

const nextDay = () => {
  const newDate = new Date(selectedDate.value)
  newDate.setDate(newDate.getDate() + 1)
  selectedDate.value = newDate
  fetchDayCourses()
}

const fetchDayCourses = async () => {
  try {
    const d = selectedDate.value
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
    const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
    
    const res = await get('/courses', {
      startTime: startOfDay.toISOString(),
      endTime: endOfDay.toISOString()
    })
    
    todayCourses.value = res.data || []
  } catch (error) {
    console.error('获取课程失败', error)
  }
}

const fetchStatistics = async () => {
  try {
    const res = await get('/statistics')
    statistics.value = {
      ...statistics.value,
      ...res.data
    }
  } catch (error) {
    console.error('获取统计数据失败', error)
  }
}

const handleAttendCourse = async (course) => {
  if (!course.courseTypeId?._id && !course.courseTypeId) {
    uni.showModal({
      title: '提示',
      content: '该课程未设置课程类型，上课后无法记录收入。是否继续上课？',
      success: async (res) => {
        if (res.confirm) {
          currentCourse.value = course
          lessonCountIndex.value = 1
          attendDialogVisible.value = true
        }
      }
    })
    return
  }
  
  currentCourse.value = course
  lessonCountIndex.value = 1
  attendDialogVisible.value = true
}

const onLessonCountChange = (e) => {
  lessonCountIndex.value = e.detail.value
}

const confirmAttend = async () => {
  if (!currentCourse.value) return
  
  attendDialogVisible.value = false
  await doAttendCourse(currentCourse.value, lessonCountValues[lessonCountIndex.value])
}

const doAttendCourse = async (course, lessonsConsumed = 1) => {
  try {
    await put(`/courses/${course._id}`, { status: 'completed' })
    
    const studentId = course.studentId?._id || course.studentId
    if (!studentId) {
      uni.showToast({ title: '课程缺少学生信息', icon: 'none' })
      return
    }
    
    await post('/lesson-records', {
      studentId: studentId,
      courseId: course._id,
      courseStartTime: course.startTime,
      lessonsConsumed: lessonsConsumed,
      lessonContent: '',
      isDeducted: true,
      notes: '从首页直接上课'
    })
    uni.showToast({ title: '上课成功', icon: 'success' })
    await fetchDayCourses()
    await fetchStatistics()
  } catch (error) {
    uni.showToast({ title: error.message || '上课失败', icon: 'none' })
  }
}

const handleCancelAttendCourse = async (course) => {
  uni.showModal({
    title: '提示',
    content: '确定要取消上课吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const lessonRecords = await get('/lesson-records', {
            courseId: course._id
          })
          
          if (lessonRecords.data && lessonRecords.data.length > 0) {
            const courseIdStr = course._id.toString ? course._id.toString() : course._id
            const record = lessonRecords.data.find(r => {
              const rCourseId = r.courseId?._id ? r.courseId._id : r.courseId
              return (rCourseId?.toString ? rCourseId.toString() : rCourseId) === courseIdStr
            }) || lessonRecords.data[0]
            
            await del(`/lesson-records/${record._id}`)
          }
          
          await put(`/courses/${course._id}`, { status: 'normal' })
          
          uni.showToast({ title: '取消上课成功', icon: 'success' })
          await fetchDayCourses()
          await fetchStatistics()
        } catch (error) {
          uni.showToast({ title: error.message || '取消上课失败', icon: 'none' })
        }
      }
    }
  })
}

const goToSchedule = () => {
  uni.switchTab({
    url: '/pages/schedule/schedule'
  })
}

const goToCourseDetail = (course) => {
  uni.navigateTo({
    url: `/pages/schedule/detail?id=${course._id}`
  })
}

const goToPage = (url) => {
  if (url.includes('students') || url.includes('schedule')) {
    uni.switchTab({ url })
  } else {
    uni.navigateTo({ url })
  }
}

onMounted(() => {
  fetchDayCourses()
  fetchStatistics()
})

onShow(() => {
  fetchDayCourses()
  fetchStatistics()
})
</script>

<style scoped>
.index-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  margin-bottom: 16rpx;
}

.header-left {
  flex: 1;
}

.greeting {
  font-size: 28rpx;
  color: #333;
}

.header-right {
  text-align: right;
}

.date {
  font-size: 24rpx;
  color: #909399;
}

.quick-actions {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx;
}

.action-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  margin-bottom: 8rpx;
}

.student-icon {
  background-color: #ecf5ff;
}

.schedule-icon {
  background-color: #fdf6ec;
}

.lesson-icon {
  background-color: #f0f9eb;
}

.payment-icon {
  background-color: #fef0f0;
}

.balance-icon {
  background-color: #fdf6ec;
}

.action-text {
  font-size: 22rpx;
  color: #606266;
}

.schedule-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.date-nav {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.nav-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  border-radius: 50%;
}

.nav-btn text {
  font-size: 28rpx;
  color: #409EFF;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.section-more {
  font-size: 24rpx;
  color: #409EFF;
}

.empty-tip {
  text-align: center;
  padding: 32rpx 0;
  color: #909399;
  font-size: 26rpx;
}

.course-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.course-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: #f5f7fa;
  border-radius: 12rpx;
  border-left: 6rpx solid #409EFF;
}

.course-item:active {
  background-color: #e8e8e8;
}

.course-item.course-completed {
  opacity: 0.6;
  border-left-color: #67C23A;
}

.course-index {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.course-index text {
  font-size: 22rpx;
  color: #fff;
  font-weight: bold;
}

.course-time {
  width: 90rpx;
}

.time {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
}

.course-info {
  flex: 1;
  padding: 0 16rpx;
}

.student-name {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 4rpx;
}

.course-type {
  font-size: 22rpx;
  color: #909399;
}

.course-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.status-tag {
  display: inline-block;
  padding: 6rpx 12rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
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

.btn-attend {
  padding: 10rpx 20rpx;
  background-color: #409EFF;
  color: #fff;
  font-size: 22rpx;
  border: none;
  border-radius: 6rpx;
  line-height: 1.2;
}

.btn-cancel-attend {
  padding: 10rpx 20rpx;
  background-color: #fff;
  color: #F56C6C;
  font-size: 22rpx;
  border: 2rpx solid #F56C6C;
  border-radius: 6rpx;
  line-height: 1.2;
}

.arrow-icon {
  font-size: 32rpx;
  color: #c0c4cc;
  margin-left: 8rpx;
}

.stats-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.stat-card {
  background-color: #f5f7fa;
  border-radius: 12rpx;
  padding: 20rpx;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 6rpx;
}

.stat-value.revenue {
  color: #E6A23C;
}

.stat-value.warning {
  color: #E6A23C;
}

.stat-value.success {
  color: #67C23A;
}

.stat-label {
  font-size: 22rpx;
  color: #909399;
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
  width: 85%;
  max-width: 600rpx;
  background-color: #fff;
  border-radius: 20rpx;
  overflow: hidden;
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

.attend-info {
  text-align: center;
  margin-bottom: 30rpx;
  padding: 20rpx;
  background-color: #f5f7fa;
  border-radius: 12rpx;
}

.attend-student {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.attend-course {
  display: block;
  font-size: 26rpx;
  color: #606266;
  margin-bottom: 4rpx;
}

.attend-time {
  display: block;
  font-size: 24rpx;
  color: #909399;
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

.btn-confirm {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #409EFF;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}
</style>
