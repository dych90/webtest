<template>
  <view class="login-container">
    <view class="login-bg">
      <view class="bg-circle bg-circle-1"></view>
      <view class="bg-circle bg-circle-2"></view>
      <view class="bg-circle bg-circle-3"></view>
    </view>
    
    <view class="login-content">
      <view class="login-header">
        <view class="logo-wrapper">
          <image class="logo" src="/static/logo.png" mode="aspectFit"></image>
        </view>
        <text class="title">钢琴工作室</text>
        <text class="subtitle">教师管理系统</text>
      </view>
      
      <view class="login-form">
        <view class="form-item">
          <view class="input-wrapper">
            <text class="input-icon">👤</text>
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
            <text class="input-icon">🔒</text>
            <input 
              class="form-input" 
              v-model="form.password" 
              placeholder="请输入密码"
              :password="!showPassword"
              placeholder-class="input-placeholder"
            />
            <text class="password-toggle" @click="showPassword = !showPassword">
              {{ showPassword ? '🙈' : '👁️' }}
            </text>
          </view>
        </view>
        
        <button class="login-btn" :loading="loading" @tap="handleLogin">
          <text class="btn-text">登 录</text>
        </button>
      </view>
      
      <view class="login-footer">
        <view class="footer-line"></view>
        <text class="footer-text">安全登录 · 数据加密</text>
        <view class="footer-line"></view>
      </view>
    </view>
    
    <view class="login-bottom">
      <text class="copyright">© 2025 钢琴工作室管理系统</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { post } from '@/utils/request'

const userStore = useUserStore()

const form = ref({
  username: '',
  password: ''
})

const loading = ref(false)
const showPassword = ref(false)

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
  
  loading.value = true
  
  try {
    const res = await post('/login', form.value)
    
    if (res.data && res.data.token) {
      userStore.login(res.data.token, res.data.user)
      
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
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.login-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
}

.bg-circle-1 {
  width: 400rpx;
  height: 400rpx;
  background: #fff;
  top: -100rpx;
  right: -100rpx;
}

.bg-circle-2 {
  width: 300rpx;
  height: 300rpx;
  background: #fff;
  top: 200rpx;
  left: -80rpx;
}

.bg-circle-3 {
  width: 500rpx;
  height: 500rpx;
  background: #fff;
  bottom: -150rpx;
  right: -150rpx;
}

.login-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 60rpx 50rpx 40rpx;
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  padding-top: 40rpx;
  margin-bottom: 50rpx;
}

.logo-wrapper {
  width: 140rpx;
  height: 140rpx;
  margin: 0 auto 24rpx;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
}

.logo {
  width: 100rpx;
  height: 100rpx;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 12rpx;
  letter-spacing: 4rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 2rpx;
}

.login-form {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 32rpx;
  padding: 50rpx 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.15);
}

.form-item {
  margin-bottom: 32rpx;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: #f5f7fa;
  border-radius: 16rpx;
  padding: 0 24rpx;
  height: 100rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s;
}

.input-wrapper:focus-within {
  background: #fff;
  border-color: #667eea;
  box-shadow: 0 0 0 4rpx rgba(102, 126, 234, 0.1);
}

.input-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}

.form-input {
  flex: 1;
  height: 100rpx;
  font-size: 30rpx;
  color: #333;
}

.input-placeholder {
  color: #c0c4cc;
}

.password-toggle {
  font-size: 32rpx;
  padding: 10rpx;
}

.login-btn {
  width: 100%;
  height: 100rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 16rpx;
  font-size: 34rpx;
  font-weight: bold;
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 30rpx rgba(102, 126, 234, 0.4);
}

.login-btn:active {
  transform: scale(0.98);
  box-shadow: 0 5rpx 20rpx rgba(102, 126, 234, 0.4);
}

.btn-text {
  letter-spacing: 8rpx;
}

.login-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 50rpx;
}

.footer-line {
  width: 60rpx;
  height: 2rpx;
  background: rgba(255, 255, 255, 0.3);
}

.footer-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 20rpx;
}

.login-bottom {
  padding: 30rpx 0 50rpx;
  text-align: center;
  position: relative;
  z-index: 1;
}

.copyright {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.5);
}
</style>
