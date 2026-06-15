<template>
  <view class="guardian-page" :class="themeClass">
    <view class="guardian-music-hero">
      <view class="guardian-hero-copy">
        <text class="guardian-hero-kicker">MY PIANO ROOM</text>
        <text class="guardian-hero-title">学生端设置</text>
        <text class="guardian-hero-subtitle">绑定学生、订阅提醒和切换主题</text>
      </view>
      <view class="guardian-hero-art">
        <view class="guardian-staff-line line-one"></view>
        <view class="guardian-staff-line line-two"></view>
        <view class="guardian-staff-line line-three"></view>
        <image class="guardian-hero-piano" src="../../image/pianoimage-transparent.png" mode="aspectFit"></image>
        <text class="guardian-note note-one">♪</text>
        <text class="guardian-note note-two">♫</text>
        <text class="guardian-note note-three">♩</text>
      </view>
    </view>

    <view class="profile-card">
      <text class="profile-title">学生端</text>
      <text class="profile-desc">只能查看已绑定学生的数据</text>
    </view>

    <view class="card">
      <view class="card-header">
        <text class="card-title">绑定学生</text>
        <text class="card-count">{{ students.length }}人</text>
      </view>
      <view v-if="students.length === 0" class="empty">暂无绑定学生</view>
      <view v-else class="student-list">
        <view
          v-for="student in students"
          :key="student._id"
          class="student-row"
          :class="{ active: student._id === selectedStudentId }"
          @click="selectStudent(student)"
        >
          <view class="student-main">
            <text class="student-name">{{ student.name }}</text>
            <text class="teacher-name">老师：{{ student.teacher?.name || '未设置' }}</text>
            <text class="teacher-name" v-if="getPracticeTeacherName(student)">陪练：{{ getPracticeTeacherName(student) }}</text>
            <text class="teacher-name" v-if="getStudentPriceText(student)">{{ getStudentPriceText(student) }}</text>
          </view>
          <view class="student-actions">
            <text class="student-balance">{{ getStudentAccountBalanceText(student) }}</text>
            <button class="unbind-btn" @click.stop="handleUnbind(student)">解除</button>
          </view>
        </view>
      </view>
    </view>

    <view class="card">
      <button class="primary-btn" :loading="subscribing" @click="handleSubscribe">
        订阅课程提醒
      </button>
      <text class="tip">微信订阅消息是一次性授权，需要定期重新订阅。</text>
    </view>

    <view class="card">
      <picker :value="themeIndex" :range="themeOptions" @change="onThemeChange">
        <view class="theme-row">
          <text class="theme-label">界面主题</text>
          <text class="theme-value">{{ currentThemeName }}</text>
        </view>
      </picker>
    </view>

    <view class="card">
      <button class="logout-btn" @click="handleLogout">退出学生端</button>
    </view>

    <view class="guardian-tabbar">
      <view class="tab" @click="goHome">
        <image class="guardian-tab-icon" src="../../static/tabbar/home.png" mode="aspectFit"></image>
        <text class="guardian-tab-label">首页</text>
      </view>
      <view class="tab" @click="goSchedule">
        <image class="guardian-tab-icon" src="../../static/tabbar/course.png" mode="aspectFit"></image>
        <text class="guardian-tab-label">课表</text>
      </view>
      <view class="tab" @click="goRecords">
        <image class="guardian-tab-icon" src="../../static/tabbar/student.png" mode="aspectFit"></image>
        <text class="guardian-tab-label">记录</text>
      </view>
      <view class="tab active">
        <image class="guardian-tab-icon" src="../../static/tabbar/mine-active.png" mode="aspectFit"></image>
        <text class="guardian-tab-label">我的</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, del } from '@/utils/request'
import { clearGuardianSession, getGuardianToken, getSelectedGuardianStudentId, requestGuardianSubscription, saveGuardianSession } from '@/utils/guardian'
import { applyTheme, getCurrentTheme, getThemeClass, getThemeIndex, getThemeOptions, setCurrentThemeByIndex } from '@/utils/theme'

const students = ref([])
const selectedStudentId = ref('')
const subscribing = ref(false)
const themeOptions = getThemeOptions()
const themeIndex = ref(getThemeIndex())
const themeClass = ref(getThemeClass())
const themeColors = ref(getCurrentTheme())

const currentThemeName = computed(() => {
  return themeOptions[themeIndex.value] || themeOptions[0]
})

onShow(() => {
  refreshTheme()
  fetchStudents()
})

const refreshTheme = () => {
  themeIndex.value = getThemeIndex()
  themeClass.value = getThemeClass()
  themeColors.value = applyTheme()
}

const onThemeChange = (event) => {
  const theme = setCurrentThemeByIndex(event.detail.value)
  themeIndex.value = getThemeIndex(theme.key)
  themeClass.value = getThemeClass(theme.key)
  themeColors.value = theme
  uni.showToast({ title: `已切换为${theme.name}`, icon: 'none' })
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
  } catch (error) {
    uni.showToast({ title: error.message || '获取学生失败', icon: 'none' })
  }
}

const selectStudent = (student) => {
  selectedStudentId.value = student._id
  uni.setStorageSync('selectedGuardianStudentId', student._id)
  uni.showToast({ title: '已切换学生', icon: 'success' })
}

const getStudentBalanceText = (student) => {
  const accounts = student.balanceAccounts || []
  if (accounts.length) {
    const prepaidAccounts = accounts.filter(account => account.paymentType === 'prepaid')
    if (prepaidAccounts.length) {
      const total = prepaidAccounts.reduce((sum, account) => sum + (account.remainingLessons || 0), 0)
      return `${total}课时`
    }
    if (accounts.every(account => account.paymentType === 'free')) {
      return '免费'
    }
    return '单次付费'
  }

  return student.paymentType === 'free' ? '免费' : `${student.remainingLessons || 0}课时`
}

const getStudentAccountBalanceText = (student) => {
  const accounts = student.balanceAccounts || []
  if (accounts.length) {
    return accounts.map(account => {
      const label = account.relation === 'practice' ? '陪练' : '任课'
      if (account.paymentType === 'free') {
        return `${label}免费`
      }
      if (account.paymentType === 'payPerLesson') {
        return `${label}单次`
      }
      return `${label}${account.remainingLessons || 0}`
    }).join(' / ')
  }

  return getStudentBalanceText(student)
}

const getPracticeTeacherName = (student) => {
  return student.practiceTeacherId?.name || student.practiceTeacher || ''
}

const getStudentPriceText = (student) => {
  if (!student) {
    return ''
  }

  const accounts = (student.priceAccounts || []).filter(account => {
    if (account.paymentType === 'free') return true
    return account.price !== undefined && account.price !== null && account.price !== ''
  })
  if (accounts.length) {
    return accounts.map(account => {
      const label = account.relation === 'practice' ? '陪练' : '任课'
      if (account.paymentType === 'free') {
        return `${label}课费：免费`
      }
      return `${label}课费：¥${account.price}/课时`
    }).join(' / ')
  }

  if (student.paymentType === 'free') {
    return ''
  }

  return `默认课费：¥${student.currentPrice || 0}/课时`
}

const handleUnbind = (student) => {
  uni.showModal({
    title: '解除绑定',
    content: `确定从学生端删除“${student.name}”吗？不会删除学生资料和课程记录。`,
    confirmText: '解除',
    confirmColor: themeColors.value.danger,
    success: async (res) => {
      if (!res.confirm) return

      try {
        const result = await del(`/guardian/students/${student._id}/binding`)
        const session = result.data || {
          token: getGuardianToken(),
          guardian: JSON.parse(uni.getStorageSync('guardianInfo') || '{}'),
          students: students.value.filter(item => item._id !== student._id)
        }

        students.value = session.students || []
        saveGuardianSession(session)
        selectedStudentId.value = getSelectedGuardianStudentId(students.value)
        uni.showToast({ title: '已解除绑定', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: error.message || '解除失败', icon: 'none' })
      }
    }
  })
}

const handleSubscribe = async () => {
  subscribing.value = true
  try {
    const ok = await requestGuardianSubscription()
    uni.showToast({
      title: ok ? '订阅成功' : '未完成订阅',
      icon: 'none'
    })
  } finally {
    subscribing.value = false
  }
}

const handleLogout = () => {
  uni.showModal({
    title: '退出登录',
    content: '确定退出学生端吗？',
    success: (res) => {
      if (!res.confirm) return

      clearGuardianSession()
      uni.reLaunch({ url: '/pages/login/login?mode=guardian' })
    }
  })
}

const goHome = () => {
  uni.navigateTo({ url: '/pages/guardian/home' })
}

const goSchedule = () => {
  uni.navigateTo({ url: '/pages/guardian/schedule' })
}

const goRecords = () => {
  uni.navigateTo({ url: '/pages/guardian/records' })
}
</script>

<style scoped>
.guardian-page {
  min-height: 100vh;
  padding: 20rpx 20rpx 120rpx;
  box-sizing: border-box;
  background: var(--theme-page-bg);
}

.profile-card,
.card {
  background-color: var(--theme-card);
  border-radius: var(--theme-guardian-card-radius);
  padding: 24rpx;
  margin-bottom: 18rpx;
  box-shadow: var(--theme-card-shadow);
  border: var(--theme-card-border);
}

.profile-title {
  display: block;
  font-size: 38rpx;
  font-weight: bold;
  color: var(--theme-text);
}

.profile-desc,
.tip {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  color: var(--theme-muted);
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
  color: var(--theme-text);
}

.card-count {
  font-size: 24rpx;
  color: var(--theme-primary);
}

.student-list {
  display: flex;
  flex-direction: column;
}

.student-row {
  min-height: 82rpx;
  padding: 14rpx 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid var(--theme-border);
}

.student-main {
  min-width: 0;
  flex: 1;
}

.student-row:last-child {
  border-bottom: none;
}

.student-row.active .student-name {
  color: var(--theme-primary);
}

.student-name {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: var(--theme-text);
}

.teacher-name {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: var(--theme-muted);
}

.student-balance {
  font-size: 24rpx;
  color: var(--theme-primary);
}

.student-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-left: 20rpx;
}

.unbind-btn {
  width: 104rpx;
  height: 56rpx;
  line-height: 56rpx;
  margin: 0;
  padding: 0;
  border-radius: 8rpx;
  border: 1rpx solid var(--theme-danger);
  background-color: var(--theme-card);
  color: var(--theme-danger);
  font-size: 24rpx;
}

.primary-btn,
.logout-btn {
  height: 82rpx;
  line-height: 82rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.theme-row {
  min-height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.theme-label {
  font-size: 28rpx;
  color: var(--theme-text);
}

.theme-value {
  font-size: 26rpx;
  color: var(--theme-primary);
}

.primary-btn {
  color: #FFFDF8;
  background-color: var(--theme-primary);
}

.logout-btn {
  color: var(--theme-danger);
  background-color: var(--theme-card);
  border: 1rpx solid var(--theme-danger);
}

.empty {
  padding: 40rpx 0;
  text-align: center;
  color: var(--theme-muted);
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
