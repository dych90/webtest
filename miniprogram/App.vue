<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore } from './stores/user'
import { applyTheme } from './utils/theme'

onLaunch(() => {
  console.log('App Launch')
  applyTheme()
  
  const userStore = useUserStore()
  const token = uni.getStorageSync('token')
  if (token) {
    userStore.setToken(token)
  }
})

onShow(() => {
  console.log('App Show')
  applyTheme()
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style>
/* 全局样式 */
page {
  --theme-bg: #f8f8f8;
  --theme-bg-soft: #f5f7fa;
  --theme-card: #ffffff;
  --theme-primary: #409EFF;
  --theme-primary-pressed: #337ecc;
  --theme-primary-soft: #ecf5ff;
  --theme-accent: #9b59b6;
  --theme-accent-soft: #f4f4f5;
  --theme-text: #333333;
  --theme-muted: #909399;
  --theme-border: #dcdfe6;
  --theme-danger: #F56C6C;
  --theme-danger-soft: #fef0f0;
  --theme-success: #67C23A;
  --theme-success-soft: #f0f9eb;
  --theme-warning: #E6A23C;
  --theme-warning-soft: #fdf6ec;
  --theme-shadow: rgba(0, 0, 0, 0.05);
  --theme-card-shadow: 0 2rpx 12rpx var(--theme-shadow);
  --theme-page-bg: #f8f8f8;
  --theme-home-bg: #f8f8f8;
  --theme-header-bg: transparent;
  --theme-header-padding: 16rpx 0;
  --theme-header-radius: 0;
  --theme-header-shadow: none;
  --theme-card-radius: 16rpx;
  --theme-guardian-card-radius: 8rpx;
  --theme-mine-card-radius: 20rpx;
  --theme-tab-radius: 12rpx;
  --theme-search-radius: 12rpx;
  --theme-card-border: 0 solid transparent;
  --theme-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: var(--theme-bg);
  font-family: var(--theme-font-family);
  font-size: 14px;
  color: var(--theme-text);
}

.theme-classic {
  font-family: var(--theme-font-family);
}

.theme-dawn {
  --theme-bg: #F7F2EA;
  --theme-bg-soft: #FBF6EE;
  --theme-card: #FFFDF8;
  --theme-primary: #B8793E;
  --theme-primary-pressed: #9F6532;
  --theme-primary-soft: #F3DDC2;
  --theme-accent: #5E7C61;
  --theme-accent-soft: #E7EFE3;
  --theme-text: #2F2A24;
  --theme-muted: #8B8176;
  --theme-border: #E7D8C7;
  --theme-danger: #C95745;
  --theme-danger-soft: #F8E4DD;
  --theme-success: #6A8E5C;
  --theme-success-soft: #EAF1E3;
  --theme-warning: #C8923A;
  --theme-warning-soft: #F6E8C9;
  --theme-shadow: rgba(92, 67, 39, 0.08);
  --theme-card-shadow: 0 10rpx 28rpx var(--theme-shadow);
  --theme-page-bg: linear-gradient(180deg, #FBF6EE 0%, var(--theme-bg) 100%);
  --theme-home-bg: linear-gradient(180deg, #FBF6EE 0%, var(--theme-bg) 48%, #F1E3D0 100%);
  --theme-header-bg: linear-gradient(135deg, #FFF7EA 0%, #F1DEC3 100%);
  --theme-header-padding: 22rpx 24rpx;
  --theme-header-radius: 22rpx;
  --theme-header-shadow: 0 10rpx 28rpx rgba(92, 67, 39, 0.08);
  --theme-card-radius: 20rpx;
  --theme-guardian-card-radius: 18rpx;
  --theme-mine-card-radius: 20rpx;
  --theme-tab-radius: 18rpx;
  --theme-search-radius: 16rpx;
  --theme-card-border: 1rpx solid rgba(231, 216, 199, 0.72);
  --theme-font-family: "Noto Serif SC", "Source Han Serif SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-family: var(--theme-font-family);
}

/* 通用样式 */
.container {
  padding: 20rpx;
}

.card {
  background-color: var(--theme-card);
  border-radius: var(--theme-card-radius);
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: var(--theme-card-shadow);
}

.btn-primary {
  background-color: var(--theme-primary);
  color: #fff;
  border: none;
  border-radius: 8rpx;
  padding: 20rpx 40rpx;
  font-size: 28rpx;
}

.btn-primary:active {
  background-color: var(--theme-primary-pressed);
}

.text-primary {
  color: var(--theme-primary);
}

.text-success {
  color: var(--theme-success);
}

.text-warning {
  color: var(--theme-warning);
}

.text-danger {
  color: var(--theme-danger);
}

.text-info {
  color: var(--theme-muted);
}

/* Flex 布局 */
.flex {
  display: flex;
}

.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flex-column {
  display: flex;
  flex-direction: column;
}

/* 间距 */
.mt-10 { margin-top: 10rpx; }
.mt-20 { margin-top: 20rpx; }
.mt-30 { margin-top: 30rpx; }
.mb-10 { margin-bottom: 10rpx; }
.mb-20 { margin-bottom: 20rpx; }
.mb-30 { margin-bottom: 30rpx; }
.ml-10 { margin-left: 10rpx; }
.mr-10 { margin-right: 10rpx; }
.p-20 { padding: 20rpx; }
.p-30 { padding: 30rpx; }
</style>
