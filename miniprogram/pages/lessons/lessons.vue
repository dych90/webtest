<template>
  <view class="lessons-container" :class="themeClass">
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
    
    <view class="search-bar" v-if="activeTab === 'records'">
      <input 
        class="search-input" 
        placeholder="搜索学生姓名" 
        v-model="searchKeyword"
        @input="filterRecords"
      />
      <view class="search-icon">🔍</view>
    </view>
    
    <view class="search-bar" v-if="activeTab === 'courses'">
      <input 
        class="search-input" 
        placeholder="搜索学生姓名" 
        v-model="courseSearchKeyword"
        @input="filterCourses"
      />
      <view class="search-icon">🔍</view>
    </view>
    
    <view v-if="activeTab === 'records'">
      <view v-if="filteredRecords.length === 0" class="empty-tip">
        {{ searchKeyword ? '未找到匹配的记录' : '暂无消课记录' }}
      </view>
      
      <view v-else class="record-list">
        <view v-for="record in filteredRecords" :key="record._id" class="record-item">
          <view class="record-header">
            <text class="student-name">{{ record.studentId?.name || '未知学生' }}</text>
            <view class="header-right">
              <text class="remaining-lessons clickable" :class="record.studentId?.paymentType" @click.stop="goToBalance(record.studentId?.name)">
                {{ getStudentBalanceText(record.studentId) }}
              </text>
              <text class="record-date">记录时间：{{ formatDateTime(record.recordDate) }}</text>
            </view>
          </view>
          <view class="record-body">
            <view class="record-info highlight">
              <text class="info-label">上课时间：</text>
              <text class="info-value primary">{{ formatDateTime(record.courseStartTime) || '未记录' }}</text>
            </view>
            <view class="record-info">
              <text class="info-label">消课数量：</text>
              <text class="info-value">{{ record.lessonsConsumed }} 课时</text>
            </view>
            <view class="record-info" v-if="record.lessonContent">
              <text class="info-label">上课曲目：</text>
              <text class="info-value">{{ record.lessonContent }}</text>
            </view>
            <view class="record-info" v-if="getMediaSummary(record)">
              <text class="info-label">课后素材：</text>
              <text class="info-value primary">{{ getMediaSummary(record) }}</text>
            </view>
            <view class="record-info">
              <text class="info-label">是否扣费：</text>
              <text class="info-value" :class="record.isDeducted ? 'text-success' : 'text-info'">
                {{ record.isDeducted ? '已扣费' : '未扣费' }}
              </text>
            </view>
            <view class="record-info" v-if="record.isGiftLesson">
              <text class="info-label">课程类型：</text>
              <text class="info-value text-gift">赠课</text>
            </view>
            <view class="record-info" v-if="record.notes">
              <text class="info-label">备注：</text>
              <text class="info-value">{{ record.notes }}</text>
            </view>
          </view>
          <view class="record-actions">
            <button v-if="canManageRecord(record)" class="btn-reward" @click="openRewardSettlement(record)">积分</button>
            <button class="btn-edit" @click="handleEdit(record)">
              {{ canManageRecord(record) ? '编辑' : '查看' }}
            </button>
            <button v-if="canManageRecord(record)" class="btn-delete" @click="handleDelete(record)">删除</button>
          </view>
        </view>
      </view>
    </view>
    
    <view v-if="activeTab === 'courses'">
      <view v-if="filteredCourses.length === 0" class="empty-tip">
        {{ courseSearchKeyword ? '未找到匹配的课程' : '暂无待上课课程' }}
      </view>
      
      <view v-else class="course-list">
        <view v-for="course in filteredCourses" :key="course._id" class="course-item">
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
          <view class="course-actions" v-if="canManageCourse(course)">
            <button class="btn-attend" @click="handleAttend(course)">上课</button>
          </view>
        </view>
      </view>
    </view>
    
    <view class="add-btn" @click="handleAdd" v-if="activeTab === 'records'">
      <text>+</text>
    </view>

    <view class="dialog-mask" v-if="rewardDialogVisible" @click="closeRewardDialog">
      <view class="dialog-content" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">{{ pendingRewardCourse ? '确认上课并结算' : '奖励结算' }}</text>
          <text class="dialog-close" @click="closeRewardDialog">×</text>
        </view>
        <view class="dialog-body">
          <view class="attend-info">
            <text class="attend-student">{{ rewardTargetName }}</text>
            <text class="attend-course">{{ rewardTargetTime }}</text>
          </view>
          <view class="form-item">
            <text class="form-label">上课奖励（星）</text>
            <input
              class="form-input"
              type="digit"
              v-model="lessonRewardValue"
              placeholder="例如 3 或 7.5"
              @input="onLessonRewardInput"
            />
            <text class="notify-tip">默认按满分预填，0 表示不发放</text>
          </view>
          <view class="form-item">
            <text class="form-label">本周练习星</text>
            <input
              class="form-input"
              type="digit"
              v-model="practiceRewardValue"
              placeholder="例如 12"
              @input="onPracticeRewardInput"
            />
            <text class="notify-tip">每周上限35星</text>
          </view>
        </view>
        <view class="dialog-footer">
          <button class="btn-cancel" :disabled="rewardSaving" @click="closeRewardDialog">取消</button>
          <button class="btn-confirm" :loading="rewardSaving" :disabled="rewardSaving" @click="confirmRewardSettlement">确认</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, post, put, del } from '@/utils/request'
import { getPaymentTypeText } from '@/utils/paymentType'
import { applyTheme, getCurrentTheme, getThemeClass } from '@/utils/theme'
import { formatRewardAmount } from '@/utils/reward'
import { emitRewardStateChanged } from '@/utils/rewardEvents'

const activeTab = ref('records')
const lessonRecords = ref([])
const pendingCourses = ref([])
const searchKeyword = ref('')
const courseSearchKeyword = ref('')
const filteredRecords = ref([])
const filteredCourses = ref([])
const themeClass = ref(getThemeClass())
const themeColors = ref(getCurrentTheme())
const DEFAULT_PLANNED_LESSONS = 1
const rewardDialogVisible = ref(false)
const rewardSaving = ref(false)
const pendingRewardCourse = ref(null)
const rewardTargetRecord = ref(null)
const lessonRewardValue = ref('5')
const lessonRewardTouched = ref(false)
const practiceRewardValue = ref('0')

const getCoursePlannedLessons = (course) => {
  const plannedLessons = Number(course?.plannedLessons)
  if (!Number.isFinite(plannedLessons) || plannedLessons <= 0) {
    return DEFAULT_PLANNED_LESSONS
  }

  return Math.round((plannedLessons + Number.EPSILON) * 100) / 100
}

const getRewardLessonCount = (item) => {
  const lessonCount = Number(item?.lessonCountSnapshot ?? item?.lessonsConsumed ?? item?.plannedLessons ?? 1)
  if (!Number.isFinite(lessonCount) || lessonCount <= 0) {
    return DEFAULT_PLANNED_LESSONS
  }

  return Math.round((lessonCount + Number.EPSILON) * 100) / 100
}

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
    filterRecords()
  } catch (error) {
    console.error('获取消课记录失败', error)
  }
}

const filterRecords = () => {
  if (!searchKeyword.value.trim()) {
    filteredRecords.value = lessonRecords.value
  } else {
    const keyword = searchKeyword.value.trim().toLowerCase()
    filteredRecords.value = lessonRecords.value.filter(record => {
      const name = record.studentId?.name || ''
      return name.toLowerCase().includes(keyword)
    })
  }
}

const getStudentBalanceText = (student) => {
  if (!student) return '-'
  if (student.paymentType !== 'prepaid') {
    return getPaymentTypeText(student.paymentType)
  }
  return `剩余${student.remainingLessons ?? 0}课时`
}

const getMediaSummary = (record) => {
  const mediaItems = record.mediaItems || []
  const imageCount = mediaItems.filter(item => item.type === 'image').length
  const audioCount = mediaItems.filter(item => item.type === 'audio').length
  const parts = []

  if (imageCount > 0) {
    parts.push(`${imageCount}张照片`)
  }
  if (audioCount > 0) {
    parts.push(`${audioCount}段语音`)
  }

  return parts.join('，')
}

const rewardTargetName = computed(() => {
  if (pendingRewardCourse.value) {
    return pendingRewardCourse.value.studentId?.name || '未知学生'
  }

  return rewardTargetRecord.value?.studentId?.name || '未知学生'
})

const rewardTargetTime = computed(() => {
  if (pendingRewardCourse.value) {
    return formatDateTime(pendingRewardCourse.value.startTime)
  }

  return formatDateTime(rewardTargetRecord.value?.courseStartTime || rewardTargetRecord.value?.recordDate)
})

const canManageRecord = (record) => record?.canManageRecord !== false

const canManageCourse = (course) => course?.canManageCourse !== false

const fetchPendingCourses = async () => {
  try {
    const res = await get('/courses')
    pendingCourses.value = (res.data || []).filter(c => c.status === 'normal')
    filterCourses()
  } catch (error) {
    console.error('获取待上课课程失败', error)
  }
}

const filterCourses = () => {
  if (!courseSearchKeyword.value.trim()) {
    filteredCourses.value = pendingCourses.value
  } else {
    const keyword = courseSearchKeyword.value.trim().toLowerCase()
    filteredCourses.value = pendingCourses.value.filter(course => {
      const name = course.studentId?.name || ''
      return name.toLowerCase().includes(keyword)
    })
  }
}

const goToBalance = (studentName) => {
  if (!studentName) return
  uni.navigateTo({
    url: `/pages/balance/balance?search=${encodeURIComponent(studentName)}`
  })
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
  if (!canManageRecord(record)) {
    uni.showToast({ title: '只能查看该记录', icon: 'none' })
    return
  }

  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条消课记录吗？',
    confirmColor: themeColors.value.danger,
    success: async (res) => {
      if (res.confirm) {
        try {
          await del(`/lesson-records/${record._id}`)
          emitRewardStateChanged({ source: 'lessons-delete-record', studentId: record.studentId?._id || record.studentId })
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
  if (!canManageCourse(course)) {
    uni.showToast({ title: '只能查看该课程', icon: 'none' })
    return
  }

  resetRewardDialog(getRewardLessonCount(course))
  pendingRewardCourse.value = course
  rewardDialogVisible.value = true
}

const resetRewardDialog = (plannedLessons = DEFAULT_PLANNED_LESSONS) => {
  lessonRewardTouched.value = false
  lessonRewardValue.value = formatRewardAmount(plannedLessons * 5)
  practiceRewardValue.value = '0'
  pendingRewardCourse.value = null
  rewardTargetRecord.value = null
}

const closeRewardDialog = () => {
  if (rewardSaving.value) return
  rewardDialogVisible.value = false
}

const onLessonRewardInput = (event) => {
  lessonRewardTouched.value = true
  lessonRewardValue.value = event.detail.value
}

const onPracticeRewardInput = (event) => {
  practiceRewardValue.value = event.detail.value
}

const openRewardSettlement = (record) => {
  if (!canManageRecord(record)) {
    uni.showToast({ title: '只能查看该记录', icon: 'none' })
    return
  }

  resetRewardDialog(getRewardLessonCount(record))
  rewardTargetRecord.value = record
  rewardDialogVisible.value = true
}

const buildRewardPayload = () => {
  const lessonReward = Number(lessonRewardValue.value)
  const practiceReward = Number(practiceRewardValue.value)

  if (!Number.isFinite(lessonReward) || lessonReward < 0) {
    throw new Error('请输入有效的上课奖励星数')
  }

  if (!Number.isFinite(practiceReward) || practiceReward < 0) {
    throw new Error('请输入有效的练习星数')
  }

  return {
    lessonRewardValue: lessonReward,
    practiceRewardValue: practiceReward,
    remark: '消课管理奖励结算'
  }
}

const settleLessonRecordReward = async (lessonRecord) => {
  if (!lessonRecord?._id) {
    throw new Error('消课记录缺少ID')
  }

  const res = await post(`/lesson-records/${lessonRecord._id}/reward-settlements`, buildRewardPayload())
  return Number(res.data?.settlement?.totalPoints) || 0
}

const confirmRewardSettlement = async () => {
  if (rewardSaving.value) return

  rewardSaving.value = true
  try {
    let totalPoints = 0

    if (pendingRewardCourse.value) {
      const lessonRecord = await createAttendRecord(pendingRewardCourse.value)
      totalPoints = await settleLessonRecordReward(lessonRecord)
    } else {
      totalPoints = await settleLessonRecordReward(rewardTargetRecord.value)
    }

    uni.showToast({
      title: totalPoints > 0 ? `奖励${totalPoints}分` : '已结算',
      icon: 'success'
    })
    emitRewardStateChanged({
      source: pendingRewardCourse.value ? 'lessons-attend' : 'lessons-settlement',
      studentId: pendingRewardCourse.value?.studentId?._id ||
        pendingRewardCourse.value?.studentId ||
        rewardTargetRecord.value?.studentId?._id ||
        rewardTargetRecord.value?.studentId
    })
    rewardDialogVisible.value = false
    fetchRecords()
    fetchPendingCourses()
  } catch (error) {
    uni.showToast({ title: error.message || '结算失败', icon: 'none' })
  } finally {
    rewardSaving.value = false
  }
}

const createAttendRecord = async (course) => {
  try {
    await put(`/courses/${course._id}`, { status: 'completed' })
    
    const studentId = course.studentId?._id || course.studentId
    if (!studentId) {
      throw new Error('课程缺少学生信息')
    }

    const courseTypeId = course.courseTypeId?._id || course.courseTypeId
    const res = await post('/lesson-records', {
      studentId: studentId,
      courseId: course._id,
      courseTypeId: courseTypeId,
      courseStartTime: course.startTime,
      lessonsConsumed: getCoursePlannedLessons(course),
      lessonContent: '',
      isDeducted: true,
      notes: '从消课管理直接上课'
    })
    return res.data
  } catch (error) {
    throw error
  }
}

onMounted(() => {
  refreshTheme()
  fetchRecords()
  fetchPendingCourses()
})

onShow(() => {
  refreshTheme()
  fetchRecords()
  fetchPendingCourses()
})

const refreshTheme = () => {
  themeClass.value = getThemeClass()
  themeColors.value = applyTheme()
}
</script>

<style scoped>
.lessons-container {
  padding: 20rpx;
  background: var(--theme-page-bg);
  min-height: 100vh;
  padding-bottom: 140rpx;
}

.tabs {
  display: flex;
  background-color: var(--theme-card);
  border-radius: var(--theme-tab-radius);
  margin-bottom: 20rpx;
  overflow: hidden;
  box-shadow: var(--theme-card-shadow);
  border: var(--theme-card-border);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: var(--theme-muted);
  position: relative;
}

.tab-item.active {
  color: var(--theme-primary);
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
  background-color: var(--theme-primary);
  border-radius: 2rpx;
}

.search-bar {
  display: flex;
  align-items: center;
  background-color: var(--theme-card);
  border-radius: var(--theme-search-radius);
  padding: 16rpx 20rpx;
  margin-bottom: 20rpx;
  box-shadow: var(--theme-card-shadow);
  border: var(--theme-card-border);
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  border: none;
  outline: none;
  background: transparent;
}

.search-input::placeholder {
  color: var(--theme-muted);
}

.search-icon {
  font-size: 32rpx;
  color: var(--theme-muted);
  margin-left: 16rpx;
}

.empty-tip {
  text-align: center;
  padding: 100rpx 0;
  color: var(--theme-muted);
  font-size: 28rpx;
}

.record-list, .course-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-item, .course-item {
  background-color: var(--theme-card);
  border-radius: var(--theme-card-radius);
  padding: 24rpx;
  box-shadow: var(--theme-card-shadow);
  border: var(--theme-card-border);
}

.record-header, .course-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid var(--theme-border);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.remaining-lessons {
  font-size: 22rpx;
  color: var(--theme-warning);
  background-color: var(--theme-warning-soft);
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.remaining-lessons.pay-per-lesson,
.remaining-lessons.payPerLesson,
.remaining-lessons.free {
  color: var(--theme-muted);
  background-color: var(--theme-bg);
}

.remaining-lessons.clickable {
  cursor: pointer;
}

.remaining-lessons.clickable:active {
  opacity: 0.7;
}

.student-name {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--theme-text);
}

.record-date {
  font-size: 24rpx;
  color: var(--theme-muted);
}

.course-type {
  font-size: 24rpx;
  color: var(--theme-primary);
  background-color: var(--theme-primary-soft);
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
  color: var(--theme-muted);
}

.info-value {
  color: var(--theme-text);
}

.info-value.primary {
  color: var(--theme-primary);
  font-weight: bold;
}

.text-success {
  color: var(--theme-success);
}

.text-info {
  color: var(--theme-muted);
}

.text-gift {
  color: var(--theme-accent);
}

.record-info.highlight {
  background-color: var(--theme-primary-soft);
  padding: 12rpx 16rpx;
  border-radius: 8rpx;
  border-left: 4rpx solid var(--theme-primary);
}

.record-actions, .course-actions {
  display: flex;
  gap: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--theme-border);
}

.btn-reward,
.btn-edit {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  color: #FFFDF8;
  font-size: 24rpx;
  border: none;
  border-radius: 8rpx;
}

.btn-reward {
  background-color: var(--theme-warning);
}

.btn-edit {
  background-color: var(--theme-primary);
}

.btn-delete {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  background-color: var(--theme-card);
  color: var(--theme-danger);
  font-size: 24rpx;
  border: 2rpx solid var(--theme-danger);
  border-radius: 8rpx;
}

.btn-attend {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  background-color: var(--theme-success);
  color: #FFFDF8;
  font-size: 24rpx;
  border: none;
  border-radius: 8rpx;
}

.dialog-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(63, 53, 43, 0.42);
}

.dialog-content {
  width: 86%;
  max-width: 620rpx;
  background-color: var(--theme-card);
  border-radius: 18rpx;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 26rpx;
  border-bottom: 1rpx solid var(--theme-border);
}

.dialog-title {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--theme-text);
}

.dialog-close {
  font-size: 38rpx;
  color: var(--theme-muted);
}

.dialog-body {
  padding: 26rpx;
}

.attend-info {
  padding: 20rpx;
  margin-bottom: 24rpx;
  border-radius: 12rpx;
  background-color: var(--theme-bg-soft);
}

.attend-student,
.attend-course {
  display: block;
}

.attend-student {
  font-size: 30rpx;
  font-weight: bold;
  color: var(--theme-text);
  margin-bottom: 6rpx;
}

.attend-course {
  font-size: 24rpx;
  color: var(--theme-muted);
}

.notify-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.notify-tip {
  display: block;
  font-size: 22rpx;
  line-height: 32rpx;
  color: var(--theme-muted);
}

.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 76rpx;
  padding: 0 18rpx;
  border: 2rpx solid var(--theme-border);
  border-radius: 8rpx;
  font-size: 26rpx;
}

.form-input {
  width: 100%;
  height: 76rpx;
  padding: 0 18rpx;
  border: 2rpx solid var(--theme-border);
  border-radius: 8rpx;
  box-sizing: border-box;
  font-size: 26rpx;
  background-color: var(--theme-card);
}

.picker-arrow {
  font-size: 20rpx;
  color: var(--theme-muted);
}

.dialog-footer {
  display: flex;
  gap: 18rpx;
  padding: 20rpx 26rpx 26rpx;
  border-top: 1rpx solid var(--theme-border);
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.btn-cancel {
  background-color: var(--theme-card);
  color: var(--theme-muted);
  border: 2rpx solid var(--theme-border);
}

.btn-confirm {
  background-color: var(--theme-primary);
  color: #FFFDF8;
  border: none;
}

.add-btn {
  position: fixed;
  right: 40rpx;
  bottom: 120rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: var(--theme-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 30rpx rgba(184, 121, 62, 0.34);
}

.add-btn text {
  color: #FFFDF8;
  font-size: 48rpx;
  font-weight: 300;
}
</style>
