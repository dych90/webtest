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
          <text class="info-label">生日</text>
          <text class="info-value">{{ formatDate(student.birthday) || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">身份证号</text>
          <text class="info-value">{{ student.idCard || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">联系电话</text>
          <text class="info-value">{{ student.phone || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">家长姓名</text>
          <text class="info-value">{{ student.parentName || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">家长电话</text>
          <text class="info-value">{{ student.parentPhone || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">课程类型</text>
          <text class="info-value">{{ student.defaultCourseTypeId?.name || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">课时单价</text>
          <text class="info-value text-price">¥{{ student.currentPrice || 0 }}/课时</text>
        </view>
        <view class="info-item" v-if="student.paymentType === 'prepaid'">
          <text class="info-label">剩余课时</text>
          <text class="info-value text-primary">{{ student.remainingLessons || 0 }} 课时</text>
        </view>
        <view class="info-item">
          <text class="info-label">学琴起始日期</text>
          <text class="info-value">{{ formatDate(student.pianoStartDate) || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">陪练老师</text>
          <text class="info-value">{{ student.practiceTeacher || '未设置' }}</text>
        </view>
      </view>
    </view>
    
    <view class="info-section" v-if="student.learningProgress">
      <view class="section-header">
        <text class="section-title">学习进度</text>
      </view>
      <view class="section-content">
        <text>{{ student.learningProgress }}</text>
      </view>
    </view>
    
    <view class="info-section" v-if="student.learningPlan">
      <view class="section-header">
        <text class="section-title">学习计划</text>
      </view>
      <view class="section-content">
        <text>{{ student.learningPlan }}</text>
      </view>
    </view>
    
    <view class="info-section" v-if="student.notes">
      <view class="section-header">
        <text class="section-title">备注</text>
      </view>
      <view class="section-content">
        <text>{{ student.notes }}</text>
      </view>
    </view>
    
    <view class="price-history-section" v-if="priceHistory.length > 0">
      <view class="section-header">
        <text class="section-title">价格变更历史</text>
      </view>
      <view class="price-timeline">
        <view v-for="(item, index) in priceHistory" :key="item._id" class="timeline-item">
          <view class="timeline-dot" :class="{ 'is-latest': index === 0 }"></view>
          <view class="timeline-content">
            <view class="timeline-price">
              <text class="price-value">¥{{ item.price }}</text>
              <text class="price-unit">/课时</text>
              <text v-if="index === 0" class="current-tag">当前</text>
            </view>
            <text class="timeline-date">
              {{ formatDate(item.effectiveDate) }}
              <text v-if="item.expireDate"> - {{ formatDate(item.expireDate) }}</text>
            </text>
            <text class="timeline-course" v-if="item.courseTypeId?.name">
              {{ item.courseTypeId.name }}
            </text>
          </view>
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
import { onShow } from '@dcloudio/uni-app'
import { get, del } from '@/utils/request'

const student = ref({})
const studentId = ref('')
const priceHistory = ref([])

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  studentId.value = currentPage.options?.id || ''
  if (studentId.value) {
    fetchStudent()
    fetchPriceHistory()
  }
})

onShow(() => {
  if (studentId.value) {
    fetchStudent()
    fetchPriceHistory()
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

const fetchPriceHistory = async () => {
  try {
    const res = await get(`/students/${studentId.value}/price-history`)
    priceHistory.value = res.data || []
  } catch (error) {
    console.error('获取价格历史失败', error)
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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

.text-price {
  color: #E6A23C;
  font-weight: bold;
}

.section-header {
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.section-content {
  font-size: 28rpx;
  color: #606266;
  line-height: 1.6;
}

.price-history-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.price-timeline {
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  position: relative;
  padding-bottom: 24rpx;
  padding-left: 32rpx;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: 8rpx;
  top: 24rpx;
  bottom: 0;
  width: 2rpx;
  background-color: #e4e7ed;
}

.timeline-item:last-child::before {
  display: none;
}

.timeline-dot {
  position: absolute;
  left: 0;
  top: 8rpx;
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background-color: #dcdfe6;
}

.timeline-dot.is-latest {
  background-color: #409EFF;
}

.timeline-content {
  flex: 1;
}

.timeline-price {
  display: flex;
  align-items: center;
  margin-bottom: 6rpx;
}

.price-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.price-unit {
  font-size: 24rpx;
  color: #909399;
  margin-left: 4rpx;
}

.current-tag {
  font-size: 20rpx;
  color: #fff;
  background-color: #67C23A;
  padding: 2rpx 10rpx;
  border-radius: 4rpx;
  margin-left: 12rpx;
}

.timeline-date {
  display: block;
  font-size: 24rpx;
  color: #909399;
  margin-bottom: 4rpx;
}

.timeline-course {
  display: block;
  font-size: 22rpx;
  color: #c0c4cc;
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
