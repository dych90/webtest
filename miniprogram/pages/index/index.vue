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
        <view class="action-item" @click="goToPage('/pages/lessons/lessons')">
          <view class="action-icon lesson-icon">📝</view>
          <text class="action-text">消课管理</text>
        </view>
        <view class="action-item" @click="goToPage('/pages/payments/payments')">
          <view class="action-icon payment-icon">💰</view>
          <text class="action-text">缴费管理</text>
        </view>
      </view>
    </view>
    
    <view class="schedule-section">
      <view class="section-header">
        <text class="section-title">今日课程</text>
        <text class="section-more" @click="goToSchedule">查看全部</text>
      </view>
      
      <view v-if="todayCourses.length === 0" class="empty-tip">
        今日暂无课程安排
      </view>
      
      <view v-else class="course-list">
        <view 
          v-for="course in todayCourses" 
          :key="course._id" 
          class="course-item"
          :class="{ 'course-completed': course.status === 'completed' }"
        >
          <view class="course-time">
            <text class="time">{{ formatTime(course.startTime) }}</text>
          </view>
          <view class="course-info">
            <text class="student-name">{{ course.studentId?.name || '未分配' }}</text>
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
              @click="handleAttendCourse(course)"
            >
              上课
            </button>
            <button 
              v-if="course.status === 'completed'" 
              class="btn-cancel-attend" 
              @click="handleCancelAttendCourse(course)"
            >
              取消
            </button>
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
    
    <view class="stats-section">
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
          <text class="stat-value">{{ statistics.prepaidLessonsConsumed }}</text>
          <text class="stat-label">预付费已消课时</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ statistics.totalLessonsConsumed }}</text>
          <text class="stat-label">已消课时</text>
        </view>
        <view class="stat-card">
          <text class="stat-value warning">{{ statistics.totalRemainingLessons }}</text>
          <text class="stat-label">剩余课时</text>
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
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${now.getMonth() + 1}月${now.getDate()}日 周${weekDays[now.getDay()]}`
})

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const getStatusText = (status) => {
  const statusMap = {
    'normal': '待上课',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[status] || '待上课'
}

const fetchTodayCourses = async () => {
  try {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
    
    const res = await get('/courses', {
      startTime: startOfDay.toISOString(),
      endTime: endOfDay.toISOString()
    })
    
    todayCourses.value = res.data || []
  } catch (error) {
    console.error('获取今日课程失败', error)
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
  try {
    await put(`/courses/${course._id}`, { status: 'completed' })
    await post('/lesson-records', {
      studentId: course.studentId._id,
      courseId: course._id,
      courseStartTime: course.startTime,
      lessonsConsumed: 1,
      lessonContent: '',
      isDeducted: true,
      notes: '从首页直接上课'
    })
    uni.showToast({ title: '上课成功', icon: 'success' })
    await fetchTodayCourses()
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
          await put(`/courses/${course._id}`, { status: 'normal' })
          
          const lessonRecords = await get('/lesson-records', {
            courseId: course._id,
            studentId: course.studentId._id
          })
          
          if (lessonRecords.data && lessonRecords.data.length > 0) {
            const latestRecord = lessonRecords.data[0]
            await del(`/lesson-records/${latestRecord._id}`)
          }
          
          uni.showToast({ title: '取消上课成功', icon: 'success' })
          await fetchTodayCourses()
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

const goToPage = (url) => {
  if (url.includes('students') || url.includes('schedule')) {
    uni.switchTab({ url })
  } else {
    uni.navigateTo({ url })
  }
}

onMounted(() => {
  fetchTodayCourses()
  fetchStatistics()
})

onShow(() => {
  fetchTodayCourses()
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

.course-item.course-completed {
  opacity: 0.6;
  border-left-color: #67C23A;
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
</style>
