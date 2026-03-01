<template>
  <view class="statistics-container">
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
        <text class="stat-value">{{ statistics.totalCourses }}</text>
        <text class="stat-label">总课程数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ statistics.totalLessonsSold }}</text>
        <text class="stat-label">已售课时</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ statistics.totalLessonsConsumed }}</text>
        <text class="stat-label">已消课时</text>
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
        <text class="stat-value warning">{{ statistics.totalRemainingLessons }}</text>
        <text class="stat-label">剩余课时</text>
      </view>
    </view>
    
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
        <text class="stat-value">{{ statistics.monthlyLessonsConsumed }} 课时</text>
        <text class="stat-label">本月消课</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ statistics.monthlyLessonsAttended }} 节</text>
        <text class="stat-label">本月上课数</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get } from '@/utils/request'

const statistics = ref({
  studentCount: 0,
  totalRevenue: 0,
  totalCourses: 0,
  totalLessonsSold: 0,
  totalLessonsConsumed: 0,
  totalLessonsAttended: 0,
  totalRemainingLessons: 0,
  prepaidLessonsConsumed: 0,
  monthlyPrepaidRevenue: 0,
  monthlyActualRevenue: 0,
  monthlyLessonsConsumed: 0,
  monthlyLessonsAttended: 0
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

onShow(() => {
  fetchStatistics()
})
</script>

<style scoped>
.statistics-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  padding-left: 10rpx;
  border-left: 6rpx solid #409EFF;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-bottom: 30rpx;
}

.stat-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 12rpx;
}

.stat-value.revenue {
  color: #E6A23C;
}

.stat-value.success {
  color: #67C23A;
}

.stat-value.warning {
  color: #E6A23C;
}

.stat-label {
  font-size: 24rpx;
  color: #909399;
}
</style>
