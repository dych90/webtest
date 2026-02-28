<template>
  <view class="detail-container">
    <view class="info-section">
      <view class="info-header">
        <view class="student-avatar">
          <text>{{ student.name?.charAt(0) || '学' }}</text>
        </view>
        <view class="student-info">
          <text class="student-name">{{ student.name }}</text>
          <text class="student-type">{{ student.paymentType === 'prepaid' ? '预付费' : '单次付费' }}</text>
        </view>
      </view>
      
      <view class="info-list">
        <view class="info-item">
          <text class="info-label">联系电话</text>
          <text class="info-value">{{ student.phone || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">剩余课时</text>
          <text class="info-value">{{ student.remainingLessons || 0 }} 课时</text>
        </view>
        <view class="info-item">
          <text class="info-label">备注</text>
          <text class="info-value">{{ student.notes || '无' }}</text>
        </view>
      </view>
    </view>
    
    <view class="action-section">
      <button class="btn-edit" @click="handleEdit">编辑学生</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { get } from '@/utils/request'

const student = ref({})
const studentId = ref('')

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  studentId.value = currentPage.options?.id || ''
  if (studentId.value) {
    fetchStudent()
  }
})

const fetchStudent = async () => {
  try {
    const res = await get(`/students/${studentId.value}`)
    student.value = res.data || {}
  } catch (error) {
    uni.showToast({ title: '获取学生信息失败', icon: 'none' })
  }
}

const handleEdit = () => {
  uni.navigateTo({
    url: `/pages/students/edit?id=${studentId.value}`
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
  align-items: center;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 24rpx;
}

.student-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.student-avatar text {
  color: #fff;
  font-size: 40rpx;
  font-weight: bold;
}

.student-name {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.student-type {
  font-size: 24rpx;
  color: #909399;
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
  padding: 20rpx 0;
}

.btn-edit {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #409EFF;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}
</style>
