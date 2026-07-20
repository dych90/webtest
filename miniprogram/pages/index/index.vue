<template>
  <view class="index-container" :class="themeClass">
    <view class="paper-grain"></view>
    <view class="side-label">
      <text>PIANO STUDIO</text>
    </view>

    <view class="home-content">
    <view class="header-section">
      <view class="header-left">
        <text class="header-kicker">LESSON LOG</text>
        <text class="greeting">{{ greeting }}，{{ userStore.userInfo?.name || '老师' }}</text>
        <text class="date">{{ currentDate }}</text>
      </view>
      <view class="header-art">
        <view class="mini-staff staff-a"></view>
        <view class="mini-staff staff-b"></view>
        <view class="mini-staff staff-c"></view>
        <image class="header-piano" src="../../image/pianoimage-transparent.png" mode="widthFix"></image>
      </view>
    </view>
    
    <view class="quick-actions">
      <view class="action-grid">
        <view class="action-item" @click="goToPage('/pages/students/students')">
          <view class="action-icon student-icon">👤</view>
          <text class="action-text">学生管理</text>
        </view>
        <view class="action-item" @click="goToPage('/pages/schedule/schedule')">
          <view class="action-icon schedule-icon">📅</view>
          <text class="action-text">排课管理</text>
        </view>
        <view class="action-item" @click="goToPage('/pages/payments/payments')">
          <view class="action-icon payment-icon">💰</view>
          <text class="action-text">缴费管理</text>
        </view>
        <view class="action-item" @click="goToPage('/pages/balance/balance')">
          <view class="action-icon balance-icon">🎫</view>
          <text class="action-text">剩余课费</text>
        </view>
        <view class="action-item" @click="goToPage('/pages/rewards/mall')">
          <view class="action-icon reward-icon">🎁</view>
          <text class="action-text">积分商城</text>
        </view>
      </view>
    </view>
    
    <view class="schedule-section">
      <view class="section-header">
        <view class="date-nav">
          <view class="nav-btn" @click="prevDay">
            <text>‹</text>
          </view>
          <text class="section-title">{{ courseDateText }}</text>
          <view class="nav-btn" @click="nextDay">
            <text>›</text>
          </view>
        </view>
        <view class="header-right-btns">
          <text v-if="!isToday" class="back-today-btn" @click="goToday">回到今天</text>
          <text class="section-more" @click="goToSchedule">查看全部</text>
        </view>
      </view>
      
      <view v-if="todayCourses.length === 0" class="empty-tip">
        {{ isToday ? '今日暂无课程安排' : '该日暂无课程安排' }}
      </view>
      
      <view v-else class="course-list">
        <view
          v-for="section in todayCourseSections"
          :key="section.key"
          class="course-section"
        >
          <view class="course-section-header">
            <text class="course-section-title">{{ section.title }}</text>
            <text class="course-section-count">{{ formatCourseSectionLessonCount(section.items) }}节</text>
          </view>

          <view
            v-for="(course, index) in section.items"
            :key="course._id"
            class="course-item"
            :class="[
              getCourseRoleClass(course),
              { 'course-completed': course.status === 'completed' }
            ]"
            @click="goToCourseDetail(course)"
          >
            <view class="course-index">
              <text>{{ index + 1 }}</text>
            </view>
            <view class="course-time">
              <text class="time">{{ formatTime(course.startTime) }}</text>
            </view>
            <view class="course-info">
              <text class="student-name">{{ formatStudentName(course.studentId?.name) }}</text>
              <view class="course-meta-row">
                <text class="course-type">{{ course.courseTypeId?.name || '未设置' }}</text>
                <text class="course-lesson-count">{{ formatCourseLessonCount(course) }}</text>
                <text class="course-role-tag" :class="getCourseRoleClass(course)">{{ getCourseRoleText(course) }}</text>
              </view>
              <text v-if="shouldShowCourseTeacher(course)" class="course-teacher">{{ getCourseTeacherText(course) }}</text>
              <view v-if="course.lessonRecord" class="lesson-record-preview">
                <text v-if="course.lessonRecord.lessonContent" class="lesson-record-text">{{ course.lessonRecord.lessonContent }}</text>
                <text v-if="getMediaSummary(course.lessonRecord)" class="lesson-record-media">{{ getMediaSummary(course.lessonRecord) }}</text>
              </view>
            </view>
            <view class="course-actions">
              <text
                class="status-tag"
                :class="{
                  'status-normal': course.status === 'normal',
                  'status-completed': course.status === 'completed',
                  'status-cancelled': course.status === 'cancelled'
                }"
              >
                {{ getStatusText(course.status) }}
              </text>
              <button
                v-if="canManageCourse(course) && course.status === 'normal'"
                class="btn-attend"
                @click.stop="handleAttendCourse(course)"
              >
                上课
              </button>
              <button
                v-if="canManageCourse(course) && course.status === 'completed'"
                class="btn-cancel-attend"
                @click.stop="handleCancelAttendCourse(course)"
              >
                取消
              </button>
              <button
                v-if="course.lessonRecord"
                class="btn-edit-record"
                @click.stop="goEditLessonRecord(course.lessonRecord, course)"
              >
                {{ canManageCourse(course) ? '编辑记录' : '查看记录' }}
              </button>
              <text class="arrow-icon">›</text>
            </view>
          </view>
        </view>
      </view>
    </view>
    
    <view class="stats-section">
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
          <text class="stat-value">{{ statistics.monthlyLessonsConsumed }}</text>
          <text class="stat-label">本月应上课时</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ statistics.monthlyLessonsAttended }}</text>
          <text class="stat-label">本月上课时</text>
        </view>
      </view>
    </view>
    </view>
    
    <view class="dialog-mask" v-if="attendDialogVisible" @click="closeAttendDialog">
      <view class="dialog-content" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">确认上课</text>
          <text class="dialog-close" @click="closeAttendDialog">×</text>
        </view>
        <view class="dialog-body">
          <view class="attend-info">
            <text class="attend-student">{{ currentCourse?.studentId?.name || '未分配' }}</text>
            <text class="attend-course">{{ currentCourse?.courseTypeId?.name || '未设置' }}</text>
            <text class="attend-time">{{ formatTime(currentCourse?.startTime) }}</text>
          </view>
          <view class="form-item">
            <text class="form-label">记录课时</text>
            <picker :value="lessonCountIndex" :range="lessonCountOptions" @change="onLessonCountChange">
              <view class="form-picker">
                <text>{{ lessonCountOptions[lessonCountIndex] }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">课后内容</text>
            <textarea
              class="content-input"
              v-model="lessonContent"
              maxlength="500"
              placeholder="记录本节课内容、作业或注意事项"
            />
          </view>
          <view class="form-item">
            <view class="form-label-row">
              <text class="form-label">课堂照片</text>
              <text class="form-hint">{{ photoFiles.length }}/6</text>
            </view>
            <view class="photo-grid">
              <view class="photo-item" v-for="(photo, photoIndex) in photoFiles" :key="photo.tempFilePath || photo.path">
                <image class="photo-preview" :src="photo.tempFilePath || photo.path" mode="aspectFill" @click="previewPhoto(photoIndex)"></image>
                <text class="photo-remove" @click.stop="removePhoto(photoIndex)">×</text>
              </view>
              <view v-if="photoFiles.length < 6" class="photo-add" @click="choosePhotos">
                <text class="photo-add-icon">+</text>
                <text class="photo-add-text">添加</text>
              </view>
            </view>
          </view>
          <view class="form-item">
            <view class="form-label-row">
              <text class="form-label">语音记录</text>
              <text class="form-hint">{{ voiceFiles.length }}/6</text>
            </view>
            <view class="voice-box">
              <button v-if="!recording" class="voice-btn" @click="startRecord">
                {{ voiceFiles.length ? '继续录音' : '开始录音' }}
              </button>
              <button v-else class="voice-btn recording" @click="stopRecord">
                停止录音 {{ formatDuration(recordDuration) }}
              </button>
              <view v-for="(voice, voiceIndex) in voiceFiles" :key="voice.tempFilePath" class="voice-result">
                <text class="voice-info" @click="playVoice(voice.tempFilePath)">{{ isVoicePlaying(voice.tempFilePath) ? '暂停语音' : '播放语音' }}{{ voiceIndex + 1 }} {{ formatDuration(voice.duration || 0) }}</text>
                <text class="voice-remove" @click="removeVoice(voiceIndex)">删除</text>
              </view>
            </view>
          </view>
          <view class="form-item notify-row">
            <view>
              <text class="form-label">立即通知学生端</text>
              <text class="notify-tip">订阅消息只提醒查看，完整内容在学生端记录页</text>
            </view>
            <switch :checked="notifyGuardian" @change="notifyGuardian = $event.detail.value" :color="themeColors.primary" />
          </view>
          <view class="reward-form">
            <view class="form-item notify-row">
              <view>
                <text class="form-label">上课奖励</text>
                <text class="notify-tip">按课时倍数发放，基础为5星/5积分</text>
              </view>
              <switch :checked="issueLessonReward" @change="issueLessonReward = $event.detail.value" :color="themeColors.primary" />
            </view>
            <view class="form-item">
              <text class="form-label">本周练习星</text>
              <picker :value="practiceRewardIndex" :range="practiceRewardOptions" @change="onPracticeRewardChange">
                <view class="form-picker">
                  <text>{{ practiceRewardOptions[practiceRewardIndex] }}</text>
                  <text class="picker-arrow">▼</text>
                </view>
              </picker>
            </view>
            <text class="reward-summary-tip">
              练习星每周上限35星
            </text>
          </view>
        </view>
        <view class="dialog-footer">
          <button class="btn-cancel" :disabled="savingAttend" @click="closeAttendDialog">取消</button>
          <button class="btn-confirm" :loading="savingAttend" :disabled="savingAttend" @click="confirmAttend">确认上课</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { get, post, put, del, uploadFile, uploadFileData } from '@/utils/request'
import { applyTheme, getCurrentTheme, getThemeClass } from '@/utils/theme'
import { createAudioPlayback } from '@/utils/audioPlayback'
import { emitRewardStateChanged } from '@/utils/rewardEvents'

const userStore = useUserStore()

const statistics = ref({
  studentCount: 0,
  totalRevenue: 0,
  totalLessonsSold: 0,
  totalCourses: 0,
  totalLessonsConsumed: 0,
  totalLessonsAttended: 0,
  totalRemainingLessons: 0,
  prepaidLessonsConsumed: 0,
  monthlyPrepaidRevenue: 0,
  monthlyActualRevenue: 0,
  monthlyLessonsConsumed: 0,
  monthlyLessonsAttended: 0
})

const todayCourses = ref([])
const selectedDate = ref(new Date())
const dayNames = ['日', '一', '二', '三', '四', '五', '六']
const attendDialogVisible = ref(false)
const currentCourse = ref(null)
const lessonCountIndex = ref(1)
const lessonContent = ref('')
const photoFiles = ref([])
const voiceFiles = ref([])
const notifyGuardian = ref(false)
const issueLessonReward = ref(true)
const practiceRewardIndex = ref(0)
const savingAttend = ref(false)
const recording = ref(false)
const recordDuration = ref(0)
const playingVoiceKey = ref('')
const themeClass = ref(getThemeClass())
const themeColors = ref(getCurrentTheme())
let recorderManager = null
let recordTimer = null
const audioPlayer = createAudioPlayback({
  onStateChange: ({ key, playing }) => {
    playingVoiceKey.value = playing ? key : ''
  },
  onError: () => {
    uni.showToast({ title: '播放失败', icon: 'none' })
  }
})

const lessonCountOptions = ['0.5节', '1节', '1.5节', '2节', '2.5节', '3节', '3.5节', '4节', '4.5节', '5节']
const lessonCountValues = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
const practiceRewardOptions = Array.from({ length: 36 }, (_, index) => `${index}星`)
const practiceRewardValues = Array.from({ length: 36 }, (_, index) => index)
const DEFAULT_PLANNED_LESSONS = 1

const getCoursePlannedLessons = (course) => {
  const plannedLessons = Number(course?.plannedLessons)
  if (!Number.isFinite(plannedLessons) || plannedLessons <= 0) {
    return DEFAULT_PLANNED_LESSONS
  }

  return Math.round((plannedLessons + Number.EPSILON) * 100) / 100
}

const getLessonCountIndexByValue = (value) => {
  const targetValue = getCoursePlannedLessons({ plannedLessons: value })
  let closestIndex = 0
  let minDiff = Number.POSITIVE_INFINITY

  lessonCountValues.forEach((option, index) => {
    const diff = Math.abs(option - targetValue)
    if (diff < minDiff) {
      minDiff = diff
      closestIndex = index
    }
  })

  return closestIndex
}

const formatLessonCount = (value) => {
  const numericValue = Number(value) || 0
  if (Number.isInteger(numericValue)) {
    return numericValue.toString()
  }

  return numericValue.toFixed(2).replace(/\.?0+$/, '')
}

const formatCourseLessonCount = (course) => {
  return `${formatLessonCount(getCoursePlannedLessons(course))}节课`
}

const formatCourseSectionLessonCount = (courses = []) => {
  const totalLessons = courses.reduce((total, course) => total + getCoursePlannedLessons(course), 0)
  return formatLessonCount(Math.round((totalLessons + Number.EPSILON) * 100) / 100)
}

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 17) return '下午好'
  if (hour < 19) return '傍晚好'
  return '晚上好'
})

const currentDate = computed(() => {
  const now = new Date()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${now.getMonth() + 1}月${now.getDate()}日 ${weekDays[now.getDay()]}`
})

const isToday = computed(() => {
  const today = new Date()
  return selectedDate.value.getFullYear() === today.getFullYear() &&
         selectedDate.value.getMonth() === today.getMonth() &&
         selectedDate.value.getDate() === today.getDate()
})

const courseDateText = computed(() => {
  const d = selectedDate.value
  if (isToday.value) {
    return '今日课程'
  }
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`
})

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const formatStudentName = (name) => {
  if (!name) return '未分配'
  return name.replace(/（/g, '(').replace(/）/g, ')')
}

const getStatusText = (status) => {
  const statusMap = {
    'normal': '待上课',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[status] || '待上课'
}

const getMediaSummary = (record) => {
  const mediaItems = record?.mediaItems || []
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

const resetAttendForm = (plannedLessons = DEFAULT_PLANNED_LESSONS) => {
  audioPlayer.stop()
  lessonCountIndex.value = getLessonCountIndexByValue(plannedLessons)
  lessonContent.value = ''
  photoFiles.value = []
  voiceFiles.value = []
  notifyGuardian.value = false
  issueLessonReward.value = true
  practiceRewardIndex.value = 0
  recording.value = false
  recordDuration.value = 0
  clearRecordTimer()
}

const closeAttendDialog = () => {
  if (savingAttend.value) return
  if (recording.value) {
    stopRecord()
  }
  attendDialogVisible.value = false
}

const clearRecordTimer = () => {
  if (recordTimer) {
    clearInterval(recordTimer)
    recordTimer = null
  }
}

const formatDuration = (duration = 0) => {
  const totalSeconds = Math.max(0, Math.round(duration / 1000))
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

const prevDay = () => {
  const newDate = new Date(selectedDate.value)
  newDate.setDate(newDate.getDate() - 1)
  selectedDate.value = newDate
  fetchDayCourses()
}

const nextDay = () => {
  const newDate = new Date(selectedDate.value)
  newDate.setDate(newDate.getDate() + 1)
  selectedDate.value = newDate
  fetchDayCourses()
}

const goToday = () => {
  selectedDate.value = new Date()
  fetchDayCourses()
}

const fetchDayCourses = async () => {
  try {
    const d = selectedDate.value
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
    const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
    
    const res = await get('/courses', {
      startTime: startOfDay.toISOString(),
      endTime: endOfDay.toISOString()
    })
    
    todayCourses.value = res.data || []
  } catch (error) {
    console.error('获取课程失败', error)
  }
}

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

const canManageCourse = (course) => course?.canManageCourse !== false

const getCourseRoleText = (course) => {
  if (canManageCourse(course)) {
    return course?.courseRelationType === 'practice' ? '我的陪练课' : '我的课'
  }

  if (course?.courseRelationType === 'owner') {
    return '陪练老师上课'
  }
  if (course?.courseRelationType === 'practice') {
    return '任课老师上课'
  }
  return '互通课程'
}

const getCourseRoleClass = (course) => {
  if (canManageCourse(course)) {
    return course?.courseRelationType === 'practice' ? 'course-role-my-practice' : 'course-role-mine'
  }

  if (course?.courseRelationType === 'owner') {
    return 'course-role-practice'
  }
  if (course?.courseRelationType === 'practice') {
    return 'course-role-owner'
  }
  return 'course-role-shared'
}

const getSharedCoursesTitle = (items = []) => {
  if (items.length === 0) return '互通课程'

  const hasPracticeTeacherCourses = items.some(course => course?.courseRelationType === 'owner')
  const hasOwnerTeacherCourses = items.some(course => course?.courseRelationType === 'practice')

  if (hasPracticeTeacherCourses && !hasOwnerTeacherCourses) return '陪练课程'
  if (hasOwnerTeacherCourses && !hasPracticeTeacherCourses) return '任课老师课程'
  return '互通课程'
}

const todayCourseSections = computed(() => {
  const myCourses = todayCourses.value.filter(course => canManageCourse(course))
  const sharedCourses = todayCourses.value.filter(course => !canManageCourse(course))

  return [
    { key: 'mine', title: '我的课程', items: myCourses },
    { key: 'shared', title: getSharedCoursesTitle(sharedCourses), items: sharedCourses }
  ].filter(section => section.items.length > 0)
})

const shouldShowCourseTeacher = (course) => {
  return Boolean(getCourseTeacherText(course))
}

const getCourseTeacherText = (course) => {
  const teacherName = course?.teacherId?.name || course?.teacherId?.username
  if (!teacherName || canManageCourse(course)) return ''

  if (course?.courseRelationType === 'owner') {
    return `陪练老师：${teacherName}`
  }
  if (course?.courseRelationType === 'practice') {
    return `任课老师：${teacherName}`
  }
  return `老师：${teacherName}`
}

const handleAttendCourse = async (course) => {
  if (!canManageCourse(course)) {
    uni.showToast({ title: '只能查看该课程', icon: 'none' })
    return
  }

  resetAttendForm(getCoursePlannedLessons(course))

  if (!course.courseTypeId?._id && !course.courseTypeId) {
    uni.showModal({
      title: '提示',
      content: '该课程未设置课程类型，上课后无法记录收入。是否继续上课？',
      success: async (res) => {
        if (res.confirm) {
          currentCourse.value = course
          attendDialogVisible.value = true
        }
      }
    })
    return
  }
  
  currentCourse.value = course
  attendDialogVisible.value = true
}

const onLessonCountChange = (e) => {
  lessonCountIndex.value = e.detail.value
}

const onPracticeRewardChange = (e) => {
  practiceRewardIndex.value = Number(e.detail.value) || 0
}

const choosePhotos = async () => {
  const remainCount = 6 - photoFiles.value.length
  if (remainCount <= 0) return

  try {
    const result = uni.chooseMedia ? await new Promise((resolve, reject) => {
      uni.chooseMedia({
        count: remainCount,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        success: resolve,
        fail: reject
      })
    }) : await new Promise((resolve, reject) => {
      uni.chooseImage({
        count: remainCount,
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        success: resolve,
        fail: reject
      })
    })

    const sourceFiles = result.tempFiles || (result.tempFilePaths || []).map(path => ({ path }))
    const files = sourceFiles.map(file => ({
      tempFilePath: file.tempFilePath || file.path,
      size: file.size || 0
    })).filter(file => file.tempFilePath)

    photoFiles.value = [...photoFiles.value, ...files].slice(0, 6)
  } catch (error) {
    if (error?.errMsg?.includes('cancel')) return
    uni.showToast({ title: '选择照片失败', icon: 'none' })
  }
}

const previewPhoto = (index) => {
  const urls = photoFiles.value.map(photo => photo.tempFilePath || photo.path).filter(Boolean)
  if (urls.length === 0) return

  uni.previewImage({
    urls,
    current: urls[index]
  })
}

const removePhoto = (index) => {
  photoFiles.value.splice(index, 1)
}

const startRecord = () => {
  if (!recorderManager) {
    uni.showToast({ title: '当前环境不支持录音', icon: 'none' })
    return
  }
  if (voiceFiles.value.length >= 6) {
    uni.showToast({ title: '最多录制6段语音', icon: 'none' })
    return
  }

  audioPlayer.stop()
  recordDuration.value = 0
  recording.value = true
  clearRecordTimer()
  recordTimer = setInterval(() => {
    recordDuration.value += 1000
  }, 1000)

  try {
    recorderManager.start({
      duration: 10 * 60 * 1000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3'
    })
  } catch (error) {
    recording.value = false
    clearRecordTimer()
    uni.showToast({ title: '录音启动失败', icon: 'none' })
  }
}

const stopRecord = () => {
  if (!recorderManager || !recording.value) return

  recorderManager.stop()
  clearRecordTimer()
}

const playVoice = (src) => {
  if (!src) return

  audioPlayer.playOrPause(src)
}

const isVoicePlaying = (src) => {
  return Boolean(src && playingVoiceKey.value === src)
}

const removeVoice = (index) => {
  const voice = voiceFiles.value[index]
  if (voice?.tempFilePath) {
    audioPlayer.stop(voice.tempFilePath)
  }
  voiceFiles.value.splice(index, 1)
}

const uploadAttendMedia = async () => {
  const mediaItems = []

  for (const photo of photoFiles.value) {
    try {
      const formData = {
        mediaType: 'image'
      }
      let result
      try {
        result = await uploadFile('/lesson-records/media', photo.tempFilePath, formData)
      } catch (uploadError) {
        console.warn('照片uploadFile失败，尝试base64降级上传:', uploadError?.message || uploadError)
        result = await uploadFileData('/lesson-records/media-data', photo.tempFilePath, formData)
      }
      if (result.data) {
        mediaItems.push(result.data)
      }
    } catch (error) {
      throw new Error(`照片上传失败：${error.message || '请检查网络'}`)
    }
  }

  for (const voiceFile of voiceFiles.value) {
    if (!voiceFile?.tempFilePath) continue

    try {
      const formData = {
        mediaType: 'audio',
        duration: voiceFile.duration || 0
      }
      let result
      try {
        result = await uploadFile('/lesson-records/media', voiceFile.tempFilePath, formData)
      } catch (uploadError) {
        console.warn('语音uploadFile失败，尝试base64降级上传:', uploadError?.message || uploadError)
        result = await uploadFileData('/lesson-records/media-data', voiceFile.tempFilePath, formData)
      }
      if (result.data) {
        mediaItems.push(result.data)
      }
    } catch (error) {
      throw new Error(`语音上传失败：${error.message || '请检查网络'}`)
    }
  }

  return mediaItems
}

const confirmAttend = async () => {
  if (!currentCourse.value || savingAttend.value) return
  
  if (recording.value) {
    uni.showToast({ title: '请先停止录音', icon: 'none' })
    return
  }

  savingAttend.value = true
  const success = await doAttendCourse(currentCourse.value, lessonCountValues[lessonCountIndex.value])
  savingAttend.value = false

  if (success) {
    attendDialogVisible.value = false
  }
}

const doAttendCourse = async (course, lessonsConsumed = 1) => {
  try {
    const studentId = course.studentId?._id || course.studentId
    if (!studentId) {
      uni.showToast({ title: '课程缺少学生信息', icon: 'none' })
      return false
    }

    const courseTypeId = course.courseTypeId?._id || course.courseTypeId
    const mediaItems = await uploadAttendMedia()
    const result = await post('/lesson-records', {
      studentId: studentId,
      courseId: course._id,
      courseTypeId: courseTypeId,
      courseStartTime: course.startTime,
      lessonsConsumed: lessonsConsumed,
      lessonContent: lessonContent.value.trim(),
      mediaItems,
      isDeducted: true,
      notes: '从首页直接上课',
      notifyGuardian: notifyGuardian.value
    })
    const rewardText = await settleLessonReward(result.data)
    emitRewardStateChanged({ source: 'index-attend', studentId })
    const notifyResult = result.notifyResult
    const notifyText = notifyGuardian.value && notifyResult
      ? `，通知${notifyResult.success || 0}/${notifyResult.total || 0}`
      : ''
    uni.showToast({ title: `上课成功${rewardText}${notifyText}`, icon: 'success' })
    await fetchDayCourses()
    await fetchStatistics()
    return true
  } catch (error) {
    uni.showToast({ title: error.message || '上课失败', icon: 'none' })
    return false
  }
}

const settleLessonReward = async (lessonRecord) => {
  if (!lessonRecord?._id) {
    return ''
  }

  try {
    const res = await post(`/lesson-records/${lessonRecord._id}/reward-settlements`, {
      issueLessonReward: issueLessonReward.value,
      practiceRewardValue: practiceRewardValues[practiceRewardIndex.value] || 0,
      remark: '首页确认上课后结算'
    })
    const settlement = res.data?.settlement || {}
    const totalPoints = Number(settlement.totalPoints) || 0
    return totalPoints > 0 ? `，奖励${totalPoints}分` : ''
  } catch (error) {
    console.error('奖励结算失败', error)
    return '，积分未结算'
  }
}

const handleCancelAttendCourse = async (course) => {
  if (!canManageCourse(course)) {
    uni.showToast({ title: '只能查看该课程', icon: 'none' })
    return
  }

  uni.showModal({
    title: '提示',
    content: '确定要取消上课吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const lessonRecords = await get('/lesson-records', {
            courseId: course._id
          })
          
          if (lessonRecords.data && lessonRecords.data.length > 0) {
            const courseIdStr = course._id.toString ? course._id.toString() : course._id
            const record = lessonRecords.data.find(r => {
              const rCourseId = r.courseId?._id ? r.courseId._id : r.courseId
              return (rCourseId?.toString ? rCourseId.toString() : rCourseId) === courseIdStr
            }) || lessonRecords.data[0]
            
            await del(`/lesson-records/${record._id}`)
          }
          
          await put(`/courses/${course._id}`, { status: 'normal' })
          emitRewardStateChanged({ source: 'index-cancel-attend', studentId: course.studentId?._id || course.studentId })
          
          uni.showToast({ title: '取消上课成功', icon: 'success' })
          await fetchDayCourses()
          await fetchStatistics()
        } catch (error) {
          uni.showToast({ title: error.message || '取消上课失败', icon: 'none' })
        }
      }
    }
  })
}

const goToSchedule = () => {
  uni.switchTab({
    url: '/pages/schedule/schedule'
  })
}

const goToCourseDetail = (course) => {
  uni.navigateTo({
    url: `/pages/schedule/detail?id=${course._id}`
  })
}

const goEditLessonRecord = (record, course) => {
  if (!record?._id) return

  uni.navigateTo({
    url: `/pages/lessons/edit?id=${record._id}`
  })
}

const goToPage = (url) => {
  if (url.includes('students') || url.includes('schedule')) {
    uni.switchTab({ url })
  } else {
    uni.navigateTo({ url })
  }
}

const refreshTheme = () => {
  themeClass.value = getThemeClass()
  themeColors.value = applyTheme()
}

onMounted(() => {
  refreshTheme()

  if (uni.getRecorderManager) {
    recorderManager = uni.getRecorderManager()
    recorderManager.onStop((res) => {
      recording.value = false
      clearRecordTimer()
      if (voiceFiles.value.length >= 6) return
      voiceFiles.value = [...voiceFiles.value, {
        tempFilePath: res.tempFilePath,
        duration: res.duration || recordDuration.value,
        size: res.fileSize || 0
      }]
    })
    recorderManager.onError((error) => {
      recording.value = false
      clearRecordTimer()
      uni.showToast({ title: error.errMsg || '录音失败', icon: 'none' })
    })
  }

  fetchDayCourses()
  fetchStatistics()
})

onShow(() => {
  refreshTheme()
  fetchDayCourses()
  fetchStatistics()
})

onUnmounted(() => {
  clearRecordTimer()
  audioPlayer.stop()
})
</script>

<style scoped>
.index-container {
  padding: 20rpx;
  background: var(--theme-home-bg);
  min-height: 100vh;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--theme-header-padding);
  margin-bottom: 16rpx;
  border-radius: var(--theme-header-radius);
  background: var(--theme-header-bg);
  box-shadow: var(--theme-header-shadow);
}

.header-left {
  flex: 1;
}

.greeting {
  font-size: 28rpx;
  color: var(--theme-text);
}

.header-right {
  text-align: right;
}

.date {
  font-size: 24rpx;
  color: var(--theme-muted);
}

.quick-actions {
  background-color: var(--theme-card);
  border-radius: var(--theme-card-radius);
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: var(--theme-card-shadow);
  border: var(--theme-card-border);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx;
}

.action-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  margin-bottom: 8rpx;
}

.student-icon {
  background-color: var(--theme-primary-soft);
}

.schedule-icon {
  background-color: var(--theme-warning-soft);
}

.lesson-icon {
  background-color: var(--theme-success-soft);
}

.payment-icon {
  background-color: var(--theme-danger-soft);
}

.balance-icon {
  background-color: var(--theme-accent-soft);
}

.reward-icon {
  background-color: var(--theme-primary-soft);
}

.action-text {
  font-size: 22rpx;
  color: var(--theme-muted);
}

.schedule-section {
  background-color: var(--theme-card);
  border-radius: var(--theme-card-radius);
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: var(--theme-card-shadow);
  border: var(--theme-card-border);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.date-nav {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.nav-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--theme-bg-soft);
  border-radius: 50%;
}

.nav-btn text {
  font-size: 28rpx;
  color: var(--theme-primary);
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: var(--theme-text);
}

.section-more {
  font-size: 24rpx;
  color: var(--theme-primary);
}

.header-right-btns {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.back-today-btn {
  font-size: 24rpx;
  color: var(--theme-success);
  font-weight: bold;
  padding: 8rpx 16rpx;
  background-color: var(--theme-success-soft);
  border-radius: 8rpx;
}

.empty-tip {
  text-align: center;
  padding: 32rpx 0;
  color: var(--theme-muted);
  font-size: 26rpx;
}

.course-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.course-section {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.course-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4rpx;
}

.course-section-title {
  font-size: 26rpx;
  font-weight: bold;
  color: var(--theme-text);
}

.course-section-count {
  font-size: 22rpx;
  color: var(--theme-muted);
}

.course-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: var(--theme-bg-soft);
  border-radius: 14rpx;
  border-left: 6rpx solid var(--theme-primary);
}

.course-item:active {
  background-color: var(--theme-primary-soft);
}

.course-item.course-completed {
  opacity: 0.6;
  border-left-color: var(--theme-success);
}

.course-item.course-role-practice,
.course-item.course-role-owner,
.course-item.course-role-shared {
  border-left-color: var(--theme-warning);
}

.course-index {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: var(--theme-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.course-index text {
  font-size: 22rpx;
  color: #FFFDF8;
  font-weight: bold;
}

.course-time {
  width: 90rpx;
}

.time {
  font-size: 26rpx;
  font-weight: bold;
  color: var(--theme-text);
}

.course-info {
  flex: 1;
  padding: 0 16rpx;
}

.student-name {
  display: block;
  font-size: 28rpx;
  color: var(--theme-text);
  margin-bottom: 4rpx;
}

.course-type {
  font-size: 22rpx;
  color: var(--theme-muted);
}

.course-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
}

.course-lesson-count {
  display: inline-flex;
  align-items: center;
  min-height: 30rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  box-sizing: border-box;
  font-size: 19rpx;
  line-height: 30rpx;
  white-space: nowrap;
  color: #6f6254;
  background: rgba(111, 98, 84, 0.12);
}

.course-role-tag {
  display: inline-flex;
  align-items: center;
  min-height: 30rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  box-sizing: border-box;
  font-size: 19rpx;
  line-height: 30rpx;
  white-space: nowrap;
}

.course-role-tag.course-role-mine,
.course-role-tag.course-role-my-practice {
  color: var(--theme-primary);
  background-color: var(--theme-primary-soft);
}

.course-role-tag.course-role-practice,
.course-role-tag.course-role-owner,
.course-role-tag.course-role-shared {
  color: var(--theme-warning);
  background-color: var(--theme-warning-soft);
}

.lesson-record-preview {
  margin-top: 8rpx;
  padding: 10rpx 12rpx;
  border-radius: 8rpx;
  background-color: var(--theme-primary-soft);
}

.lesson-record-text,
.lesson-record-media {
  display: block;
  font-size: 22rpx;
  line-height: 32rpx;
}

.lesson-record-text {
  color: var(--theme-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lesson-record-media {
  margin-top: 2rpx;
  color: var(--theme-primary);
}

.course-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.status-tag {
  display: inline-block;
  padding: 6rpx 12rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
}

.status-normal {
  background-color: var(--theme-primary-soft);
  color: var(--theme-primary);
}

.status-completed {
  background-color: var(--theme-success-soft);
  color: var(--theme-success);
}

.status-cancelled {
  background-color: var(--theme-danger-soft);
  color: var(--theme-danger);
}

.btn-attend {
  padding: 10rpx 20rpx;
  background-color: var(--theme-primary);
  color: #FFFDF8;
  font-size: 22rpx;
  border: none;
  border-radius: 6rpx;
  line-height: 1.2;
}

.btn-cancel-attend {
  padding: 10rpx 20rpx;
  background-color: var(--theme-card);
  color: var(--theme-danger);
  font-size: 22rpx;
  border: 2rpx solid var(--theme-danger);
  border-radius: 6rpx;
  line-height: 1.2;
}

.btn-edit-record {
  padding: 10rpx 20rpx;
  background-color: var(--theme-primary-soft);
  color: var(--theme-primary);
  font-size: 22rpx;
  border: 2rpx solid var(--theme-primary);
  border-radius: 6rpx;
  line-height: 1.2;
}

.arrow-icon {
  font-size: 32rpx;
  color: var(--theme-border);
  margin-left: 8rpx;
}

.stats-section {
  background-color: var(--theme-card);
  border-radius: var(--theme-card-radius);
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: var(--theme-card-shadow);
  border: var(--theme-card-border);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.stat-card {
  background-color: var(--theme-bg-soft);
  border-radius: 14rpx;
  padding: 20rpx;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: var(--theme-primary);
  margin-bottom: 6rpx;
}

.stat-value.revenue {
  color: var(--theme-warning);
}

.stat-value.warning {
  color: var(--theme-warning);
}

.stat-value.success {
  color: var(--theme-success);
}

.stat-label {
  font-size: 22rpx;
  color: var(--theme-muted);
}

.dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.dialog-content {
  width: 85%;
  max-width: 600rpx;
  max-height: 90vh;
  background-color: var(--theme-card);
  border-radius: 20rpx;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid var(--theme-border);
}

.dialog-title {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--theme-text);
}

.dialog-close {
  font-size: 40rpx;
  color: var(--theme-muted);
}

.dialog-body {
  padding: 30rpx;
  max-height: 62vh;
  overflow-y: auto;
}

.attend-info {
  text-align: center;
  margin-bottom: 30rpx;
  padding: 20rpx;
  background-color: var(--theme-bg-soft);
  border-radius: 12rpx;
}

.attend-student {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: var(--theme-text);
  margin-bottom: 8rpx;
}

.attend-course {
  display: block;
  font-size: 26rpx;
  color: var(--theme-muted);
  margin-bottom: 4rpx;
}

.attend-time {
  display: block;
  font-size: 24rpx;
  color: var(--theme-muted);
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: var(--theme-text);
  margin-bottom: 12rpx;
}

.form-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.form-label-row .form-label {
  margin-bottom: 0;
}

.form-hint {
  font-size: 22rpx;
  color: var(--theme-muted);
}

.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 80rpx;
  padding: 0 20rpx;
  border: 2rpx solid var(--theme-border);
  border-radius: 8rpx;
  font-size: 28rpx;
}

.picker-arrow {
  font-size: 20rpx;
  color: var(--theme-muted);
}

.content-input {
  width: 100%;
  min-height: 160rpx;
  padding: 18rpx;
  box-sizing: border-box;
  border: 2rpx solid var(--theme-border);
  border-radius: 8rpx;
  font-size: 26rpx;
  line-height: 38rpx;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
}

.photo-item,
.photo-add {
  position: relative;
  height: 140rpx;
  border-radius: 10rpx;
  overflow: hidden;
  background-color: var(--theme-bg-soft);
}

.photo-preview {
  width: 100%;
  height: 100%;
}

.photo-remove {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 34rpx;
  height: 34rpx;
  line-height: 34rpx;
  text-align: center;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.55);
  color: #FFFDF8;
  font-size: 28rpx;
}

.photo-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed var(--theme-border);
}

.photo-add-icon {
  font-size: 42rpx;
  line-height: 42rpx;
  color: var(--theme-muted);
}

.photo-add-text {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--theme-muted);
}

.voice-box {
  padding: 18rpx;
  border: 2rpx solid var(--theme-border);
  border-radius: 8rpx;
}

.voice-btn {
  height: 68rpx;
  line-height: 68rpx;
  margin: 0;
  padding: 0 24rpx;
  border-radius: 8rpx;
  background-color: var(--theme-primary-soft);
  color: var(--theme-primary);
  font-size: 26rpx;
}

.voice-btn.recording {
  background-color: var(--theme-danger-soft);
  color: var(--theme-danger);
}

.voice-result {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.voice-info {
  font-size: 26rpx;
  color: var(--theme-primary);
}

.voice-remove {
  font-size: 24rpx;
  color: var(--theme-danger);
}

.notify-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.notify-row .form-label {
  margin-bottom: 6rpx;
}

.notify-tip {
  display: block;
  font-size: 22rpx;
  line-height: 32rpx;
  color: var(--theme-muted);
}

.reward-form {
  margin-top: 24rpx;
  padding: 20rpx;
  border: 2rpx solid var(--theme-border);
  border-radius: 12rpx;
  background-color: var(--theme-bg-soft);
}

.reward-summary-tip {
  display: block;
  font-size: 22rpx;
  line-height: 32rpx;
  color: var(--theme-muted);
}

.dialog-footer {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx 30rpx;
  border-top: 1rpx solid var(--theme-border);
}

.btn-cancel {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: var(--theme-card);
  color: var(--theme-muted);
  border: 2rpx solid var(--theme-border);
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-confirm {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: var(--theme-primary);
  color: #FFFDF8;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.index-container {
  position: relative;
  min-height: 100vh;
  padding: 0;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 50% 16%, rgba(236, 214, 175, 0.52) 0, rgba(236, 214, 175, 0) 42%),
    linear-gradient(180deg, #f7efe3 0%, #efe3d1 100%);
  color: #3f352b;
}

.paper-grain {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.5;
  background-image:
    repeating-linear-gradient(0deg, rgba(104, 87, 70, 0.05) 0, rgba(104, 87, 70, 0.05) 1rpx, transparent 1rpx, transparent 12rpx),
    repeating-linear-gradient(90deg, rgba(104, 87, 70, 0.04) 0, rgba(104, 87, 70, 0.04) 1rpx, transparent 1rpx, transparent 14rpx);
  pointer-events: none;
}

.side-label {
  position: absolute;
  left: 20rpx;
  top: 88rpx;
  bottom: 88rpx;
  width: 34rpx;
  border-left: 2rpx dashed rgba(85, 71, 58, 0.42);
  z-index: 1;
}

.side-label text {
  position: absolute;
  left: -12rpx;
  top: 260rpx;
  width: 280rpx;
  transform: rotate(90deg);
  transform-origin: left top;
  font-size: 20rpx;
  color: rgba(63, 53, 43, 0.62);
}

.home-content {
  position: relative;
  z-index: 2;
  padding: 54rpx 34rpx 48rpx 70rpx;
  box-sizing: border-box;
}

.header-section {
  position: relative;
  min-height: 228rpx;
  align-items: stretch;
  padding: 34rpx 30rpx;
  margin-bottom: 30rpx;
  border-radius: 34rpx 34rpx 26rpx 26rpx;
  background:
    linear-gradient(180deg, rgba(224, 214, 191, 0.94) 0%, rgba(212, 202, 178, 0.88) 100%);
  border: 4rpx solid rgba(118, 95, 75, 0.72);
  box-shadow: 14rpx 18rpx 0 rgba(118, 95, 75, 0.14);
  overflow: hidden;
  box-sizing: border-box;
}

.header-section::after {
  content: "";
  position: absolute;
  left: 58rpx;
  right: 54rpx;
  bottom: 22rpx;
  height: 72rpx;
  border: 5rpx solid rgba(255, 249, 234, 0.52);
  border-top-color: transparent;
  border-radius: 50%;
  transform: rotate(-8deg);
}

.header-left {
  position: relative;
  z-index: 2;
  flex: 1;
  min-width: 0;
  padding-right: 18rpx;
}

.header-kicker,
.greeting,
.date {
  display: block;
}

.header-kicker {
  margin-bottom: 18rpx;
  font-size: 20rpx;
  color: rgba(63, 53, 43, 0.5);
  font-family: Georgia, serif;
}

.greeting {
  font-size: 38rpx;
  line-height: 48rpx;
  font-weight: 700;
  color: #3e3328;
}

.date {
  margin-top: 18rpx;
  font-size: 24rpx;
  color: rgba(63, 53, 43, 0.68);
}

.header-art {
  position: relative;
  z-index: 2;
  width: 214rpx;
  min-height: 172rpx;
  flex-shrink: 0;
}

.mini-staff {
  position: absolute;
  left: 6rpx;
  right: 0;
  height: 3rpx;
  background: rgba(77, 68, 53, 0.18);
}

.staff-a {
  top: 38rpx;
}

.staff-b {
  top: 64rpx;
}

.staff-c {
  top: 90rpx;
}

.header-piano {
  position: absolute;
  left: -6rpx;
  top: 8rpx;
  width: 218rpx;
  opacity: 0.9;
  transform: rotate(-2deg);
}

.quick-actions {
  margin: 0 0 28rpx;
  padding: 24rpx 8rpx 18rpx;
  border-top: 3rpx dashed rgba(85, 71, 58, 0.34);
  border-bottom: 3rpx dashed rgba(85, 71, 58, 0.34);
  border-radius: 0;
  border-left: none;
  border-right: none;
  background: transparent;
  box-shadow: none;
}

.action-grid {
  gap: 12rpx;
}

.action-item {
  min-height: 132rpx;
  padding: 14rpx 8rpx;
  border: 3rpx solid rgba(85, 68, 53, 0.2);
  border-radius: 24rpx;
  background: rgba(255, 248, 235, 0.64);
  box-shadow: 8rpx 9rpx 0 rgba(112, 95, 66, 0.08);
  box-sizing: border-box;
}

.action-item:active {
  transform: translateY(2rpx);
  box-shadow: 5rpx 6rpx 0 rgba(112, 95, 66, 0.08);
}

.action-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  margin-bottom: 10rpx;
  border: 3rpx solid rgba(85, 68, 53, 0.26);
  background: rgba(255, 253, 244, 0.78);
  font-size: 34rpx;
  box-sizing: border-box;
}

.student-icon {
  background-color: rgba(95, 114, 76, 0.18);
}

.schedule-icon {
  background-color: rgba(217, 155, 82, 0.2);
}

.payment-icon {
  background-color: rgba(160, 82, 62, 0.14);
}

.balance-icon {
  background-color: rgba(118, 95, 75, 0.16);
}

.reward-icon {
  background-color: rgba(95, 114, 76, 0.18);
}

.action-text {
  max-width: 100%;
  font-size: 22rpx;
  line-height: 28rpx;
  color: rgba(63, 53, 43, 0.72);
  text-align: center;
}

.schedule-section,
.stats-section {
  position: relative;
  padding: 28rpx 26rpx;
  margin-bottom: 28rpx;
  border: 4rpx solid rgba(85, 68, 53, 0.58);
  border-radius: 30rpx;
  background: rgba(255, 248, 235, 0.86);
  box-shadow: 14rpx 14rpx 0 rgba(112, 95, 66, 0.12);
  box-sizing: border-box;
}

.schedule-section::before,
.stats-section::before {
  content: "";
  position: absolute;
  right: 34rpx;
  top: -17rpx;
  width: 92rpx;
  height: 34rpx;
  border-radius: 50%;
  background: rgba(217, 155, 82, 0.3);
  transform: rotate(-8deg);
}

.stats-section::before {
  background: rgba(95, 114, 76, 0.22);
}

.section-header {
  margin-bottom: 24rpx;
  gap: 16rpx;
}

.date-nav {
  min-width: 0;
  gap: 12rpx;
}

.nav-btn {
  width: 54rpx;
  height: 54rpx;
  border: 3rpx solid rgba(85, 68, 53, 0.3);
  background: rgba(255, 253, 244, 0.8);
  box-sizing: border-box;
}

.nav-btn text {
  font-size: 34rpx;
  color: #5f724c;
}

.section-title {
  font-size: 32rpx;
  line-height: 42rpx;
  font-weight: 700;
  color: #3f352b;
}

.header-right-btns {
  flex-shrink: 0;
  gap: 12rpx;
}

.section-more,
.back-today-btn {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  line-height: 28rpx;
  font-weight: 600;
}

.section-more {
  color: #5f724c;
  background: rgba(95, 114, 76, 0.14);
}

.back-today-btn {
  color: #a26b39;
  background: rgba(217, 155, 82, 0.16);
}

.empty-tip {
  padding: 46rpx 0;
  border: 3rpx dashed rgba(85, 68, 53, 0.22);
  border-radius: 22rpx;
  color: rgba(63, 53, 43, 0.56);
  background: rgba(255, 253, 244, 0.54);
}

.course-list {
  gap: 16rpx;
}

.course-section {
  gap: 14rpx;
}

.course-section-header {
  padding: 0 2rpx;
}

.course-section-title {
  font-size: 26rpx;
  line-height: 34rpx;
  color: #3f352b;
}

.course-section-count {
  font-size: 22rpx;
  color: rgba(63, 53, 43, 0.52);
}

.course-item {
  align-items: center;
  padding: 18rpx;
  border: 3rpx solid rgba(85, 68, 53, 0.18);
  border-left: 8rpx solid #5f724c;
  border-radius: 22rpx;
  background: rgba(255, 253, 244, 0.78);
  box-shadow: 8rpx 8rpx 0 rgba(112, 95, 66, 0.08);
  box-sizing: border-box;
}

.course-item:active {
  background: rgba(247, 241, 225, 0.92);
}

.course-item.course-completed {
  opacity: 0.72;
  border-left-color: #a26b39;
}

.course-item.course-role-practice,
.course-item.course-role-owner,
.course-item.course-role-shared {
  border-left-color: #a26b39;
}

.course-index {
  width: 42rpx;
  height: 42rpx;
  margin-right: 14rpx;
  background: #5f724c;
  box-shadow: 3rpx 4rpx 0 rgba(95, 114, 76, 0.18);
}

.course-time {
  width: 84rpx;
  flex-shrink: 0;
}

.time {
  font-size: 26rpx;
  color: #3f352b;
}

.course-info {
  min-width: 0;
  padding: 0 12rpx;
}

.student-name {
  font-size: 28rpx;
  line-height: 36rpx;
  font-weight: 700;
  color: #3f352b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-type {
  display: block;
  font-size: 22rpx;
  line-height: 30rpx;
  color: rgba(63, 53, 43, 0.58);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
}

.course-role-tag {
  display: inline-flex;
  align-items: center;
  min-height: 30rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  box-sizing: border-box;
  font-size: 19rpx;
  line-height: 30rpx;
  white-space: nowrap;
}

.course-role-tag.course-role-mine,
.course-role-tag.course-role-my-practice {
  color: #5f724c;
  background: rgba(95, 114, 76, 0.14);
}

.course-role-tag.course-role-practice,
.course-role-tag.course-role-owner,
.course-role-tag.course-role-shared {
  color: #a26b39;
  background: rgba(217, 155, 82, 0.16);
}

.course-teacher {
  display: block;
  font-size: 22rpx;
  line-height: 30rpx;
  color: rgba(63, 53, 43, 0.52);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lesson-record-preview {
  margin-top: 10rpx;
  padding: 10rpx 12rpx;
  border: 2rpx solid rgba(95, 114, 76, 0.18);
  border-radius: 14rpx;
  background: rgba(95, 114, 76, 0.09);
}

.lesson-record-text,
.lesson-record-media {
  font-size: 22rpx;
  line-height: 32rpx;
}

.lesson-record-text {
  color: rgba(63, 53, 43, 0.78);
}

.lesson-record-media {
  color: #5f724c;
}

.course-actions {
  width: 132rpx;
  flex-shrink: 0;
  gap: 8rpx;
}

.status-tag {
  min-width: 88rpx;
  padding: 6rpx 10rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  line-height: 26rpx;
  text-align: center;
  box-sizing: border-box;
}

.status-normal {
  background: rgba(95, 114, 76, 0.14);
  color: #5f724c;
}

.status-completed {
  background: rgba(217, 155, 82, 0.18);
  color: #a26b39;
}

.status-cancelled {
  background: rgba(160, 82, 62, 0.14);
  color: #a0523e;
}

.btn-attend,
.btn-cancel-attend,
.btn-edit-record {
  width: 122rpx;
  min-height: 50rpx;
  padding: 0 10rpx;
  border-radius: 16rpx;
  font-size: 21rpx;
  line-height: 50rpx;
  box-sizing: border-box;
}

.btn-attend {
  background: #5f724c;
  color: #FFFDF8df4;
  box-shadow: 5rpx 6rpx 0 rgba(95, 114, 76, 0.18);
}

.btn-cancel-attend {
  border: 2rpx solid rgba(160, 82, 62, 0.58);
  background: rgba(255, 253, 244, 0.82);
  color: #a0523e;
}

.btn-edit-record {
  border: 2rpx solid rgba(95, 114, 76, 0.44);
  background: rgba(95, 114, 76, 0.12);
  color: #5f724c;
}

.arrow-icon {
  display: none;
}

.stats-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.stat-card {
  min-height: 142rpx;
  padding: 22rpx 14rpx;
  border: 3rpx solid rgba(85, 68, 53, 0.16);
  border-radius: 22rpx;
  background: rgba(255, 253, 244, 0.74);
  min-width: 0;
  box-sizing: border-box;
}

.stat-value {
  max-width: 100%;
  margin-bottom: 8rpx;
  font-size: 34rpx;
  line-height: 42rpx;
  color: #5f724c;
  white-space: normal;
  word-break: break-all;
}

.stat-value.warning {
  color: #a26b39;
}

.stat-value.success {
  color: #5f724c;
}

.stat-label {
  font-size: 22rpx;
  line-height: 30rpx;
  color: rgba(63, 53, 43, 0.62);
}

.dialog-mask {
  background-color: rgba(63, 53, 43, 0.36);
  z-index: 999;
}

.dialog-content {
  width: 88%;
  max-width: 640rpx;
  border: 4rpx solid rgba(85, 68, 53, 0.58);
  border-radius: 30rpx;
  background: rgba(255, 248, 235, 0.98);
  box-shadow: 14rpx 14rpx 0 rgba(63, 53, 43, 0.16);
}

.dialog-header {
  padding: 28rpx 30rpx;
  border-bottom: 3rpx dashed rgba(85, 71, 58, 0.28);
}

.dialog-title {
  color: #3f352b;
}

.dialog-close {
  color: rgba(63, 53, 43, 0.58);
}

.attend-info,
.form-picker,
.content-input,
.voice-box {
  border: 3rpx solid rgba(85, 68, 53, 0.24);
  border-radius: 20rpx;
  background: rgba(255, 253, 244, 0.76);
}

.form-label,
.attend-student {
  color: #3f352b;
}

.attend-course,
.attend-time,
.form-hint,
.notify-tip,
.picker-arrow {
  color: rgba(63, 53, 43, 0.58);
}

.photo-item,
.photo-add {
  border-radius: 16rpx;
  background: rgba(255, 253, 244, 0.76);
}

.photo-add {
  border: 3rpx dashed rgba(85, 68, 53, 0.28);
}

.voice-btn {
  border-radius: 16rpx;
  background: rgba(95, 114, 76, 0.14);
  color: #5f724c;
}

.voice-btn.recording {
  background: rgba(160, 82, 62, 0.14);
  color: #a0523e;
}

.voice-info {
  color: #5f724c;
}

.voice-remove {
  color: #a0523e;
}

.dialog-footer {
  border-top: 3rpx dashed rgba(85, 71, 58, 0.28);
}

.btn-cancel,
.btn-confirm {
  border-radius: 18rpx;
}

.btn-cancel {
  border: 2rpx solid rgba(85, 68, 53, 0.32);
  background: rgba(255, 253, 244, 0.82);
  color: rgba(63, 53, 43, 0.62);
}

.btn-confirm {
  background: #5f724c;
  color: #FFFDF8df4;
}
</style>
