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
          <text class="info-label">性别</text>
          <text class="info-value">{{ student.gender || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">年龄</text>
          <text class="info-value">{{ student.age || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">联系电话</text>
          <text class="info-value">{{ student.phone || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">课程类型</text>
          <text class="info-value">{{ student.defaultCourseTypeId?.name || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">陪练老师</text>
          <text class="info-value">{{ student.practiceTeacher || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">剩余课时</text>
          <text class="info-value text-primary">{{ student.remainingLessons || 0 }} 课时</text>
        </view>
        <view class="info-item" v-if="student.notes">
          <text class="info-label">备注</text>
          <text class="info-value">{{ student.notes }}</text>
        </view>
      </view>
    </view>
    
    <view class="action-section">
      <button class="btn-edit" @click="handleEdit">编辑学生</button>
      <button class="btn-delete" @click="handleDelete">删除学生</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { get, del } from '@/utils/request'

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

const handleDelete = () => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除学生"${student.value.name}"吗？`,
    confirmColor: '#F56C6C',
    success: async (res) => {
      if (res.confirm) {
        try {
          await del(`/students/${studentId.value}`)
          uni.showToast({ title: '删除成功', icon: 'success' })
          setTimeout(() => {
            uni.navigateBack()
          }, 1000)
        } catch (error) {
          uni.showToast({ title: error.message || '删除失败', icon: 'none' })
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

.text-primary {
  color: #409EFF;
  font-weight: bold;
}

.action-section {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 0;
}

.btn-edit {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #409EFF;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-delete {
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
