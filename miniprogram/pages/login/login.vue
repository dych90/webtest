<template>
  <view class="login-container">
    <view class="paper-grain"></view>
    <view class="side-label">
      <text>PIANO STUDIO</text>
    </view>

    <view class="login-content">
      <view class="hero-card">
        <view class="staff-line line-1"></view>
        <view class="staff-line line-2"></view>
        <view class="staff-line line-3"></view>

        <view class="music-scene">
          <view class="piano-stand">
            <image class="piano-reference-image" src="../../image/pianoimage-transparent.png" mode="widthFix"></image>
          </view>
          <text class="floating-note note-a">♪</text>
          <text class="floating-note note-b">♩</text>
          <text class="floating-note note-c">♫</text>
          <text class="floating-note note-d">♪</text>
          <text class="floating-note note-e">♬</text>
        </view>

        <text class="brand-en">PIANO</text>
        <text class="brand-title">钢琴工作室</text>
        <text class="brand-subtitle">教师管理系统</text>
      </view>

      <view class="entry-strip">
        <view class="entry-item" :class="{ active: loginMode === 'teacher' }" @tap="switchLoginMode('teacher')">
          <image class="entry-icon-image" src="../../image/login-teacher-icon.png" mode="aspectFit"></image>
          <text>教师登录</text>
        </view>
        <view class="entry-item" :class="{ active: loginMode === 'guardian' }" @tap="switchLoginMode('guardian')">
          <image class="entry-icon-image" src="../../image/login-student-icon.png" mode="aspectFit"></image>
          <text>学生端</text>
        </view>
      </view>

      <view class="login-form" v-if="loginMode === 'teacher'">
        <view class="form-title-row">
          <text class="form-title">账号登录</text>
          <text class="form-side">LESSON LOG</text>
        </view>

        <view class="form-item">
          <view class="input-wrapper">
            <text class="input-label">账号</text>
            <input
              class="form-input"
              v-model="form.username"
              placeholder="请输入用户名"
              type="text"
              placeholder-class="input-placeholder"
            />
          </view>
        </view>

        <view class="form-item">
          <view class="input-wrapper">
            <text class="input-label">密码</text>
            <input
              class="form-input"
              v-model="form.password"
              placeholder="请输入密码"
              :password="!showPassword"
              placeholder-class="input-placeholder"
            />
            <text class="password-toggle" @tap="showPassword = !showPassword">
              {{ showPassword ? '隐藏' : '显示' }}
            </text>
          </view>
        </view>

        <view class="remember-row">
          <view class="remember-checkbox" @tap="rememberPassword = !rememberPassword">
            <view class="checkbox" :class="{ checked: rememberPassword }">
              <text v-if="rememberPassword" class="check-mark">✓</text>
            </view>
            <text class="remember-text">记住密码</text>
          </view>
          <text class="soft-tip">课前准备，从这里开始</text>
        </view>

        <view class="agreement-row">
          <view class="agreement-checkbox" @tap="agreedToTerms = !agreedToTerms">
            <view class="checkbox" :class="{ checked: agreedToTerms }">
              <text v-if="agreedToTerms" class="check-mark">✓</text>
            </view>
          </view>
          <text class="agreement-text">我已阅读并同意</text>
          <text class="agreement-link" @tap.stop="goToUserAgreement">《用户服务协议》</text>
          <text class="agreement-text">和</text>
          <text class="agreement-link" @tap.stop="goToPrivacyPolicy">《隐私政策》</text>
        </view>

        <button class="login-btn" :loading="loading" @tap="handleLogin">
          <text class="btn-text">进入琴房</text>
        </button>

      </view>

      <view class="login-form guardian-form" v-else>
        <view class="form-title-row">
          <text class="form-title">学生端登录</text>
          <text class="form-side">STUDENT</text>
        </view>

        <view class="student-preview" v-if="inviteInfo">
          <text class="student-preview-title">绑定学生</text>
          <text class="student-preview-name">{{ inviteInfo.student?.name }}</text>
          <text class="student-preview-teacher">老师：{{ inviteInfo.teacher?.name || '未设置' }}</text>
        </view>

        <view class="form-item">
          <view class="input-wrapper">
            <text class="input-label">绑定码</text>
            <input
              class="form-input"
              v-model="inviteToken"
              placeholder="请输入老师提供的绑定码"
              type="text"
              placeholder-class="input-placeholder"
              @blur="fetchInviteInfo"
            />
          </view>
        </view>

        <button class="login-btn student-login-btn" :loading="binding" @tap="handleGuardianBind">
          <text class="btn-text">绑定并登录</text>
        </button>

        <view class="student-direct-login">
          <text class="student-direct-desc">已经绑定过学生的微信可以直接登录。</text>
          <button class="guardian-secondary-btn" :loading="guardianLoggingIn" @tap="handleGuardianLogin">
            微信登录
          </button>
        </view>
      </view>

      <view class="login-footer">
        <view class="dash-line"></view>
        <text class="footer-text">记录每一节课 · 安排每一次练习</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { get, post } from '@/utils/request'
import { saveGuardianSession, requestGuardianSubscription } from '@/utils/guardian'

const userStore = useUserStore()

const form = ref({
  username: '',
  password: ''
})

const loading = ref(false)
const showPassword = ref(false)
const rememberPassword = ref(false)
const agreedToTerms = ref(false)
const loginMode = ref('teacher')
const inviteToken = ref('')
const inviteInfo = ref(null)
const binding = ref(false)
const guardianLoggingIn = ref(false)
const SUBSCRIBE_TEMPLATE_ID = 'FPymYYMiWppMeQyUl6RwZbFfJvgCuknjdyphRkDs1Y0'

onLoad((options) => {
  const mode = options?.mode || options?.type || ''
  inviteToken.value = options?.invite || ''

  if (mode === 'guardian' || mode === 'student' || inviteToken.value) {
    loginMode.value = 'guardian'
  }

  if (inviteToken.value) {
    fetchInviteInfo()
  }
})

onMounted(() => {
  const savedUsername = uni.getStorageSync('savedUsername')
  const savedPassword = uni.getStorageSync('savedPassword')
  const savedRemember = uni.getStorageSync('rememberPassword')
  const savedAgreed = uni.getStorageSync('agreedToTerms')

  if (savedRemember === 'true' || savedRemember === true) {
    form.value.username = savedUsername || ''
    form.value.password = savedPassword || ''
    rememberPassword.value = true
  }

  if (savedAgreed === 'true' || savedAgreed === true) {
    agreedToTerms.value = true
  }
})

const switchLoginMode = (mode) => {
  loginMode.value = mode
}

const getWechatCode = () => {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res) => resolve(res.code),
      fail: reject
    })
  })
}

async function fetchInviteInfo () {
  const token = inviteToken.value.trim()
  if (!token) {
    inviteInfo.value = null
    return
  }

  try {
    const res = await get(`/guardian/invites/${token}`)
    inviteInfo.value = res.data || null
  } catch (error) {
    inviteInfo.value = null
  }
}

const enterGuardianHome = async (session) => {
  saveGuardianSession(session)
  await requestGuardianSubscription()
  uni.reLaunch({
    url: '/pages/guardian/home'
  })
}

const handleGuardianBind = async () => {
  const token = inviteToken.value.trim()
  if (!token) {
    uni.showToast({ title: '请输入绑定码', icon: 'none' })
    return
  }

  binding.value = true
  try {
    const code = await getWechatCode()
    const res = await post('/guardian/bind', {
      code,
      inviteToken: token
    })
    await enterGuardianHome(res.data)
  } catch (error) {
    uni.showToast({ title: error.message || '绑定失败', icon: 'none' })
  } finally {
    binding.value = false
  }
}

const handleGuardianLogin = async () => {
  guardianLoggingIn.value = true
  try {
    const code = await getWechatCode()
    const res = await post('/guardian/login', { code })
    await enterGuardianHome(res.data)
  } catch (error) {
    uni.showToast({ title: error.message || '登录失败', icon: 'none' })
  } finally {
    guardianLoggingIn.value = false
  }
}

const handleLogin = async () => {
  if (!form.value.username) {
    uni.showToast({
      title: '请输入用户名',
      icon: 'none'
    })
    return
  }

  if (!form.value.password) {
    uni.showToast({
      title: '请输入密码',
      icon: 'none'
    })
    return
  }

  if (!agreedToTerms.value) {
    uni.showToast({
      title: '请先阅读并同意用户协议和隐私政策',
      icon: 'none'
    })
    return
  }

  loading.value = true

  try {
    const res = await post('/login', form.value)

    if (res.data && res.data.token) {
      uni.setStorageSync('agreedToTerms', 'true')

      if (rememberPassword.value) {
        uni.setStorageSync('savedUsername', form.value.username)
        uni.setStorageSync('savedPassword', form.value.password)
        uni.setStorageSync('rememberPassword', 'true')
      } else {
        uni.removeStorageSync('savedUsername')
        uni.removeStorageSync('savedPassword')
        uni.removeStorageSync('rememberPassword')
      }

      userStore.login(res.data.token, res.data.user)
      uni.setStorageSync('loginType', 'teacher')

      if (res.data.user?.role === 'teacher') {
        await requestReminderSubscription()
      }

      uni.showToast({
        title: '登录成功',
        icon: 'success'
      })

      setTimeout(() => {
        uni.switchTab({
          url: '/pages/index/index'
        })
      }, 1000)
    } else {
      uni.showToast({
        title: res.message || '登录失败',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('登录错误:', error)
    uni.showToast({
      title: error.message || '登录失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

const requestReminderSubscription = async () => {
  try {
    const subscribeResult = await new Promise((resolve, reject) => {
      uni.requestSubscribeMessage({
        tmplIds: [SUBSCRIBE_TEMPLATE_ID],
        success: resolve,
        fail: reject
      })
    })

    if (subscribeResult[SUBSCRIBE_TEMPLATE_ID] !== 'accept') {
      return
    }

    const codeRes = await new Promise((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject
      })
    })

    const openIdRes = await post('/openid', { code: codeRes.code })
    await post('/bind-openid', { openId: openIdRes.data.openId })
  } catch (error) {
    console.warn('登录后订阅提醒失败', error?.message || error)
  }
}

const goToUserAgreement = () => {
  uni.navigateTo({
    url: '/pages/agreement/user-agreement'
  })
}

const goToPrivacyPolicy = () => {
  uni.navigateTo({
    url: '/pages/agreement/privacy-policy'
  })
}
</script>

<style scoped>
.login-container {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 20%, rgba(236, 214, 175, 0.52) 0, rgba(236, 214, 175, 0) 42%),
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
  letter-spacing: 5rpx;
  color: rgba(63, 53, 43, 0.62);
}

.login-content {
  position: relative;
  z-index: 2;
  padding: 54rpx 36rpx 44rpx 70rpx;
  box-sizing: border-box;
}

.hero-card {
  position: relative;
  min-height: 540rpx;
  border-radius: 44rpx 44rpx 30rpx 30rpx;
  background:
    linear-gradient(180deg, rgba(224, 214, 191, 0.92) 0%, rgba(212, 202, 178, 0.86) 100%);
  border: 4rpx solid rgba(118, 95, 75, 0.72);
  box-shadow: 18rpx 24rpx 0 rgba(118, 95, 75, 0.14);
  overflow: hidden;
}

.hero-card::after {
  content: "";
  position: absolute;
  left: 70rpx;
  right: 70rpx;
  bottom: 52rpx;
  height: 116rpx;
  border: 6rpx solid rgba(255, 249, 234, 0.58);
  border-top-color: transparent;
  border-radius: 50%;
  transform: rotate(-8deg);
}

.staff-line {
  position: absolute;
  left: 70rpx;
  right: 70rpx;
  height: 3rpx;
  background: rgba(77, 68, 53, 0.18);
}

.line-1 {
  top: 76rpx;
}

.line-2 {
  top: 106rpx;
}

.line-3 {
  top: 136rpx;
}

.music-scene {
  position: relative;
  height: 370rpx;
  margin: 58rpx 44rpx 0;
}

.piano-stand {
  position: absolute;
  left: 68rpx;
  top: -8rpx;
  width: 430rpx;
  height: 392rpx;
  overflow: visible;
  transform: rotate(-2deg);
  z-index: 2;
}

.piano-reference-image {
  display: block;
  width: 430rpx;
  opacity: 0.96;
}

.floating-note {
  position: absolute;
  z-index: 8;
  display: block;
  font-size: 42rpx;
  line-height: 1;
  color: rgba(83, 70, 55, 0.78);
  font-family: Georgia, serif;
  text-shadow: 4rpx 5rpx 0 rgba(112, 95, 66, 0.1);
}

.note-a {
  left: 18rpx;
  top: 28rpx;
  color: rgba(217, 155, 82, 0.78);
  transform: rotate(-16deg);
}

.note-b {
  right: 58rpx;
  top: 58rpx;
  font-size: 36rpx;
  color: rgba(95, 114, 76, 0.78);
  transform: rotate(13deg);
}

.note-c {
  right: 24rpx;
  top: 190rpx;
  font-size: 50rpx;
  color: rgba(217, 155, 82, 0.72);
  transform: rotate(18deg);
}

.note-d {
  left: 68rpx;
  top: 256rpx;
  font-size: 34rpx;
  color: rgba(95, 114, 76, 0.68);
  transform: rotate(-8deg);
}

.note-e {
  left: 448rpx;
  top: 248rpx;
  font-size: 38rpx;
  color: rgba(83, 70, 55, 0.58);
  transform: rotate(10deg);
}

.brand-en,
.brand-title,
.brand-subtitle {
  position: relative;
  z-index: 2;
  display: block;
  text-align: center;
}

.brand-en {
  margin-top: 8rpx;
  font-size: 26rpx;
  letter-spacing: 8rpx;
  color: rgba(63, 53, 43, 0.66);
  font-family: Georgia, serif;
}

.brand-title {
  margin-top: 16rpx;
  font-size: 44rpx;
  font-weight: 700;
  letter-spacing: 6rpx;
  color: #3e3328;
}

.brand-subtitle {
  margin-top: 8rpx;
  font-size: 24rpx;
  letter-spacing: 4rpx;
  color: rgba(63, 53, 43, 0.72);
}

.entry-strip {
  margin: 34rpx 0 26rpx;
  padding: 24rpx 8rpx 18rpx;
  border-top: 3rpx dashed rgba(85, 71, 58, 0.34);
  border-bottom: 3rpx dashed rgba(85, 71, 58, 0.34);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
}

.entry-item {
  min-height: 148rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  box-sizing: border-box;
  border: 3rpx solid transparent;
  border-radius: 24rpx;
  color: rgba(63, 53, 43, 0.72);
  font-size: 24rpx;
  letter-spacing: 2rpx;
}

.entry-item.active {
  border-color: rgba(85, 68, 53, 0.42);
  background: rgba(255, 248, 235, 0.66);
  color: #3f352b;
}

.entry-icon-image {
  width: 88rpx;
  height: 88rpx;
  display: block;
}

.login-form {
  position: relative;
  padding: 34rpx 30rpx 32rpx;
  border: 4rpx solid rgba(85, 68, 53, 0.58);
  border-radius: 30rpx;
  background: rgba(255, 248, 235, 0.86);
  box-shadow: 14rpx 14rpx 0 rgba(112, 95, 66, 0.12);
}

.login-form::before {
  content: "";
  position: absolute;
  right: 34rpx;
  top: -18rpx;
  width: 92rpx;
  height: 34rpx;
  border-radius: 50%;
  background: rgba(217, 155, 82, 0.32);
  transform: rotate(-8deg);
}

.guardian-form::before {
  background: rgba(95, 114, 76, 0.24);
}

.form-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 26rpx;
}

.form-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #3f352b;
}

.form-side {
  font-size: 18rpx;
  letter-spacing: 4rpx;
  color: rgba(63, 53, 43, 0.45);
}

.form-item {
  margin-bottom: 22rpx;
}

.student-preview {
  padding: 24rpx;
  margin-bottom: 24rpx;
  border: 3rpx solid rgba(95, 114, 76, 0.3);
  border-radius: 22rpx;
  background: rgba(255, 253, 244, 0.72);
}

.student-preview-title,
.student-preview-name,
.student-preview-teacher,
.student-direct-desc {
  display: block;
}

.student-preview-title {
  font-size: 24rpx;
  color: rgba(63, 53, 43, 0.58);
}

.student-preview-name {
  margin-top: 8rpx;
  font-size: 36rpx;
  font-weight: 700;
  color: #5f724c;
}

.student-preview-teacher {
  margin-top: 8rpx;
  font-size: 25rpx;
  color: rgba(63, 53, 43, 0.68);
}

.input-wrapper {
  display: flex;
  align-items: center;
  min-height: 90rpx;
  padding: 0 22rpx;
  border: 3rpx solid rgba(85, 68, 53, 0.38);
  border-radius: 22rpx;
  background: rgba(255, 253, 244, 0.82);
}

.input-label {
  width: 78rpx;
  font-size: 26rpx;
  color: #4d4033;
  font-weight: 600;
}

.form-input {
  flex: 1;
  height: 90rpx;
  font-size: 28rpx;
  color: #3f352b;
}

.input-placeholder {
  color: rgba(63, 53, 43, 0.36);
}

.password-toggle {
  padding-left: 16rpx;
  font-size: 24rpx;
  color: #a26b39;
}

.remember-row,
.remember-checkbox,
.agreement-row {
  display: flex;
  align-items: center;
}

.remember-row {
  justify-content: space-between;
  margin: 8rpx 0 22rpx;
}

.checkbox {
  width: 34rpx;
  height: 34rpx;
  margin-right: 10rpx;
  border: 3rpx solid #6b5947;
  border-radius: 9rpx;
  background: #FFFDF88e8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox.checked {
  background: #d99b52;
}

.check-mark {
  font-size: 24rpx;
  line-height: 24rpx;
  color: #FFFDF88e8;
}

.remember-text,
.soft-tip,
.agreement-text,
.agreement-link {
  font-size: 23rpx;
}

.remember-text {
  color: #4d4033;
}

.soft-tip {
  color: rgba(63, 53, 43, 0.48);
}

.agreement-row {
  flex-wrap: wrap;
  margin-bottom: 24rpx;
  line-height: 36rpx;
}

.agreement-checkbox {
  display: flex;
  align-items: center;
}

.agreement-text {
  color: rgba(63, 53, 43, 0.66);
}

.agreement-link {
  color: #8c5d34;
  font-weight: 600;
}

.login-btn {
  width: 100%;
  height: 92rpx;
  line-height: 92rpx;
  margin: 12rpx 0 0;
  border: none;
  border-radius: 28rpx;
  background: #5f724c;
  color: #FFFDF88e8;
  box-shadow: 10rpx 10rpx 0 rgba(95, 114, 76, 0.18);
}

.login-btn:active {
  transform: translate(4rpx, 4rpx);
  box-shadow: 6rpx 6rpx 0 rgba(95, 114, 76, 0.18);
}

.student-login-btn {
  background: #7b5a3a;
  box-shadow: 10rpx 10rpx 0 rgba(123, 90, 58, 0.16);
}

.student-login-btn:active {
  box-shadow: 6rpx 6rpx 0 rgba(123, 90, 58, 0.16);
}

.btn-text {
  font-size: 31rpx;
  font-weight: 700;
  letter-spacing: 6rpx;
}

.student-direct-login {
  margin-top: 24rpx;
  padding-top: 22rpx;
  border-top: 3rpx dashed rgba(85, 71, 58, 0.24);
}

.student-direct-desc {
  margin-bottom: 14rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  color: rgba(63, 53, 43, 0.62);
}

.guardian-secondary-btn {
  width: 100%;
  height: 82rpx;
  line-height: 82rpx;
  border: 3rpx solid rgba(85, 68, 53, 0.38);
  border-radius: 26rpx;
  background: rgba(255, 253, 244, 0.72);
  color: #4d4033;
  font-size: 27rpx;
}

.login-footer {
  padding: 30rpx 4rpx 0;
  text-align: center;
}

.dash-line {
  height: 2rpx;
  margin-bottom: 18rpx;
  border-top: 3rpx dashed rgba(85, 71, 58, 0.34);
}

.footer-text {
  font-size: 22rpx;
  color: rgba(63, 53, 43, 0.58);
  letter-spacing: 2rpx;
}
</style>
