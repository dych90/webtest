<template>
  <view class="detail-container">
    <view class="info-section">
      <view class="info-header">
        <text class="info-title">课程详情</text>
        <text class="info-status" :class="statusClass">{{ statusText }}</text>
      </view>
      
      <view class="info-list">
        <view class="info-item">
          <text class="info-label">学生</text>
          <text class="info-value">{{ course.studentId?.name || '未分配' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">课程类型</text>
          <text class="info-value">{{ course.courseTypeId?.name || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">上课时间</text>
          <text class="info-value">{{ formatDateTime(course.startTime) }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">结束时间</text>
          <text class="info-value">{{ formatDateTime(course.endTime) }}</text>
        </view>
        <view class="info-item" v-if="course.notes">
          <text class="info-label">备注</text>
          <text class="info-value">{{ course.notes }}</text>
        </view>
      </view>
    </view>
    
    <view class="action-section">
      <button class="btn-complete" @click="handleComplete" v-if="course.status === 'normal'">完成课程</button>
      <button class="btn-cancel" @click="handleCancel" v-if="course.status === 'normal'">取消课程</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { get, put } from '@/utils/request'

const course = ref({})
const courseId = ref('')

const statusText = computed(() => {
  const map = { normal: '待上课', completed: '已完成', cancelled: '已取消' }
  return map[course.value.status] || '待上课'
})

const statusClass = computed(() => {
  const map = { normal: 'status-normal', completed: 'status-completed', cancelled: 'status-cancelled' }
  return map[course.value.status] || 'status-normal'
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  courseId.value = currentPage.options?.id || ''
  if (courseId.value) {
    fetchCourse()
  }
})

const fetchCourse = async () => {
  try {
    const res = await get(`/courses/${courseId.value}`)
    course.value = res.data || {}
  } catch (error) {
    uni.showToast({ title: '获取课程信息失败', icon: 'none' })
  }
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const handleComplete = async () => {
  try {
    await put(`/courses/${courseId.value}`, { status: 'completed' })
    uni.showToast({ title: '课程已完成', icon: 'success' })
    fetchCourse()
  } catch (error) {
    uni.showToast({ title: error.message || '操作失败', icon: 'none' })
  }
}

const handleCancel = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要取消这节课吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await put(`/courses/${courseId.value}`, { status: 'cancelled' })
          uni.showToast({ title: '课程已取消', icon: 'success' })
          fetchCourse()
        } catch (error) {
          uni.showToast({ title: error.message || '操作失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style scoped>
.detail-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.info-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 24rpx;
}

.info-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.info-status {
  font-size: 24rpx;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
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

.info-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
}

.info-label {
  font-size: 28rpx;
  color: #909399;
}

.info-value {
  font-size: 28rpx;
  color: #333;
}

.action-section {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 0;
}

.btn-complete {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #67C23A;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-cancel {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #fff;
  color: #F56C6C;
  border: 2rpx solid #F56C6C;
  border-radius: 8rpx;
  font-size: 28rpx;
}
</style>
