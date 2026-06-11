<template>
  <view class="guardian-page">
    <view class="top-card">
      <picker :range="students" range-key="name" :value="studentIndex" @change="onStudentChange">
        <view class="student-picker">
          <text class="student-name">{{ currentStudent?.name || '选择学生' }}</text>
          <text class="switch-text">切换</text>
        </view>
      </picker>

      <view class="balance-row">
        <text class="balance-label">剩余课时</text>
        <text class="balance-value">{{ getBalanceText() }}</text>
      </view>
    </view>

    <view class="tabs">
      <view class="tab-item" :class="{ active: activeTab === 'lessons' }" @click="activeTab = 'lessons'">
        消课记录
      </view>
      <view class="tab-item" :class="{ active: activeTab === 'payments' }" @click="activeTab = 'payments'">
        缴费记录
      </view>
    </view>

    <scroll-view scroll-y class="record-scroll">
      <view v-if="activeTab === 'lessons'">
        <view v-if="lessonRecords.length === 0" class="empty">暂无消课记录</view>
        <view v-else class="record-card" v-for="record in lessonRecords" :key="record._id">
          <view class="record-main">
            <text class="record-title">{{ record.courseTypeId?.name || '消课记录' }}</text>
            <text class="record-date">{{ formatDate(record.recordDate) }}</text>
          </view>
          <view class="record-side">
            <text class="record-value">{{ record.lessonsConsumed }}课时</text>
            <text class="record-tag" :class="{ active: record.isDeducted }">
              {{ record.isDeducted ? '已扣课' : '未扣课' }}
            </text>
          </view>
          <text v-if="record.lessonContent" class="record-content">{{ record.lessonContent }}</text>
        </view>
      </view>

      <view v-else>
        <view v-if="payments.length === 0" class="empty">暂无缴费记录</view>
        <view v-else class="record-card" v-for="payment in payments" :key="payment._id">
          <view class="record-main">
            <text class="record-title">{{ getPaymentTypeText(payment.paymentType) }}</text>
            <text class="record-date">{{ formatDate(payment.paymentDate) }}</text>
          </view>
          <view class="record-side">
            <text class="money">¥{{ payment.amount || 0 }}</text>
            <text class="record-tag">{{ payment.totalLessons || 0 }}课时</text>
          </view>
          <text class="record-content">
            赠课 {{ payment.bonusLessons || 0 }} 节，单价 ¥{{ payment.unitPrice || 0 }}
          </text>
        </view>
      </view>
    </scroll-view>

    <view class="guardian-tabbar">
      <view class="tab" @click="goHome">首页</view>
      <view class="tab" @click="goSchedule">课表</view>
      <view class="tab active">记录</view>
      <view class="tab" @click="goMine">我的</view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get } from '@/utils/request'
import { getSelectedGuardianStudentId, saveGuardianSession } from '@/utils/guardian'

const students = ref([])
const selectedStudentId = ref('')
const balance = ref({})
const lessonRecords = ref([])
const payments = ref([])
const activeTab = ref('lessons')

const studentIndex = computed(() => {
  return Math.max(0, students.value.findIndex(student => student._id === selectedStudentId.value))
})

const currentStudent = computed(() => {
  return students.value.find(student => student._id === selectedStudentId.value) || students.value[0]
})

const getBalanceText = () => {
  if (currentStudent.value?.paymentType === 'free') {
    return '免费'
  }

  return balance.value.remainingLessons || 0
}

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

    if (selectedStudentId.value) {
      fetchAll()
    }
  } catch (error) {
    uni.showToast({ title: error.message || '获取学生失败', icon: 'none' })
  }
}

const fetchAll = async () => {
  try {
    const [balanceRes, lessonRes, paymentRes] = await Promise.all([
      get(`/guardian/students/${selectedStudentId.value}/balance`),
      get(`/guardian/students/${selectedStudentId.value}/lesson-records`),
      get(`/guardian/students/${selectedStudentId.value}/payments`)
    ])
    balance.value = balanceRes.data || {}
    lessonRecords.value = lessonRes.data || []
    payments.value = paymentRes.data || []
  } catch (error) {
    uni.showToast({ title: error.message || '获取记录失败', icon: 'none' })
  }
}

const onStudentChange = (event) => {
  const student = students.value[event.detail.value]
  if (!student) return

  selectedStudentId.value = student._id
  uni.setStorageSync('selectedGuardianStudentId', student._id)
  fetchAll()
}

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const getPaymentTypeText = (type) => {
  const map = {
    prepaid: '预付费缴费',
    payPerLesson: '单次课缴费'
  }
  return map[type] || '缴费记录'
}

const goHome = () => {
  uni.navigateTo({ url: '/pages/guardian/home' })
}

const goSchedule = () => {
  uni.navigateTo({ url: '/pages/guardian/schedule' })
}

const goMine = () => {
  uni.navigateTo({ url: '/pages/guardian/mine' })
}
</script>

<style scoped>
.guardian-page {
  min-height: 100vh;
  padding: 20rpx 20rpx 120rpx;
  box-sizing: border-box;
  background-color: #f6f7fb;
}

.top-card,
.record-card {
  background-color: #fff;
  border-radius: 8rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 45, 61, 0.05);
}

.top-card {
  margin-bottom: 18rpx;
  overflow: hidden;
}

.student-picker {
  min-height: 86rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid #ebeef5;
}

.student-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #303133;
}

.switch-text {
  font-size: 24rpx;
  color: #409EFF;
}

.balance-row {
  height: 92rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.balance-label {
  font-size: 26rpx;
  color: #606266;
}

.balance-value {
  font-size: 42rpx;
  line-height: 48rpx;
  font-weight: bold;
  color: #409EFF;
}

.tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
  margin-bottom: 18rpx;
}

.tab-item {
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  border-radius: 8rpx;
  background-color: #fff;
  color: #606266;
  font-size: 26rpx;
}

.tab-item.active {
  background-color: #409EFF;
  color: #fff;
  font-weight: bold;
}

.record-scroll {
  height: calc(100vh - 330rpx);
}

.record-card {
  padding: 22rpx;
  margin-bottom: 16rpx;
}

.record-main {
  min-width: 0;
}

.record-title {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #303133;
}

.record-date {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #909399;
}

.record-side {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.record-value,
.money {
  font-size: 32rpx;
  font-weight: bold;
  color: #409EFF;
}

.money {
  color: #E6A23C;
}

.record-tag {
  font-size: 22rpx;
  color: #909399;
}

.record-tag.active {
  color: #67C23A;
}

.record-content {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  color: #606266;
}

.empty {
  padding: 90rpx 0;
  text-align: center;
  color: #909399;
  font-size: 28rpx;
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
