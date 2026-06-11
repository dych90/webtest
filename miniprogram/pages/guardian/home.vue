<template>
  <view class="guardian-page">
    <view class="student-switch" v-if="students.length > 0">
      <picker :range="students" range-key="name" :value="studentIndex" @change="onStudentChange">
        <view class="student-picker">
          <view>
            <text class="student-name">{{ currentStudent?.name || '选择学生' }}</text>
            <text class="student-teacher">老师：{{ currentStudent?.teacher?.name || '未设置' }}</text>
          </view>
          <text class="switch-text">切换</text>
        </view>
      </picker>
    </view>

    <view class="summary-grid">
      <view class="summary-card">
        <text class="summary-label">剩余课时</text>
        <text class="summary-value">{{ getBalanceText() }}</text>
      </view>
      <view class="summary-card">
        <text class="summary-label">今日课程</text>
        <text class="summary-value">{{ overview.todayCourses?.length || 0 }}</text>
      </view>
    </view>

    <view class="card">
      <view class="card-header">
        <text class="card-title">下次上课</text>
        <text class="card-link" @click="goSchedule">查看课表</text>
      </view>
      <view v-if="overview.nextCourse" class="next-course">
        <text class="course-time">{{ formatDateTime(overview.nextCourse.startTime) }}</text>
        <text class="course-name">{{ overview.nextCourse.courseTypeId?.name || '课程' }}</text>
      </view>
      <view v-else class="empty">暂无后续课程</view>
    </view>

    <view class="card">
      <view class="card-header">
        <text class="card-title">今日安排</text>
      </view>
      <view v-if="overview.todayCourses?.length" class="course-list">
        <view
          v-for="course in overview.todayCourses"
          :key="course._id"
          class="course-row"
          :class="{ clickable: course.lessonRecord }"
          @click="goCourseRecord(course)"
        >
          <text class="course-time">{{ formatTimeRange(course) }}</text>
          <view class="course-main">
            <text class="course-name">{{ course.courseTypeId?.name || '课程' }}</text>
            <text v-if="course.lessonRecord" class="record-summary">{{ getRecordSummary(course.lessonRecord) }}</text>
          </view>
          <view class="course-side">
            <text class="status" :class="course.status">{{ getStatusText(course.status) }}</text>
            <text v-if="course.lessonRecord" class="record-link">看记录</text>
          </view>
        </view>
      </view>
      <view v-else class="empty">今日暂无课程</view>
    </view>

    <view class="card">
      <view class="card-header">
        <text class="card-title">最近记录</text>
        <text class="card-link" @click="goRecords">查看全部</text>
      </view>
      <view v-if="overview.recentLessonRecords?.length" class="record-list">
        <view v-for="record in overview.recentLessonRecords" :key="record._id" class="record-row" @click="goRecord(record)">
          <view>
            <text class="record-title">{{ record.courseTypeId?.name || '消课记录' }}</text>
            <text class="record-date">{{ formatDate(record.recordDate) }}</text>
            <text class="record-summary">{{ getRecordSummary(record) }}</text>
          </view>
          <view class="record-side">
            <text class="record-count">{{ record.lessonsConsumed }}课时</text>
            <text class="record-link">查看</text>
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无消课记录</view>
    </view>

    <view class="guardian-tabbar">
      <view class="tab active">首页</view>
      <view class="tab" @click="goSchedule">课表</view>
      <view class="tab" @click="goRecords">记录</view>
      <view class="tab" @click="goMine">我的</view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get } from '@/utils/request'
import { getSelectedGuardianStudentId, saveGuardianSession } from '@/utils/guardian'

const students = ref([])
const selectedStudentId = ref('')
const overview = ref({})

const studentIndex = computed(() => {
  return Math.max(0, students.value.findIndex(student => student._id === selectedStudentId.value))
})

const currentStudent = computed(() => {
  return students.value.find(student => student._id === selectedStudentId.value) || students.value[0]
})

const getBalanceText = () => {
  if (currentStudent.value?.paymentType === 'free') {
    return '免费'
  }

  return overview.value.balance?.remainingLessons || 0
}

onShow(() => {
  fetchStudents()
})

const fetchStudents = async () => {
  try {
    const res = await get('/guardian/students')
    students.value = res.data || []
    saveGuardianSession({
      token: uni.getStorageSync('token'),
      guardian: JSON.parse(uni.getStorageSync('guardianInfo') || '{}'),
      students: students.value
    })
    selectedStudentId.value = getSelectedGuardianStudentId(students.value)

    if (selectedStudentId.value) {
      fetchOverview()
    }
  } catch (error) {
    uni.showToast({ title: error.message || '获取学生失败', icon: 'none' })
  }
}

const fetchOverview = async () => {
  try {
    const res = await get(`/guardian/students/${selectedStudentId.value}/overview`)
    overview.value = res.data || {}
  } catch (error) {
    uni.showToast({ title: error.message || '获取概览失败', icon: 'none' })
  }
}

const onStudentChange = (event) => {
  const index = event.detail.value
  const student = students.value[index]
  if (!student) return

  selectedStudentId.value = student._id
  uni.setStorageSync('selectedGuardianStudentId', student._id)
  fetchOverview()
}

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const formatDateTime = (value) => {
  return `${formatDate(value)} ${formatTime(value)}`
}

const formatTimeRange = (course) => {
  return `${formatTime(course.startTime)}-${formatTime(course.endTime)}`
}

const getStatusText = (status) => {
  const map = {
    normal: '待上课',
    completed: '已上课',
    cancelled: '已取消',
    rescheduled: '已改期'
  }
  return map[status] || '待上课'
}

const getRecordSummary = (record) => {
  const parts = []
  if (record?.lessonContent) {
    parts.push('文字')
  }

  const mediaCount = record?.mediaItems?.length || 0
  if (mediaCount > 0) {
    parts.push(`${mediaCount}个素材`)
  }

  return parts.length ? parts.join(' · ') : '课后记录'
}

const goRecord = (record) => {
  if (!record?._id || !selectedStudentId.value) return

  uni.navigateTo({
    url: `/pages/guardian/records?studentId=${selectedStudentId.value}&recordId=${record._id}`
  })
}

const goCourseRecord = (course) => {
  if (!course?.lessonRecord) return
  goRecord(course.lessonRecord)
}

const goSchedule = () => {
  uni.navigateTo({ url: '/pages/guardian/schedule' })
}

const goRecords = () => {
  uni.navigateTo({ url: '/pages/guardian/records' })
}

const goMine = () => {
  uni.navigateTo({ url: '/pages/guardian/mine' })
}
</script>

<style scoped>
.guardian-page {
  min-height: 100vh;
  padding: 20rpx 20rpx 120rpx;
  box-sizing: border-box;
  background-color: #f6f7fb;
}

.student-switch,
.card,
.summary-card {
  background-color: #fff;
  border-radius: 8rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 45, 61, 0.05);
}

.student-switch {
  margin-bottom: 18rpx;
}

.student-picker {
  min-height: 104rpx;
  padding: 20rpx 24rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.student-name {
  display: block;
  font-size: 34rpx;
  font-weight: bold;
  color: #303133;
}

.student-teacher {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #909399;
}

.switch-text,
.card-link {
  font-size: 24rpx;
  color: #409EFF;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-bottom: 18rpx;
}

.summary-card {
  padding: 24rpx;
}

.summary-label {
  display: block;
  font-size: 24rpx;
  color: #909399;
}

.summary-value {
  display: block;
  margin-top: 10rpx;
  font-size: 44rpx;
  line-height: 52rpx;
  font-weight: bold;
  color: #409EFF;
}

.card {
  padding: 24rpx;
  margin-bottom: 18rpx;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #303133;
}

.next-course {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.course-list,
.record-list {
  display: flex;
  flex-direction: column;
}

.course-row,
.record-row {
  min-height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid #f0f0f0;
  gap: 12rpx;
}

.course-row.clickable,
.record-row {
  cursor: pointer;
}

.course-row:last-child,
.record-row:last-child {
  border-bottom: none;
}

.course-main {
  flex: 1;
  min-width: 0;
}

.course-side,
.record-side {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
}

.course-time,
.record-date {
  font-size: 24rpx;
  color: #909399;
}

.course-name,
.record-title {
  display: block;
  font-size: 28rpx;
  color: #303133;
  font-weight: bold;
}

.record-date {
  display: block;
}

.record-summary {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #909399;
}

.status,
.record-count {
  flex-shrink: 0;
  font-size: 24rpx;
  color: #409EFF;
}

.record-link {
  font-size: 22rpx;
  color: #409EFF;
}

.status.completed {
  color: #67C23A;
}

.status.cancelled,
.status.rescheduled {
  color: #909399;
}

.empty {
  padding: 24rpx 0;
  text-align: center;
  color: #909399;
  font-size: 26rpx;
}

.guardian-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 96rpx;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background-color: #fff;
  border-top: 1rpx solid #ebeef5;
}

.tab {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: #909399;
}

.tab.active {
  color: #409EFF;
  font-weight: bold;
}
</style>
