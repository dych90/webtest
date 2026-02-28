<template>
  <view class="statistics-container">
    <view class="stats-grid">
      <view class="stat-card">
        <text class="stat-value">{{ statistics.studentCount }}</text>
        <text class="stat-label">学生总数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">¥{{ statistics.totalRevenue }}</text>
        <text class="stat-label">总收入</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ statistics.totalCourses }}</text>
        <text class="stat-label">总课程数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ statistics.totalLessonsConsumed }}</text>
        <text class="stat-label">已消课时</text>
      </view>
    </view>
    
    <view class="stats-section">
      <view class="section-title">本月数据</view>
      <view class="month-stats">
        <view class="month-stat">
          <text class="month-value">¥{{ statistics.monthlyPrepaidRevenue }}</text>
          <text class="month-label">本月预收入</text>
        </view>
        <view class="month-stat">
          <text class="month-value">{{ statistics.monthlyLessonsConsumed }}</text>
          <text class="month-label">本月消课</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { get } from '@/utils/request'

const statistics = ref({
  studentCount: 0,
  totalRevenue: 0,
  totalCourses: 0,
  totalLessonsConsumed: 0,
  monthlyPrepaidRevenue: 0,
  monthlyLessonsConsumed: 0
})

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

onMounted(() => {
  fetchStatistics()
})
</script>

<style scoped>
.statistics-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.stat-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #909399;
}

.stats-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
}

.month-stats {
  display: flex;
  justify-content: space-around;
}

.month-stat {
  text-align: center;
}

.month-value {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #67C23A;
  margin-bottom: 8rpx;
}

.month-label {
  font-size: 24rpx;
  color: #909399;
}
</style>
