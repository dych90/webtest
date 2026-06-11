<template>
  <view class="guardian-page">
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
          </view>
          <view class="student-actions">
            <text class="student-balance">{{ student.remainingLessons || 0 }}课时</text>
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
      <button class="logout-btn" @click="handleLogout">退出学生端</button>
    </view>

    <view class="guardian-tabbar">
      <view class="tab" @click="goHome">首页</view>
      <view class="tab" @click="goSchedule">课表</view>
      <view class="tab" @click="goRecords">记录</view>
      <view class="tab active">我的</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, del } from '@/utils/request'
import { clearGuardianSession, getSelectedGuardianStudentId, requestGuardianSubscription, saveGuardianSession } from '@/utils/guardian'

const students = ref([])
const selectedStudentId = ref('')
const subscribing = ref(false)

onShow(() => {
  fetchStudents()
})

const fetchStudents = async () => {
  try {
    const res = await get('/guardian/students')
    students.value = res.data || []
    saveGuardianSession({
      token: uni.getStorageSync('token'),
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

const handleUnbind = (student) => {
  uni.showModal({
    title: '解除绑定',
    content: `确定从学生端删除“${student.name}”吗？不会删除学生资料和课程记录。`,
    confirmText: '解除',
    confirmColor: '#F56C6C',
    success: async (res) => {
      if (!res.confirm) return

      try {
        const result = await del(`/guardian/students/${student._id}/binding`)
        const session = result.data || {
          token: uni.getStorageSync('token'),
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
      uni.reLaunch({ url: '/pages/guardian/login' })
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
  background-color: #f6f7fb;
}

.profile-card,
.card {
  background-color: #fff;
  border-radius: 8rpx;
  padding: 24rpx;
  margin-bottom: 18rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 45, 61, 0.05);
}

.profile-title {
  display: block;
  font-size: 38rpx;
  font-weight: bold;
  color: #303133;
}

.profile-desc,
.tip {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  color: #909399;
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
  color: #303133;
}

.card-count {
  font-size: 24rpx;
  color: #409EFF;
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
  border-bottom: 1rpx solid #f0f0f0;
}

.student-main {
  min-width: 0;
  flex: 1;
}

.student-row:last-child {
  border-bottom: none;
}

.student-row.active .student-name {
  color: #409EFF;
}

.student-name {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #303133;
}

.teacher-name {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #909399;
}

.student-balance {
  font-size: 24rpx;
  color: #409EFF;
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
  border: 1rpx solid #F56C6C;
  background-color: #fff;
  color: #F56C6C;
  font-size: 24rpx;
}

.primary-btn,
.logout-btn {
  height: 82rpx;
  line-height: 82rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.primary-btn {
  color: #fff;
  background-color: #409EFF;
}

.logout-btn {
  color: #F56C6C;
  background-color: #fff;
  border: 1rpx solid #F56C6C;
}

.empty {
  padding: 40rpx 0;
  text-align: center;
  color: #909399;
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
  background-color: #fff;
  border-top: 1rpx solid #ebeef5;
}

.tab {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: #909399;
}

.tab.active {
  color: #409EFF;
  font-weight: bold;
}
</style>
