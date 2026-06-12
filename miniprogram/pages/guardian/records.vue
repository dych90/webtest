<template>
  <view class="guardian-page" :class="themeClass">
    <view class="top-card">
      <picker :range="students" range-key="name" :value="studentIndex" @change="onStudentChange">
        <view class="student-picker">
          <text class="student-name">{{ currentStudent?.name || '选择学生' }}</text>
          <text class="switch-text">切换</text>
        </view>
      </picker>

      <view class="balance-row">
        <text class="balance-label">剩余课时</text>
        <text class="balance-value">{{ getBalanceText() }}</text>
      </view>
    </view>

    <view class="tabs">
      <view class="tab-item" :class="{ active: activeTab === 'lessons' }" @click="activeTab = 'lessons'">
        消课记录
      </view>
      <view class="tab-item" :class="{ active: activeTab === 'payments' }" @click="activeTab = 'payments'">
        缴费记录
      </view>
    </view>

    <scroll-view scroll-y class="record-scroll">
      <view v-if="activeTab === 'lessons'">
        <view v-if="lessonRecords.length === 0" class="empty">暂无消课记录</view>
        <view v-else class="record-card" :class="{ highlighted: record._id === targetRecordId }" v-for="record in lessonRecords" :key="record._id">
          <view class="record-main">
            <text class="record-title">{{ record.courseTypeId?.name || '消课记录' }}</text>
            <text class="record-date">{{ formatDate(record.recordDate) }}</text>
          </view>
          <view class="record-side">
            <text class="record-value">{{ record.lessonsConsumed }}课时</text>
            <text class="record-tag" :class="{ active: record.isDeducted }">
              {{ record.isDeducted ? '已扣课' : '未扣课' }}
            </text>
          </view>
          <text v-if="record.lessonContent" class="record-content">{{ record.lessonContent }}</text>
          <view v-if="getRecordImages(record).length > 0" class="record-images">
            <image
              v-for="(media, imageIndex) in getRecordImages(record)"
              :key="media.id"
              class="record-image"
              :src="mediaCache[media.id]"
              mode="aspectFill"
              @click="previewRecordImage(record, imageIndex)"
            ></image>
          </view>
          <view v-if="getRecordAudios(record).length > 0" class="record-audios">
            <view
              v-for="media in getRecordAudios(record)"
              :key="media.id"
              class="audio-row"
              @click="playRecordAudio(media)"
            >
              <text class="audio-icon">▶</text>
              <text class="audio-text">语音记录 {{ formatDuration(media.duration || 0) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else>
        <view v-if="payments.length === 0" class="empty">暂无缴费记录</view>
        <view v-else class="record-card" v-for="payment in payments" :key="payment._id">
          <view class="record-main">
            <text class="record-title">{{ getPaymentTypeText(payment.paymentType) }}</text>
            <text class="record-date">{{ formatDate(payment.paymentDate) }}</text>
          </view>
          <view class="record-side">
            <text class="money">¥{{ payment.amount || 0 }}</text>
            <text class="record-tag">{{ payment.totalLessons || 0 }}课时</text>
          </view>
          <text class="record-content">
            赠课 {{ payment.bonusLessons || 0 }} 节，单价 ¥{{ payment.unitPrice || 0 }}
          </text>
        </view>
      </view>
    </scroll-view>

    <view class="guardian-tabbar">
      <view class="tab" @click="goHome">首页</view>
      <view class="tab" @click="goSchedule">课表</view>
      <view class="tab active">记录</view>
      <view class="tab" @click="goMine">我的</view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { get, downloadFile } from '@/utils/request'
import { getGuardianToken, getSelectedGuardianStudentId, saveGuardianSession } from '@/utils/guardian'
import { applyTheme, getThemeClass } from '@/utils/theme'

const students = ref([])
const selectedStudentId = ref('')
const balance = ref({})
const lessonRecords = ref([])
const payments = ref([])
const activeTab = ref('lessons')
const targetStudentId = ref('')
const targetRecordId = ref('')
const mediaCache = ref({})
const themeClass = ref(getThemeClass())
let audioContext = null

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

  return balance.value.remainingLessons || 0
}

onLoad((query = {}) => {
  targetStudentId.value = query.studentId || ''
  targetRecordId.value = query.recordId || ''
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
    const hasTargetStudent = students.value.some(student => student._id === targetStudentId.value)
    selectedStudentId.value = hasTargetStudent ? targetStudentId.value : getSelectedGuardianStudentId(students.value)

    if (selectedStudentId.value) {
      fetchAll()
    }
  } catch (error) {
    uni.showToast({ title: error.message || '获取学生失败', icon: 'none' })
  }
}

const fetchAll = async () => {
  try {
    const [balanceRes, lessonRes, paymentRes] = await Promise.all([
      get(`/guardian/students/${selectedStudentId.value}/balance`),
      get(`/guardian/students/${selectedStudentId.value}/lesson-records`),
      get(`/guardian/students/${selectedStudentId.value}/payments`)
    ])
    balance.value = balanceRes.data || {}
    lessonRecords.value = lessonRes.data || []
    payments.value = paymentRes.data || []
    loadRecordMedia()
  } catch (error) {
    uni.showToast({ title: error.message || '获取记录失败', icon: 'none' })
  }
}

const onStudentChange = (event) => {
  const student = students.value[event.detail.value]
  if (!student) return

  selectedStudentId.value = student._id
  targetStudentId.value = ''
  targetRecordId.value = ''
  uni.setStorageSync('selectedGuardianStudentId', student._id)
  fetchAll()
}

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDuration = (duration = 0) => {
  const totalSeconds = Math.max(0, Math.round(duration / 1000))
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

const getRecordImages = (record) => {
  return (record.mediaItems || []).filter(item => item.type === 'image' && mediaCache.value[item.id])
}

const getRecordAudios = (record) => {
  return (record.mediaItems || []).filter(item => item.type === 'audio' && mediaCache.value[item.id])
}

const loadRecordMedia = async () => {
  const mediaItems = lessonRecords.value
    .flatMap(record => record.mediaItems || [])
    .filter(item => item.id && item.url && !mediaCache.value[item.id])

  for (const media of mediaItems) {
    try {
      const tempFilePath = await downloadFile(media.url)
      mediaCache.value = {
        ...mediaCache.value,
        [media.id]: tempFilePath
      }
    } catch (error) {
      console.warn('课后记录媒体下载失败', media.id, error?.message || error)
    }
  }
}

const previewRecordImage = (record, imageIndex) => {
  const urls = getRecordImages(record)
    .map(media => mediaCache.value[media.id])
    .filter(Boolean)

  if (urls.length === 0) return

  uni.previewImage({
    urls,
    current: urls[imageIndex]
  })
}

const playRecordAudio = (media) => {
  const src = mediaCache.value[media.id]
  if (!src) return

  if (audioContext) {
    audioContext.destroy()
  }

  audioContext = uni.createInnerAudioContext()
  audioContext.src = src
  audioContext.play()
  audioContext.onEnded(() => {
    audioContext.destroy()
    audioContext = null
  })
  audioContext.onError(() => {
    audioContext.destroy()
    audioContext = null
    uni.showToast({ title: '语音播放失败', icon: 'none' })
  })
}

const getPaymentTypeText = (type) => {
  const map = {
    prepaid: '预付费缴费',
    payPerLesson: '单次课缴费'
  }
  return map[type] || '缴费记录'
}

const goHome = () => {
  uni.navigateTo({ url: '/pages/guardian/home' })
}

const goSchedule = () => {
  uni.navigateTo({ url: '/pages/guardian/schedule' })
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
.record-card {
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

.switch-text {
  font-size: 24rpx;
  color: var(--theme-primary);
}

.balance-row {
  height: 92rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.balance-label {
  font-size: 26rpx;
  color: var(--theme-muted);
}

.balance-value {
  font-size: 42rpx;
  line-height: 48rpx;
  font-weight: bold;
  color: var(--theme-primary);
}

.tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
  margin-bottom: 18rpx;
}

.tab-item {
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  border-radius: 8rpx;
  background-color: var(--theme-card);
  color: var(--theme-muted);
  font-size: 26rpx;
}

.tab-item.active {
  background-color: var(--theme-primary);
  color: #fff;
  font-weight: bold;
}

.record-scroll {
  height: calc(100vh - 330rpx);
}

.record-card {
  padding: 22rpx;
  margin-bottom: 16rpx;
}

.record-card.highlighted {
  border: 2rpx solid var(--theme-primary);
}

.record-main {
  min-width: 0;
}

.record-title {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: var(--theme-text);
}

.record-date {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--theme-muted);
}

.record-side {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.record-value,
.money {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--theme-primary);
}

.money {
  color: var(--theme-warning);
}

.record-tag {
  font-size: 22rpx;
  color: var(--theme-muted);
}

.record-tag.active {
  color: var(--theme-success);
}

.record-content {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  color: var(--theme-muted);
}

.record-images {
  margin-top: 16rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.record-image {
  width: 100%;
  height: 150rpx;
  border-radius: 8rpx;
  background-color: var(--theme-bg-soft);
}

.record-audios {
  margin-top: 14rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.audio-row {
  min-height: 64rpx;
  padding: 0 18rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  border-radius: 32rpx;
  background-color: var(--theme-primary-soft);
}

.audio-icon {
  font-size: 24rpx;
  color: var(--theme-primary);
}

.audio-text {
  font-size: 24rpx;
  color: var(--theme-primary);
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
