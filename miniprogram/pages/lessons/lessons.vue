<template>
  <view class="lessons-container">
    <view class="filter-bar">
      <picker mode="date" :value="selectedDate" @change="onDateChange">
        <view class="date-picker">
          <text>{{ selectedDate || '选择日期' }}</text>
        </view>
      </picker>
    </view>
    
    <view v-if="lessonRecords.length === 0" class="empty-tip">
      暂无消课记录
    </view>
    
    <view v-else class="record-list">
      <view v-for="record in lessonRecords" :key="record._id" class="record-item">
        <view class="record-header">
          <text class="student-name">{{ record.studentId?.name || '未知学生' }}</text>
          <text class="record-date">{{ formatDate(record.recordDate) }}</text>
        </view>
        <view class="record-body">
          <view class="record-info">
            <text class="info-label">消课数量：</text>
            <text class="info-value">{{ record.lessonsConsumed }} 课时</text>
          </view>
          <view class="record-info" v-if="record.courseTypeId">
            <text class="info-label">课程类型：</text>
            <text class="info-value">{{ record.courseTypeId?.name }}</text>
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
import { ref, onMounted } from 'vue'
import { get } from '@/utils/request'

const lessonRecords = ref([])
const selectedDate = ref('')

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

const onDateChange = (e) => {
  selectedDate.value = e.detail.value
  fetchRecords()
}

const fetchRecords = async () => {
  try {
    const res = await get('/lesson-records')
    lessonRecords.value = res.data || []
  } catch (error) {
    console.error('获取消课记录失败', error)
  }
}

const handleAdd = () => {
  uni.navigateTo({
    url: '/pages/lessons/add'
  })
}

onMounted(() => {
  fetchRecords()
})
</script>

<style scoped>
.lessons-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.filter-bar {
  margin-bottom: 20rpx;
}

.date-picker {
  background-color: #fff;
  padding: 20rpx 30rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
}

.empty-tip {
  text-align: center;
  padding: 100rpx 0;
  color: #909399;
  font-size: 28rpx;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.student-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.record-date {
  font-size: 24rpx;
  color: #909399;
}

.record-body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.record-info {
  display: flex;
  font-size: 26rpx;
}

.info-label {
  color: #909399;
}

.info-value {
  color: #333;
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
