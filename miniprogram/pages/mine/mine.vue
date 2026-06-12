<template>
  <view class="mine-container" :class="themeClass">
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
          <text class="menu-text" :class="{ 'subscribed-text': subscribedCount > 0 }">{{ subscriptionText }}</text>
          <text class="menu-arrow" :class="{ 'subscribed-arrow': subscribedCount > 0 }">{{ subscribedCount > 0 ? subscribedCount + '个' : '›' }}</text>
        </view>
      </view>
      
      <view class="menu-group">
        <picker :value="themeIndex" :range="themeOptions" @change="onThemeChange">
          <view class="menu-item">
            <view class="menu-icon">🎨</view>
            <text class="menu-text">界面主题</text>
            <text class="menu-arrow theme-value">{{ currentThemeName }}</text>
          </view>
        </picker>
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
import { applyTheme, getThemeClass, getThemeIndex, getThemeOptions, setCurrentThemeByIndex } from '@/utils/theme'

const userStore = useUserStore()
const isSubscribed = ref(false)
const subscribedCount = ref(0)
const themeOptions = getThemeOptions()
const themeIndex = ref(getThemeIndex())
const themeClass = ref(getThemeClass())

const roleText = computed(() => {
  if (userStore.isAdmin()) return '管理员'
  if (userStore.isTeacher()) return '教师'
  return '未知角色'
})

const subscriptionText = computed(() => {
  if (subscribedCount.value > 0) {
    return '订阅/续订上课提醒'
  }
  return '订阅上课提醒'
})

const currentThemeName = computed(() => {
  return themeOptions[themeIndex.value] || themeOptions[0]
})

const refreshTheme = () => {
  themeIndex.value = getThemeIndex()
  themeClass.value = getThemeClass()
  applyTheme()
}

const onThemeChange = (event) => {
  const theme = setCurrentThemeByIndex(event.detail.value)
  themeIndex.value = getThemeIndex(theme.key)
  themeClass.value = getThemeClass(theme.key)
  uni.showToast({ title: `已切换为${theme.name}`, icon: 'none' })
}

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
    console.log('openIds数量:', res.data?.openIds?.length || 0)
    
    const openIds = res.data?.openIds || []
    const legacyOpenId = res.data?.openId
    subscribedCount.value = legacyOpenId && !openIds.includes(legacyOpenId) ? openIds.length + 1 : openIds.length
    isSubscribed.value = subscribedCount.value > 0
    
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
        await checkSubscriptionStatus()
        
        uni.hideLoading()
        uni.showToast({
          title: '订阅成功',
          icon: 'success'
        })
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
  refreshTheme()
  console.log('页面已挂载，开始检查订阅状态')
  checkSubscriptionStatus()
})

onShow(() => {
  refreshTheme()
  console.log('页面显示，检查订阅状态')
  checkSubscriptionStatus()
})
</script>

<style scoped>
.mine-container {
  padding: 20rpx;
  background: var(--theme-page-bg);
  min-height: 100vh;
}

.user-section {
  display: flex;
  align-items: center;
  padding: 40rpx;
  background-color: var(--theme-card);
  border-radius: var(--theme-mine-card-radius);
  margin-bottom: 20rpx;
  box-shadow: var(--theme-card-shadow);
  border: var(--theme-card-border);
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-pressed) 100%);
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
  color: var(--theme-text);
  margin-bottom: 8rpx;
}

.user-role {
  font-size: 26rpx;
  color: var(--theme-muted);
}

.menu-section {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.menu-group {
  background-color: var(--theme-card);
  border-radius: var(--theme-mine-card-radius);
  overflow: hidden;
  box-shadow: var(--theme-card-shadow);
  border: var(--theme-card-border);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid var(--theme-border);
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
  color: var(--theme-text);
}

.menu-arrow {
  font-size: 32rpx;
  color: var(--theme-border);
}

.logout-icon {
  color: var(--theme-danger);
}

.logout-text {
  color: var(--theme-danger);
}

.subscribed-text {
  color: var(--theme-success);
  font-weight: bold;
}

.subscribed-arrow {
  color: var(--theme-success);
  font-weight: bold;
  font-size: 36rpx;
}

.theme-value {
  color: var(--theme-primary);
  font-size: 26rpx;
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
  color: var(--theme-border);
}
</style>
