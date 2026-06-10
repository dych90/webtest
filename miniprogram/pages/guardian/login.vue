<template>
  <view class="guardian-login">
    <view class="header">
      <text class="title">家长端</text>
      <text class="subtitle">查看课表、课时和缴费记录</text>
    </view>

    <view class="card" v-if="inviteInfo">
      <text class="card-title">绑定学生</text>
      <text class="student-name">{{ inviteInfo.student?.name }}</text>
      <text class="teacher-name">老师：{{ inviteInfo.teacher?.name || '未设置' }}</text>
    </view>

    <view class="card">
      <text class="card-title">绑定码</text>
      <input
        class="input"
        v-model="inviteToken"
        placeholder="请输入老师提供的绑定码"
        placeholder-class="placeholder"
      />
      <button class="primary-btn" :loading="binding" @click="handleBind">
        绑定并登录
      </button>
    </view>

    <view class="card">
      <text class="card-title">已绑定家长</text>
      <text class="desc">如果这个微信已经绑定过学生，可以直接登录。</text>
      <button class="secondary-btn" :loading="loggingIn" @click="handleLogin">
        微信登录
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { get, post } from '@/utils/request'
import { saveGuardianSession, requestGuardianSubscription } from '@/utils/guardian'

const inviteToken = ref('')
const inviteInfo = ref(null)
const binding = ref(false)
const loggingIn = ref(false)

onLoad((options) => {
  inviteToken.value = options?.invite || ''
  if (inviteToken.value) {
    fetchInviteInfo()
  }
})

const getWechatCode = () => {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res) => resolve(res.code),
      fail: reject
    })
  })
}

const fetchInviteInfo = async () => {
  try {
    const res = await get(`/guardian/invites/${inviteToken.value}`)
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

const handleBind = async () => {
  if (!inviteToken.value) {
    uni.showToast({ title: '请输入绑定码', icon: 'none' })
    return
  }

  binding.value = true
  try {
    const code = await getWechatCode()
    const res = await post('/guardian/bind', {
      code,
      inviteToken: inviteToken.value
    })
    await enterGuardianHome(res.data)
  } catch (error) {
    uni.showToast({ title: error.message || '绑定失败', icon: 'none' })
  } finally {
    binding.value = false
  }
}

const handleLogin = async () => {
  loggingIn.value = true
  try {
    const code = await getWechatCode()
    const res = await post('/guardian/login', { code })
    await enterGuardianHome(res.data)
  } catch (error) {
    uni.showToast({ title: error.message || '登录失败', icon: 'none' })
  } finally {
    loggingIn.value = false
  }
}
</script>

<style scoped>
.guardian-login {
  min-height: 100vh;
  padding: 48rpx 28rpx;
  box-sizing: border-box;
  background-color: #f6f7fb;
}

.header {
  margin-bottom: 36rpx;
}

.title {
  display: block;
  font-size: 44rpx;
  line-height: 54rpx;
  font-weight: bold;
  color: #1f2d3d;
}

.subtitle {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #606266;
}

.card {
  background-color: #fff;
  border-radius: 8rpx;
  padding: 28rpx;
  margin-bottom: 22rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 45, 61, 0.06);
}

.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #303133;
  margin-bottom: 18rpx;
}

.student-name {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #409EFF;
}

.teacher-name,
.desc {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  line-height: 36rpx;
  color: #606266;
}

.input {
  height: 82rpx;
  padding: 0 20rpx;
  border: 1rpx solid #dcdfe6;
  border-radius: 8rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  background-color: #fff;
}

.placeholder {
  color: #c0c4cc;
}

.primary-btn,
.secondary-btn {
  height: 82rpx;
  line-height: 82rpx;
  margin-top: 22rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.primary-btn {
  color: #fff;
  background-color: #409EFF;
}

.secondary-btn {
  color: #409EFF;
  background-color: #ecf5ff;
}
</style>
