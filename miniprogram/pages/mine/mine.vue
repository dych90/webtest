<template>
  <view class="mine-container">
    <view class="user-section">
      <view class="user-avatar">
        <text>{{ userStore.userInfo?.name?.charAt(0) || 'U' }}</text>
      </view>
      <view class="user-info">
        <text class="user-name">{{ userStore.userInfo?.name || '未登录' }}</text>
        <text class="user-role">{{ roleText }}</text>
      </view>
    </view>
    
    <view class="menu-section">
      <view class="menu-group">
        <view class="menu-item" @click="goToPage('/pages/lessons/lessons')">
          <view class="menu-icon">📝</view>
          <text class="menu-text">消课管理</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="goToPage('/pages/payments/payments')">
          <view class="menu-icon">💰</view>
          <text class="menu-text">缴费管理</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="goToPage('/pages/balance/balance')">
          <view class="menu-icon">🎫</view>
          <text class="menu-text">剩余课费</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="goToPage('/pages/statistics/statistics')">
          <view class="menu-icon">📊</view>
          <text class="menu-text">数据统计</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
      
      <view class="menu-group" v-if="!userStore.isAdmin()">
        <view class="menu-item" @click="goToPage('/pages/course-types/course-types')">
          <view class="menu-icon">📚</view>
          <text class="menu-text">课程类型</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="goToPage('/pages/fee-standards/fee-standards')">
          <view class="menu-icon">💵</view>
          <text class="menu-text">收费标准</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
      
      <view class="menu-group" v-if="userStore.isTeacher()">
        <view class="menu-item" @click="handleSubscribeMessage">
          <view class="menu-icon">🔔</view>
          <text class="menu-text" :class="{ 'subscribed-text': isSubscribed }">{{ isSubscribed ? '已订阅上课提醒' : '订阅上课提醒' }}</text>
          <text class="menu-arrow" :class="{ 'subscribed-arrow': isSubscribed }">{{ isSubscribed ? '✓' : '›' }}</text>
        </view>
      </view>
      
      <view class="menu-group">
        <view class="menu-item" @click="handleLogout">
          <view class="menu-icon logout-icon">🚪</view>
          <text class="menu-text logout-text">退出登录</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>
    
    <view class="version">
      <text>版本 1.0.0</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { get, post } from '@/utils/request'

const userStore = useUserStore()
const isSubscribed = ref(false)

const roleText = computed(() => {
  if (userStore.isAdmin()) return '管理员'
  if (userStore.isTeacher()) return '教师'
  return '未知角色'
})

const checkSubscriptionStatus = async () => {
  if (!userStore.isTeacher()) {
    console.log('不是教师角色，跳过检查订阅状态')
    return
  }
  
  try {
    console.log('开始检查订阅状态...')
    const res = await get('/users/me')
    console.log('获取用户信息成功:', res.data)
    console.log('openId值:', res.data?.openId)
    console.log('openId类型:', typeof res.data?.openId)
    
    isSubscribed.value = !!(res.data?.openId)
    
    console.log('最终订阅状态:', isSubscribed.value)
    console.log('isSubscribed.value类型:', typeof isSubscribed.value)
  } catch (error) {
    console.error('检查订阅状态失败:', error)
    console.error('错误详情:', error.message)
    uni.showToast({
      title: '获取订阅状态失败',
      icon: 'none'
    })
  }
}

const goToPage = (url) => {
  uni.navigateTo({ url })
}

const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.reLaunch({
          url: '/pages/login/login'
        })
      }
    }
  })
}

const handleSubscribeMessage = async () => {
  try {
    const res = await new Promise((resolve, reject) => {
      uni.requestSubscribeMessage({
        tmplIds: ['FPymYYMiWppMeQyUl6RwZbFfJvgCuknjdyphRkDs1Y0'],
        success: (res) => {
          resolve(res)
        },
        fail: (err) => {
          reject(err)
        }
      })
    })

    const templateResult = res['FPymYYMiWppMeQyUl6RwZbFfJvgCuknjdyphRkDs1Y0']
    
    if (templateResult === 'accept') {
      uni.showLoading({ title: '绑定中...' })
      
      try {
        const codeRes = await new Promise((resolve, reject) => {
          uni.login({
            provider: 'weixin',
            success: (res) => {
              resolve(res)
            },
            fail: (err) => {
              reject(err)
            }
          })
        })

        const openIdRes = await post('/openid', { code: codeRes.code })
        
        await post('/bind-openid', { openId: openIdRes.data.openId })
        
        isSubscribed.value = true
        
        uni.hideLoading()
        uni.showToast({
          title: '订阅成功',
          icon: 'success'
        })
        
        await checkSubscriptionStatus()
      } catch (error) {
        uni.hideLoading()
        uni.showToast({
          title: error.message || '绑定失败',
          icon: 'none'
        })
      }
    } else if (templateResult === 'reject') {
      uni.showToast({
        title: '已拒绝订阅',
        icon: 'none'
      })
    } else {
      uni.showToast({
        title: '订阅失败',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('订阅消息错误:', error)
    uni.showToast({
      title: '订阅失败',
      icon: 'none'
    })
  }
}

onMounted(() => {
  console.log('页面已挂载，开始检查订阅状态')
  checkSubscriptionStatus()
})

onShow(() => {
  console.log('页面显示，检查订阅状态')
  checkSubscriptionStatus()
})
</script>

<style scoped>
.mine-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.user-section {
  display: flex;
  align-items: center;
  padding: 40rpx;
  background-color: #fff;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #409EFF 0%, #66b1ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 30rpx;
}

.user-avatar text {
  color: #fff;
  font-size: 48rpx;
  font-weight: bold;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.user-role {
  font-size: 26rpx;
  color: #909399;
}

.menu-section {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.menu-group {
  background-color: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-icon {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  font-size: 36rpx;
}

.menu-text {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}

.menu-arrow {
  font-size: 32rpx;
  color: #c0c4cc;
}

.logout-icon {
  color: #F56C6C;
}

.logout-text {
  color: #F56C6C;
}

.subscribed-text {
  color: #67C23A;
  font-weight: bold;
}

.subscribed-arrow {
  color: #67C23A;
  font-weight: bold;
  font-size: 36rpx;
}

.debug-info {
  text-align: center;
  padding: 20rpx;
  background-color: #f0f0f0;
  border-radius: 10rpx;
  margin-top: 20rpx;
}

.debug-info text {
  font-size: 24rpx;
  color: #666;
}

.version {
  text-align: center;
  padding: 40rpx 0;
}

.version text {
  font-size: 24rpx;
  color: #c0c4cc;
}
</style>
