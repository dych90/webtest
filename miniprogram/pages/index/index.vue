<template>
  <view class="index-container">
    <view class="header-section">
      <view class="header-left">
        <text class="greeting">{{ greeting }}，{{ userStore.userInfo?.name || '老师' }}</text>
      </view>
      <view class="header-right">
        <text class="date">{{ currentDate }}</text>
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
          v-for="(course, index) in todayCourses" 
          :key="course._id" 
          class="course-item"
          :class="{ 'course-completed': course.status === 'completed' }"
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
            <text class="course-type">{{ course.courseTypeId?.name || '未设置' }}</text>
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
              v-if="course.status === 'normal'" 
              class="btn-attend" 
              @click.stop="handleAttendCourse(course)"
            >
              上课
            </button>
            <button 
              v-if="course.status === 'completed'" 
              class="btn-cancel-attend" 
              @click.stop="handleCancelAttendCourse(course)"
            >
              取消
            </button>
            <button
              v-if="course.lessonRecord"
              class="btn-edit-record"
              @click.stop="goEditLessonRecord(course.lessonRecord)"
            >
              编辑记录
            </button>
            <text class="arrow-icon">›</text>
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
          <text class="stat-label">本月上课数</text>
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
            <text class="form-label">消课数量</text>
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
                <text class="voice-info" @click="playVoice(voice.tempFilePath)">播放语音{{ voiceIndex + 1 }} {{ formatDuration(voice.duration || 0) }}</text>
                <text class="voice-remove" @click="removeVoice(voiceIndex)">删除</text>
              </view>
            </view>
          </view>
          <view class="form-item notify-row">
            <view>
              <text class="form-label">立即通知学生端</text>
              <text class="notify-tip">订阅消息只提醒查看，完整内容在学生端记录页</text>
            </view>
            <switch :checked="notifyGuardian" @change="notifyGuardian = $event.detail.value" color="#409EFF" />
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
const savingAttend = ref(false)
const recording = ref(false)
const recordDuration = ref(0)
let recorderManager = null
let recordTimer = null

const lessonCountOptions = ['0.5节', '1节', '1.5节', '2节', '2.5节', '3节', '3.5节', '4节', '4.5节', '5节']
const lessonCountValues = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

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

const resetAttendForm = () => {
  lessonCountIndex.value = 1
  lessonContent.value = ''
  photoFiles.value = []
  voiceFiles.value = []
  notifyGuardian.value = false
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

const handleAttendCourse = async (course) => {
  resetAttendForm()

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

  const audioContext = uni.createInnerAudioContext()
  audioContext.src = src
  audioContext.play()
  audioContext.onEnded(() => {
    audioContext.destroy()
  })
  audioContext.onError(() => {
    audioContext.destroy()
    uni.showToast({ title: '播放失败', icon: 'none' })
  })
}

const removeVoice = (index) => {
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
    const notifyResult = result.notifyResult
    const notifyText = notifyGuardian.value && notifyResult
      ? `，通知${notifyResult.success || 0}/${notifyResult.total || 0}`
      : ''
    uni.showToast({ title: `上课成功${notifyText}`, icon: 'success' })
    await fetchDayCourses()
    await fetchStatistics()
    return true
  } catch (error) {
    uni.showToast({ title: error.message || '上课失败', icon: 'none' })
    return false
  }
}

const handleCancelAttendCourse = async (course) => {
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

const goEditLessonRecord = (record) => {
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

onMounted(() => {
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
  fetchDayCourses()
  fetchStatistics()
})

onUnmounted(() => {
  clearRecordTimer()
})
</script>

<style scoped>
.index-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  margin-bottom: 16rpx;
}

.header-left {
  flex: 1;
}

.greeting {
  font-size: 28rpx;
  color: #333;
}

.header-right {
  text-align: right;
}

.date {
  font-size: 24rpx;
  color: #909399;
}

.quick-actions {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
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
  background-color: #ecf5ff;
}

.schedule-icon {
  background-color: #fdf6ec;
}

.lesson-icon {
  background-color: #f0f9eb;
}

.payment-icon {
  background-color: #fef0f0;
}

.balance-icon {
  background-color: #fdf6ec;
}

.action-text {
  font-size: 22rpx;
  color: #606266;
}

.schedule-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
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
  background-color: #f5f7fa;
  border-radius: 50%;
}

.nav-btn text {
  font-size: 28rpx;
  color: #409EFF;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.section-more {
  font-size: 24rpx;
  color: #409EFF;
}

.header-right-btns {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.back-today-btn {
  font-size: 24rpx;
  color: #67C23A;
  font-weight: bold;
  padding: 8rpx 16rpx;
  background-color: #f0f9eb;
  border-radius: 8rpx;
}

.empty-tip {
  text-align: center;
  padding: 32rpx 0;
  color: #909399;
  font-size: 26rpx;
}

.course-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.course-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: #f5f7fa;
  border-radius: 12rpx;
  border-left: 6rpx solid #409EFF;
}

.course-item:active {
  background-color: #e8e8e8;
}

.course-item.course-completed {
  opacity: 0.6;
  border-left-color: #67C23A;
}

.course-index {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.course-index text {
  font-size: 22rpx;
  color: #fff;
  font-weight: bold;
}

.course-time {
  width: 90rpx;
}

.time {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
}

.course-info {
  flex: 1;
  padding: 0 16rpx;
}

.student-name {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 4rpx;
}

.course-type {
  font-size: 22rpx;
  color: #909399;
}

.lesson-record-preview {
  margin-top: 8rpx;
  padding: 10rpx 12rpx;
  border-radius: 8rpx;
  background-color: #eef6ff;
}

.lesson-record-text,
.lesson-record-media {
  display: block;
  font-size: 22rpx;
  line-height: 32rpx;
}

.lesson-record-text {
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lesson-record-media {
  margin-top: 2rpx;
  color: #409EFF;
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
  background-color: #ecf5ff;
  color: #409EFF;
}

.status-completed {
  background-color: #f0f9eb;
  color: #67C23A;
}

.status-cancelled {
  background-color: #fef0f0;
  color: #F56C6C;
}

.btn-attend {
  padding: 10rpx 20rpx;
  background-color: #409EFF;
  color: #fff;
  font-size: 22rpx;
  border: none;
  border-radius: 6rpx;
  line-height: 1.2;
}

.btn-cancel-attend {
  padding: 10rpx 20rpx;
  background-color: #fff;
  color: #F56C6C;
  font-size: 22rpx;
  border: 2rpx solid #F56C6C;
  border-radius: 6rpx;
  line-height: 1.2;
}

.btn-edit-record {
  padding: 10rpx 20rpx;
  background-color: #ecf5ff;
  color: #409EFF;
  font-size: 22rpx;
  border: 2rpx solid #409EFF;
  border-radius: 6rpx;
  line-height: 1.2;
}

.arrow-icon {
  font-size: 32rpx;
  color: #c0c4cc;
  margin-left: 8rpx;
}

.stats-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.stat-card {
  background-color: #f5f7fa;
  border-radius: 12rpx;
  padding: 20rpx;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 6rpx;
}

.stat-value.revenue {
  color: #E6A23C;
}

.stat-value.warning {
  color: #E6A23C;
}

.stat-value.success {
  color: #67C23A;
}

.stat-label {
  font-size: 22rpx;
  color: #909399;
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
  background-color: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.dialog-close {
  font-size: 40rpx;
  color: #909399;
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
  background-color: #f5f7fa;
  border-radius: 12rpx;
}

.attend-student {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.attend-course {
  display: block;
  font-size: 26rpx;
  color: #606266;
  margin-bottom: 4rpx;
}

.attend-time {
  display: block;
  font-size: 24rpx;
  color: #909399;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
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
  color: #909399;
}

.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 80rpx;
  padding: 0 20rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.picker-arrow {
  font-size: 20rpx;
  color: #909399;
}

.content-input {
  width: 100%;
  min-height: 160rpx;
  padding: 18rpx;
  box-sizing: border-box;
  border: 2rpx solid #dcdfe6;
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
  background-color: #f5f7fa;
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
  color: #fff;
  font-size: 28rpx;
}

.photo-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #c0c4cc;
}

.photo-add-icon {
  font-size: 42rpx;
  line-height: 42rpx;
  color: #909399;
}

.photo-add-text {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #909399;
}

.voice-box {
  padding: 18rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
}

.voice-btn {
  height: 68rpx;
  line-height: 68rpx;
  margin: 0;
  padding: 0 24rpx;
  border-radius: 8rpx;
  background-color: #ecf5ff;
  color: #409EFF;
  font-size: 26rpx;
}

.voice-btn.recording {
  background-color: #fef0f0;
  color: #F56C6C;
}

.voice-result {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.voice-info {
  font-size: 26rpx;
  color: #409EFF;
}

.voice-remove {
  font-size: 24rpx;
  color: #F56C6C;
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
  color: #909399;
}

.dialog-footer {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
}

.btn-cancel {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #fff;
  color: #606266;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-confirm {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #409EFF;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}
</style>
