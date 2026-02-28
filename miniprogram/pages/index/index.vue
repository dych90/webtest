<template>
  <view class="index-container">
    <view class="welcome-section">
      <view class="welcome-text">
        <text class="greeting">{{ greeting }}</text>
        <text class="name">{{ userStore.userInfo?.name || '老师' }}</text>
      </view>
      <text class="date">{{ currentDate }}</text>
    </view>
    
    <view class="stats-section">
      <view class="stats-title">今日概览</view>
      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-value">{{ stats.todayCourses }}</text>
          <text class="stat-label">今日课程</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats.todayStudents }}</text>
          <text class="stat-label">上课学生</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats.totalStudents }}</text>
          <text class="stat-label">学生总数</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats.pendingReminders }}</text>
          <text class="stat-label">待处理提醒</text>
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
    
    <view class="quick-actions">
      <view class="section-title">快捷操作</view>
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
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { get, post, put, del } from '@/utils/request'

const userStore = useUserStore()

const stats = ref({
  todayCourses: 0,
  todayStudents: 0,
  totalStudents: 0,
  pendingReminders: 0
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
  return `${now.getMonth() + 1}月${now.getDate()}日 星期${weekDays[now.getDay()]}`
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
    stats.value.todayCourses = todayCourses.value.length
    
    const uniqueStudents = new Set(
      todayCourses.value
        .filter(c => c.studentId?._id)
        .map(c => c.studentId._id)
    )
    stats.value.todayStudents = uniqueStudents.size
  } catch (error) {
    console.error('获取今日课程失败', error)
  }
}

const fetchStats = async () => {
  try {
    const res = await get('/statistics')
    stats.value.totalStudents = res.data?.studentCount || 0
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
    await fetchStats()
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
          await fetchStats()
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
  fetchStats()
})

onShow(() => {
  fetchTodayCourses()
  fetchStats()
})
</script>

<style scoped>
.index-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.welcome-section {
  background: linear-gradient(135deg, #409EFF 0%, #66b1ff 100%);
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 20rpx;
  color: #fff;
}

.welcome-text {
  display: flex;
  align-items: baseline;
  margin-bottom: 16rpx;
}

.greeting {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.name {
  font-size: 40rpx;
  font-weight: bold;
}

.date {
  font-size: 26rpx;
  opacity: 0.8;
}

.stats-section {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.stats-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.stat-card {
  background-color: #f5f7fa;
  border-radius: 16rpx;
  padding: 24rpx;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #909399;
}

.schedule-section {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.section-more {
  font-size: 26rpx;
  color: #409EFF;
}

.empty-tip {
  text-align: center;
  padding: 40rpx 0;
  color: #909399;
  font-size: 28rpx;
}

.course-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.course-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #f5f7fa;
  border-radius: 16rpx;
  border-left: 6rpx solid #409EFF;
}

.course-item.course-completed {
  opacity: 0.6;
  border-left-color: #67C23A;
}

.course-time {
  width: 100rpx;
}

.time {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.course-info {
  flex: 1;
  padding: 0 20rpx;
}

.student-name {
  display: block;
  font-size: 30rpx;
  color: #333;
  margin-bottom: 8rpx;
}

.course-type {
  font-size: 24rpx;
  color: #909399;
}

.course-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12rpx;
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

.btn-attend {
  padding: 12rpx 24rpx;
  background-color: #409EFF;
  color: #fff;
  font-size: 24rpx;
  border: none;
  border-radius: 8rpx;
  line-height: 1.2;
}

.btn-cancel-attend {
  padding: 12rpx 24rpx;
  background-color: #fff;
  color: #F56C6C;
  font-size: 24rpx;
  border: 2rpx solid #F56C6C;
  border-radius: 8rpx;
  line-height: 1.2;
}

.quick-actions {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
  margin-top: 24rpx;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx;
}

.action-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  margin-bottom: 12rpx;
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
  font-size: 24rpx;
  color: #606266;
}
</style>
