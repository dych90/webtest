<template>
  <view class="login-container">
    <view class="login-header">
      <image class="logo" src="/static/logo.png" mode="aspectFit"></image>
      <text class="title">钢琴工作室管理系统</text>
      <text class="subtitle">教师端</text>
    </view>
    
    <view class="login-form">
      <view class="form-item">
        <view class="form-label">用户名</view>
        <input 
          class="form-input" 
          v-model="form.username" 
          placeholder="请输入用户名"
          type="text"
        />
      </view>
      
      <view class="form-item">
        <view class="form-label">密码</view>
        <input 
          class="form-input" 
          v-model="form.password" 
          placeholder="请输入密码"
          :password="!showPassword"
        />
        <view class="password-toggle" @click="showPassword = !showPassword">
          <text>{{ showPassword ? '隐藏' : '显示' }}</text>
        </view>
      </view>
      
      <button class="login-btn" :loading="loading" @tap="handleLogin">
        登录
      </button>
    </view>
    
    <view class="login-footer">
      <text>© 2025 钢琴工作室管理系统</text>
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
  console.log('登录按钮被点击')
  console.log('用户名:', form.value.username)
  console.log('密码:', form.value.password)
  
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
  console.log('开始发送登录请求...')
  
  try {
    const res = await post('/login', form.value)
    console.log('登录响应:', res)
    
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: linear-gradient(135deg, #409EFF 0%, #66b1ff 100%);
}

.login-header {
  text-align: center;
  margin-bottom: 80rpx;
}

.logo {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 30rpx;
}

.title {
  display: block;
  font-size: 44rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 16rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.login-form {
  width: 100%;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 50rpx 40rpx;
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.1);
}

.form-item {
  margin-bottom: 40rpx;
  position: relative;
}

.form-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
}

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #409EFF;
}

.password-toggle {
  position: absolute;
  right: 24rpx;
  top: 70rpx;
  font-size: 24rpx;
  color: #409EFF;
}

.login-btn {
  width: 100%;
  height: 88rpx;
  background-color: #409EFF;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: bold;
  margin-top: 20rpx;
}

.login-btn:active {
  background-color: #337ecc;
}

.login-footer {
  margin-top: 80rpx;
  text-align: center;
}

.login-footer text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
}
</style>
