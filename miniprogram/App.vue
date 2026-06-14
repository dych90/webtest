<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore } from './stores/user'
import { applyTheme } from './utils/theme'

onLaunch(() => {
  console.log('App Launch')
  applyTheme()
  
  const userStore = useUserStore()
  userStore.initFromStorage()
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
  --theme-bg: #F7EFE3;
  --theme-bg-soft: #FBF6EE;
  --theme-card: #FFFDF8;
  --theme-primary: #5F724C;
  --theme-primary-pressed: #4E6040;
  --theme-primary-soft: #E7EFE3;
  --theme-accent: #B8793E;
  --theme-accent-soft: #F3EBDD;
  --theme-text: #3F352B;
  --theme-muted: #8B8176;
  --theme-border: #E7D8C7;
  --theme-danger: #A0523E;
  --theme-danger-soft: #F8E4DD;
  --theme-success: #5F724C;
  --theme-success-soft: #EAF1E3;
  --theme-warning: #A26B39;
  --theme-warning-soft: #F6E8C9;
  --theme-shadow: rgba(92, 67, 39, 0.08);
  --theme-card-shadow: 10rpx 12rpx 0 rgba(112, 95, 66, 0.1);
  --theme-page-bg: linear-gradient(180deg, #FBF6EE 0%, #F7EFE3 100%);
  --theme-home-bg: linear-gradient(180deg, #FBF6EE 0%, #F7EFE3 48%, #F1E3D0 100%);
  --theme-header-bg: linear-gradient(135deg, #FFF7EA 0%, #F1DEC3 100%);
  --theme-header-padding: 22rpx 24rpx;
  --theme-header-radius: 22rpx;
  --theme-header-shadow: 0 10rpx 28rpx rgba(92, 67, 39, 0.08);
  --theme-card-radius: 22rpx;
  --theme-guardian-card-radius: 20rpx;
  --theme-mine-card-radius: 20rpx;
  --theme-tab-radius: 18rpx;
  --theme-search-radius: 18rpx;
  --theme-card-border: 3rpx solid rgba(85, 68, 53, 0.18);
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
  --theme-bg: #F7EFE3;
  --theme-bg-soft: #FBF6EE;
  --theme-card: #FFFDF8;
  --theme-primary: #B8793E;
  --theme-primary-pressed: #9F6532;
  --theme-primary-soft: #F3DDC2;
  --theme-accent: #5F724C;
  --theme-accent-soft: #E7EFE3;
  --theme-text: #3F352B;
  --theme-muted: #8B8176;
  --theme-border: #E7D8C7;
  --theme-danger: #A0523E;
  --theme-danger-soft: #F8E4DD;
  --theme-success: #5F724C;
  --theme-success-soft: #EAF1E3;
  --theme-warning: #A26B39;
  --theme-warning-soft: #F6E8C9;
  --theme-shadow: rgba(92, 67, 39, 0.08);
  --theme-card-shadow: 10rpx 12rpx 0 rgba(112, 95, 66, 0.1);
  --theme-page-bg: linear-gradient(180deg, #FBF6EE 0%, var(--theme-bg) 100%);
  --theme-home-bg: linear-gradient(180deg, #FBF6EE 0%, var(--theme-bg) 48%, #F1E3D0 100%);
  --theme-header-bg: linear-gradient(135deg, #FFF7EA 0%, #F1DEC3 100%);
  --theme-header-padding: 22rpx 24rpx;
  --theme-header-radius: 22rpx;
  --theme-header-shadow: 0 10rpx 28rpx rgba(92, 67, 39, 0.08);
  --theme-card-radius: 22rpx;
  --theme-guardian-card-radius: 20rpx;
  --theme-mine-card-radius: 20rpx;
  --theme-tab-radius: 18rpx;
  --theme-search-radius: 18rpx;
  --theme-card-border: 3rpx solid rgba(85, 68, 53, 0.18);
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
  color: #FFFDF8;
  border: none;
  border-radius: 8rpx;
  padding: 20rpx 40rpx;
  font-size: 28rpx;
}

.btn-primary:active {
  background-color: var(--theme-primary-pressed);
}

[class$="-container"],
[class*="-container "],
.guardian-page {
  background: var(--theme-page-bg) !important;
  color: var(--theme-text);
}

.guardian-page {
  position: relative;
  overflow-x: hidden;
}

.guardian-music-hero {
  position: relative;
  min-height: 186rpx;
  padding: 28rpx 26rpx;
  margin-bottom: 22rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  overflow: hidden;
  box-sizing: border-box;
  background:
    linear-gradient(90deg, rgba(255, 253, 248, 0.96) 0%, rgba(250, 244, 235, 0.9) 48%, rgba(241, 224, 197, 0.94) 100%);
  border: var(--theme-card-border);
  border-radius: 30rpx;
  box-shadow: var(--theme-card-shadow);
}

.guardian-music-hero::before {
  content: "";
  position: absolute;
  left: -28rpx;
  right: -18rpx;
  bottom: 28rpx;
  height: 58rpx;
  opacity: 0.34;
  background:
    linear-gradient(to bottom, rgba(95, 114, 76, 0.22) 0, rgba(95, 114, 76, 0.22) 2rpx, transparent 2rpx, transparent 12rpx),
    linear-gradient(to bottom, rgba(95, 114, 76, 0.14) 0, rgba(95, 114, 76, 0.14) 2rpx, transparent 2rpx, transparent 12rpx);
  background-size: 100% 12rpx, 100% 12rpx;
  transform: rotate(-4deg);
  transform-origin: center;
  pointer-events: none;
}

.guardian-music-hero::after {
  content: "";
  position: absolute;
  right: -28rpx;
  bottom: -34rpx;
  width: 220rpx;
  height: 104rpx;
  border: 5rpx solid rgba(184, 121, 62, 0.18);
  border-radius: 50%;
  transform: rotate(-10deg);
  pointer-events: none;
}

.guardian-hero-copy {
  position: relative;
  z-index: 2;
  min-width: 0;
  flex: 1;
}

.guardian-hero-kicker {
  display: block;
  margin-bottom: 8rpx;
  font-size: 20rpx;
  line-height: 26rpx;
  color: var(--theme-accent);
}

.guardian-hero-title {
  display: block;
  font-size: 38rpx;
  line-height: 48rpx;
  font-weight: 700;
  color: var(--theme-text);
}

.guardian-hero-subtitle {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  color: var(--theme-muted);
}

.guardian-hero-art {
  position: relative;
  z-index: 2;
  width: 188rpx;
  height: 144rpx;
  flex-shrink: 0;
}

.guardian-staff-line {
  position: absolute;
  left: 12rpx;
  right: 0;
  height: 2rpx;
  background-color: rgba(95, 114, 76, 0.25);
  transform: rotate(-12deg);
  transform-origin: right center;
}

.guardian-staff-line::before,
.guardian-staff-line::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 2rpx;
  background-color: rgba(95, 114, 76, 0.2);
}

.guardian-staff-line::before {
  top: 12rpx;
}

.guardian-staff-line::after {
  top: 24rpx;
}

.guardian-staff-line.line-one {
  top: 32rpx;
}

.guardian-staff-line.line-two {
  top: 52rpx;
  opacity: 0.72;
}

.guardian-staff-line.line-three {
  top: 72rpx;
  opacity: 0.46;
}

.guardian-hero-piano {
  position: absolute;
  right: 8rpx;
  bottom: 0;
  width: 152rpx;
  height: 112rpx;
  z-index: 2;
  opacity: 0.94;
}

.guardian-note {
  position: absolute;
  z-index: 3;
  font-size: 30rpx;
  line-height: 1;
  color: rgba(184, 121, 62, 0.72);
  pointer-events: none;
}

.guardian-note.note-one {
  left: 4rpx;
  top: 8rpx;
  transform: rotate(-8deg);
}

.guardian-note.note-two {
  right: 0;
  top: 18rpx;
  color: rgba(95, 114, 76, 0.7);
  transform: rotate(12deg);
}

.guardian-note.note-three {
  left: 22rpx;
  bottom: 12rpx;
  font-size: 24rpx;
  color: rgba(63, 53, 43, 0.38);
}

.guardian-page .guardian-tabbar {
  height: 112rpx !important;
  padding: 8rpx 18rpx 10rpx !important;
  box-sizing: border-box;
  background-color: rgba(255, 253, 248, 0.96) !important;
  border-top: 2rpx solid rgba(85, 68, 53, 0.18) !important;
  box-shadow: 0 -10rpx 26rpx rgba(92, 67, 39, 0.08);
}

.guardian-page .guardian-tabbar .tab {
  min-width: 0;
  flex-direction: column !important;
  gap: 4rpx;
  font-size: 22rpx !important;
  line-height: 28rpx;
}

.guardian-tab-icon {
  width: 42rpx;
  height: 42rpx;
  display: block;
  flex-shrink: 0;
}

.guardian-tab-label {
  display: block;
  max-width: 100%;
  font-size: 22rpx;
  line-height: 28rpx;
  color: var(--theme-muted);
}

.guardian-page .guardian-tabbar .tab.active .guardian-tab-label {
  color: var(--theme-primary);
  font-weight: 700;
}

.card,
.user-section,
.menu-group,
.student-item,
.course-item,
.payment-item,
.lesson-item,
.record-item,
.type-item,
.standard-item,
.balance-card,
.summary-card,
.stat-card,
.info-card,
.detail-card,
.form-section,
.info-section,
.month-view,
.year-month-card,
.dialog-content,
.modal-content,
.popup-content,
.menu-content {
  background-color: var(--theme-card) !important;
  border: var(--theme-card-border) !important;
  border-radius: var(--theme-card-radius) !important;
  box-shadow: var(--theme-card-shadow) !important;
  box-sizing: border-box;
}

.search-input,
.form-input,
.content-input,
.form-picker,
.picker-view,
.textarea,
input,
textarea {
  background-color: rgba(255, 253, 248, 0.82) !important;
  border: 2rpx solid rgba(85, 68, 53, 0.24) !important;
  border-radius: var(--theme-search-radius) !important;
  color: var(--theme-text) !important;
  box-sizing: border-box;
}

.view-tabs,
.tab-bar,
.tabs,
.filter-tabs {
  background-color: transparent !important;
}

.tab-item,
.filter-item,
.type-tab {
  background-color: var(--theme-bg-soft) !important;
  color: var(--theme-muted) !important;
  border-radius: var(--theme-tab-radius) !important;
}

.tab-item.active,
.filter-item.active,
.type-tab.active,
.month-day.is-selected,
.year-day.is-today,
.week-day-header.is-selected {
  background-color: var(--theme-primary) !important;
  color: #FFFDF8 !important;
}

.nav-btn,
.today-btn,
.status-tag,
.payment-tag,
.course-count {
  border-radius: 999rpx !important;
}

.add-btn,
.btn-primary,
.btn-submit,
.submit-btn,
.save-btn,
.confirm-btn,
.primary-btn,
.btn-confirm,
.today-btn,
.btn-attend {
  background-color: var(--theme-primary) !important;
  color: #FFFDF8 !important;
  border-color: var(--theme-primary) !important;
  box-shadow: 6rpx 7rpx 0 var(--theme-shadow) !important;
}

.btn-cancel,
.cancel-btn,
.secondary-btn {
  background-color: var(--theme-card) !important;
  color: var(--theme-muted) !important;
  border: 2rpx solid var(--theme-border) !important;
}

.empty-tip {
  background-color: rgba(255, 253, 248, 0.55);
  border: 2rpx dashed rgba(85, 68, 53, 0.22);
  border-radius: var(--theme-card-radius);
  color: var(--theme-muted) !important;
}

.section-title,
.student-name,
.course-title,
.form-title,
.dialog-title,
.user-name {
  color: var(--theme-text) !important;
}

.detail-item,
.course-type,
.form-label,
.student-detail,
.date,
.version text {
  color: var(--theme-muted) !important;
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
