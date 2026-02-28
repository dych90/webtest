<template>
  <view class="lessons-container">
    <view class="tabs">
      <view 
        class="tab-item" 
        :class="{ active: activeTab === 'records' }" 
        @click="activeTab = 'records'"
      >
        消课记录
      </view>
      <view 
        class="tab-item" 
        :class="{ active: activeTab === 'courses' }" 
        @click="activeTab = 'courses'"
      >
        待上课课程
      </view>
    </view>
    
    <view v-if="activeTab === 'records'">
      <view v-if="lessonRecords.length === 0" class="empty-tip">
        暂无消课记录
      </view>
      
      <view v-else class="record-list">
        <view v-for="record in lessonRecords" :key="record._id" class="record-item">
          <view class="record-header">
            <text class="student-name">{{ record.studentId?.name || '未知学生' }}</text>
            <text class="record-date">{{ formatDateTime(record.recordDate) }}</text>
          </view>
          <view class="record-body">
            <view class="record-info">
              <text class="info-label">消课数量：</text>
              <text class="info-value">{{ record.lessonsConsumed }} 课时</text>
            </view>
            <view class="record-info" v-if="record.lessonContent">
              <text class="info-label">上课曲目：</text>
              <text class="info-value">{{ record.lessonContent }}</text>
            </view>
            <view class="record-info">
              <text class="info-label">是否扣费：</text>
              <text class="info-value" :class="record.isDeducted ? 'text-success' : 'text-info'">
                {{ record.isDeducted ? '已扣费' : '未扣费' }}
              </text>
            </view>
            <view class="record-info" v-if="record.notes">
              <text class="info-label">备注：</text>
              <text class="info-value">{{ record.notes }}</text>
            </view>
          </view>
          <view class="record-actions">
            <button class="btn-edit" @click="handleEdit(record)">编辑</button>
            <button class="btn-delete" @click="handleDelete(record)">删除</button>
          </view>
        </view>
      </view>
    </view>
    
    <view v-if="activeTab === 'courses'">
      <view v-if="pendingCourses.length === 0" class="empty-tip">
        暂无待上课课程
      </view>
      
      <view v-else class="course-list">
        <view v-for="course in pendingCourses" :key="course._id" class="course-item">
          <view class="course-header">
            <text class="student-name">{{ course.studentId?.name || '未分配' }}</text>
            <text class="course-type">{{ course.courseTypeId?.name || '未设置' }}</text>
          </view>
          <view class="course-body">
            <view class="course-info">
              <text class="info-label">上课时间：</text>
              <text class="info-value">{{ formatDateTime(course.startTime) }}</text>
            </view>
            <view class="course-info">
              <text class="info-label">结束时间：</text>
              <text class="info-value">{{ formatDateTime(course.endTime) }}</text>
            </view>
          </view>
          <view class="course-actions">
            <button class="btn-attend" @click="handleAttend(course)">上课</button>
          </view>
        </view>
      </view>
    </view>
    
    <view class="add-btn" @click="handleAdd" v-if="activeTab === 'records'">
      <text>+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, post, put, del } from '@/utils/request'

const activeTab = ref('records')
const lessonRecords = ref([])
const pendingCourses = ref([])

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const fetchRecords = async () => {
  try {
    const res = await get('/lesson-records')
    lessonRecords.value = res.data || []
  } catch (error) {
    console.error('获取消课记录失败', error)
  }
}

const fetchPendingCourses = async () => {
  try {
    const res = await get('/courses')
    pendingCourses.value = (res.data || []).filter(c => c.status === 'normal')
  } catch (error) {
    console.error('获取待上课课程失败', error)
  }
}

const handleAdd = () => {
  uni.navigateTo({
    url: '/pages/lessons/add'
  })
}

const handleEdit = (record) => {
  uni.navigateTo({
    url: `/pages/lessons/edit?id=${record._id}`
  })
}

const handleDelete = (record) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条消课记录吗？',
    confirmColor: '#F56C6C',
    success: async (res) => {
      if (res.confirm) {
        try {
          await del(`/lesson-records/${record._id}`)
          uni.showToast({ title: '删除成功', icon: 'success' })
          fetchRecords()
        } catch (error) {
          uni.showToast({ title: error.message || '删除失败', icon: 'none' })
        }
      }
    }
  })
}

const handleAttend = async (course) => {
  try {
    await put(`/courses/${course._id}`, { status: 'completed' })
    await post('/lesson-records', {
      studentId: course.studentId._id,
      courseId: course._id,
      courseStartTime: course.startTime,
      lessonsConsumed: 1,
      lessonContent: '',
      isDeducted: true,
      notes: '从消课管理直接上课'
    })
    uni.showToast({ title: '上课成功', icon: 'success' })
    fetchRecords()
    fetchPendingCourses()
  } catch (error) {
    uni.showToast({ title: error.message || '上课失败', icon: 'none' })
  }
}

onMounted(() => {
  fetchRecords()
  fetchPendingCourses()
})

onShow(() => {
  fetchRecords()
  fetchPendingCourses()
})
</script>

<style scoped>
.lessons-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
  padding-bottom: 140rpx;
}

.tabs {
  display: flex;
  background-color: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #606266;
  position: relative;
}

.tab-item.active {
  color: #409EFF;
  font-weight: bold;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60rpx;
  height: 4rpx;
  background-color: #409EFF;
  border-radius: 2rpx;
}

.empty-tip {
  text-align: center;
  padding: 100rpx 0;
  color: #909399;
  font-size: 28rpx;
}

.record-list, .course-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-item, .course-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.record-header, .course-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
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

.course-type {
  font-size: 24rpx;
  color: #409EFF;
  background-color: #ecf5ff;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.record-body, .course-body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.record-info, .course-info {
  display: flex;
  font-size: 26rpx;
}

.info-label {
  color: #909399;
}

.info-value {
  color: #333;
}

.text-success {
  color: #67C23A;
}

.text-info {
  color: #909399;
}

.record-actions, .course-actions {
  display: flex;
  gap: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.btn-edit {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  background-color: #409EFF;
  color: #fff;
  font-size: 24rpx;
  border: none;
  border-radius: 8rpx;
}

.btn-delete {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  background-color: #fff;
  color: #F56C6C;
  font-size: 24rpx;
  border: 2rpx solid #F56C6C;
  border-radius: 8rpx;
}

.btn-attend {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  background-color: #67C23A;
  color: #fff;
  font-size: 24rpx;
  border: none;
  border-radius: 8rpx;
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
