<template>
  <view class="guardian-page" :class="themeClass">
    <view class="top-card">
      <picker :range="students" range-key="name" :value="studentIndex" @change="onStudentChange">
        <view class="student-picker">
          <text class="student-name">{{ currentStudent?.name || '选择学生' }}</text>
          <text class="switch-text">切换</text>
        </view>
      </picker>

      <view class="month-nav">
        <text class="nav-btn" @click="prevMonth">‹</text>
        <text class="month-title">{{ currentYear }}年{{ currentMonth + 1 }}月</text>
        <text class="nav-btn" @click="nextMonth">›</text>
      </view>
    </view>

    <scroll-view scroll-y class="course-scroll">
      <view v-if="courseGroups.length === 0" class="empty">
        本月暂无课程安排
      </view>

      <view v-else class="course-groups">
        <view v-for="group in courseGroups" :key="group.date" class="day-card">
          <view class="day-header">
            <text class="day-date">{{ group.dateText }}</text>
            <text class="day-count">{{ group.courses.length }}节</text>
          </view>
          <view
            v-for="course in group.courses"
            :key="course._id"
            class="course-row"
            :class="[course.status, { clickable: course.lessonRecord }]"
            @click="goCourseRecord(course)"
          >
            <text class="course-time">{{ formatTime(course.startTime) }}-{{ formatTime(course.endTime) }}</text>
            <view class="course-main">
              <text class="course-name">{{ course.courseTypeId?.name || '课程' }}</text>
              <text class="teacher-name">老师：{{ course.teacherId?.name || '未设置' }}</text>
              <text v-if="course.lessonRecord" class="record-summary">{{ getRecordSummary(course.lessonRecord) }}</text>
            </view>
            <view class="course-side">
              <text class="status">{{ getStatusText(course.status) }}</text>
              <text v-if="course.lessonRecord" class="record-link" @click.stop="goCourseRecord(course)">看记录</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="guardian-tabbar">
      <view class="tab" @click="goHome">首页</view>
      <view class="tab active">课表</view>
      <view class="tab" @click="goRecords">记录</view>
      <view class="tab" @click="goMine">我的</view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get } from '@/utils/request'
import { getGuardianToken, getSelectedGuardianStudentId, saveGuardianSession } from '@/utils/guardian'
import { applyTheme, getThemeClass } from '@/utils/theme'

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth())
const students = ref([])
const selectedStudentId = ref('')
const courses = ref([])
const themeClass = ref(getThemeClass())

const studentIndex = computed(() => {
  return Math.max(0, students.value.findIndex(student => student._id === selectedStudentId.value))
})

const currentStudent = computed(() => {
  return students.value.find(student => student._id === selectedStudentId.value) || students.value[0]
})

const courseGroups = computed(() => {
  const groups = {}

  courses.value.forEach(course => {
    const date = formatDate(course.startTime)
    if (!groups[date]) {
      groups[date] = {
        date,
        dateText: formatDateWithWeek(course.startTime),
        courses: []
      }
    }
    groups[date].courses.push(course)
  })

  return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date))
})

onShow(() => {
  refreshTheme()
  fetchStudents()
})

const refreshTheme = () => {
  themeClass.value = getThemeClass()
  applyTheme()
}

const fetchStudents = async () => {
  try {
    const res = await get('/guardian/students')
    students.value = res.data || []
    saveGuardianSession({
      token: getGuardianToken(),
      guardian: JSON.parse(uni.getStorageSync('guardianInfo') || '{}'),
      students: students.value
    })
    selectedStudentId.value = getSelectedGuardianStudentId(students.value)

    if (selectedStudentId.value) {
      fetchCourses()
    }
  } catch (error) {
    uni.showToast({ title: error.message || '获取学生失败', icon: 'none' })
  }
}

const fetchCourses = async () => {
  const start = new Date(currentYear.value, currentMonth.value, 1)
  const end = new Date(currentYear.value, currentMonth.value + 1, 0, 23, 59, 59, 999)

  try {
    const res = await get(`/guardian/students/${selectedStudentId.value}/courses`, {
      startTime: start.toISOString(),
      endTime: end.toISOString()
    })
    courses.value = res.data || []
  } catch (error) {
    uni.showToast({ title: error.message || '获取课表失败', icon: 'none' })
  }
}

const onStudentChange = (event) => {
  const student = students.value[event.detail.value]
  if (!student) return

  selectedStudentId.value = student._id
  uni.setStorageSync('selectedGuardianStudentId', student._id)
  fetchCourses()
}

const prevMonth = () => {
  const date = new Date(currentYear.value, currentMonth.value - 1, 1)
  currentYear.value = date.getFullYear()
  currentMonth.value = date.getMonth()
  fetchCourses()
}

const nextMonth = () => {
  const date = new Date(currentYear.value, currentMonth.value + 1, 1)
  currentYear.value = date.getFullYear()
  currentMonth.value = date.getMonth()
  fetchCourses()
}

const formatDate = (value) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDateWithWeek = (value) => {
  const date = new Date(value)
  const weekNames = ['日', '一', '二', '三', '四', '五', '六']
  return `${date.getMonth() + 1}月${date.getDate()}日 周${weekNames[date.getDay()]}`
}

const formatTime = (value) => {
  const date = new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
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

const goCourseRecord = (course) => {
  if (!course?.lessonRecord?._id || !selectedStudentId.value) return

  uni.navigateTo({
    url: `/pages/guardian/records?studentId=${selectedStudentId.value}&recordId=${course.lessonRecord._id}`
  })
}

const goHome = () => {
  uni.navigateTo({ url: '/pages/guardian/home' })
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
  background: var(--theme-page-bg);
}

.top-card,
.day-card {
  background-color: var(--theme-card);
  border-radius: var(--theme-guardian-card-radius);
  box-shadow: var(--theme-card-shadow);
  border: var(--theme-card-border);
}

.top-card {
  margin-bottom: 18rpx;
  overflow: hidden;
}

.student-picker {
  min-height: 86rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid var(--theme-border);
}

.student-name {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--theme-text);
}

.switch-text,
.day-count {
  font-size: 24rpx;
  color: var(--theme-primary);
}

.month-nav {
  height: 86rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
}

.nav-btn {
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 44rpx;
  color: var(--theme-primary);
}

.month-title {
  font-size: 30rpx;
  font-weight: bold;
  color: var(--theme-text);
}

.course-scroll {
  height: calc(100vh - 230rpx);
}

.day-card {
  margin-bottom: 18rpx;
  overflow: hidden;
}

.day-header {
  height: 68rpx;
  padding: 0 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--theme-bg-soft);
  border-bottom: 1rpx solid var(--theme-border);
}

.day-date {
  font-size: 28rpx;
  font-weight: bold;
  color: var(--theme-text);
}

.course-row {
  min-height: 86rpx;
  padding: 12rpx 18rpx;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 120rpx 1fr 110rpx;
  column-gap: 12rpx;
  align-items: center;
  border-bottom: 1rpx solid #f0f0f0;
}

.course-row.clickable {
  cursor: pointer;
}

.course-row:last-child {
  border-bottom: none;
}

.course-row.completed {
  background-color: var(--theme-success-soft);
}

.course-row.cancelled,
.course-row.rescheduled {
  background-color: var(--theme-bg);
}

.course-time {
  font-size: 24rpx;
  color: var(--theme-primary);
}

.course-main {
  min-width: 0;
}

.course-name {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: var(--theme-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.teacher-name {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: var(--theme-muted);
}

.record-summary {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: var(--theme-success);
}

.course-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
}

.status {
  font-size: 22rpx;
  color: var(--theme-muted);
  text-align: right;
}

.record-link {
  font-size: 22rpx;
  color: var(--theme-primary);
  text-align: right;
}

.empty {
  padding: 90rpx 0;
  text-align: center;
  color: var(--theme-muted);
  font-size: 28rpx;
}

.guardian-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 96rpx;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background-color: var(--theme-card);
  border-top: 1rpx solid var(--theme-border);
}

.tab {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: var(--theme-muted);
}

.tab.active {
  color: var(--theme-primary);
  font-weight: bold;
}
</style>
