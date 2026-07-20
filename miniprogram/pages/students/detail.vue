<template>
  <view class="detail-container">
    <view class="info-section">
      <view class="info-header">
        <view class="student-avatar">
          <text>{{ student.name?.charAt(0) || '学' }}</text>
        </view>
        <view class="student-info">
          <text class="student-name">{{ student.name }}</text>
          <text class="student-type">{{ getPaymentTypeText(student.paymentType) }}</text>
        </view>
      </view>
      
      <view class="info-list">
        <view class="info-item">
          <text class="info-label">性别</text>
          <text class="info-value">{{ student.gender || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">生日</text>
          <text class="info-value">{{ formatDate(student.birthday) || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">身份证号</text>
          <text class="info-value">{{ student.idCard || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">联系电话</text>
          <text class="info-value">{{ student.phone || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">联系人姓名</text>
          <text class="info-value">{{ student.parentName || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">联系人电话</text>
          <text class="info-value">{{ student.parentPhone || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">课程类型</text>
          <text class="info-value">{{ student.defaultCourseTypeId?.name || '未设置' }}</text>
        </view>
        <view class="info-item" v-if="student.paymentType !== 'free'">
          <text class="info-label">课时单价</text>
          <text class="info-value text-price">¥{{ student.currentPrice || 0 }}/课时</text>
        </view>
        <view class="info-item" v-if="student.paymentType === 'prepaid'">
          <text class="info-label">剩余课时</text>
          <text class="info-value text-primary">{{ student.remainingLessons || 0 }} 课时</text>
        </view>
        <view class="info-item">
          <text class="info-label">学琴起始日期</text>
          <text class="info-value">{{ formatDate(student.pianoStartDate) || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">陪练老师</text>
          <text class="info-value">{{ getPracticeTeacherName(student) }}</text>
        </view>
      </view>
    </view>

    <view class="reward-section">
      <view class="section-header reward-header">
        <text class="section-title">成长与积分</text>
        <view v-if="rewardOverview.growthOverview?.rankScore" class="reward-rank">
          <text>成长</text>
          <view class="growth-stars">
            <view
              v-for="star in getGrowthStarUnits(rewardOverview.growthOverview)"
              :key="star.key"
              class="growth-star"
            >
              <text class="growth-star-empty">★</text>
              <text class="growth-star-fill" :style="{ width: `${star.fillPercent}%` }">★</text>
            </view>
          </view>
          <text class="reward-point-text">{{ formatPointLabelText(rewardOverview.pointBalance?.availablePoints || 0) }}</text>
        </view>
      </view>
      <view class="reward-grid">
        <view class="reward-metric">
          <text class="metric-value">{{ formatGrowthLevel(rewardOverview.growthOverview) }}</text>
          <text class="metric-label">成长等级</text>
        </view>
        <view class="reward-metric">
          <text class="metric-value">{{ rewardOverview.pointBalance?.availablePoints || 0 }}</text>
          <text class="metric-label">可用积分</text>
        </view>
      </view>
      <view class="debt-box" :class="{ active: rewardOverview.pointDebtOverview?.hasDebt }">
        <text class="debt-title">{{ formatDebtText(rewardOverview.pointDebtOverview) }}</text>
        <view v-if="rewardOverview.pointDebtOverview?.hasDebt" class="debt-list">
          <view
            v-for="event in rewardOverview.pointDebtOverview.outstandingDebtEvents || []"
            :key="event.ledgerId"
            class="debt-item"
          >
            <text class="debt-reason">{{ event.reasonLabel }}</text>
            <text class="debt-detail">{{ event.reasonDetail || event.remark || '未填写详情' }}</text>
            <text class="debt-points">欠账{{ event.outstandingContribution || event.debtIncrease }}分</text>
          </view>
        </view>
      </view>
      <view class="reward-actions">
        <button class="btn-mall" @click="goToRewardMall">积分商城</button>
        <button class="btn-adjust" v-if="canManageStudent" @click="openAdjustDialog">积分修正</button>
      </view>
      <view class="point-record-section">
        <view class="point-record-header">
          <text class="point-record-title">积分明细</text>
          <text class="point-record-count">最近{{ pointRecords.length }}条</text>
        </view>
        <view v-if="pointRecords.length === 0" class="point-record-empty">暂无积分记录</view>
        <view v-else class="point-record-list">
          <view v-for="item in pointRecords" :key="item.ledgerId" class="point-record-item">
            <view class="point-record-main">
              <view class="point-record-info">
                <text class="point-record-name">{{ item.recordTitle || formatPointBusinessType(item.businessType) }}</text>
                <text class="point-record-time">{{ formatDateTime(item.occurredAt || item.createdAt) }}</text>
              </view>
              <text class="point-record-change" :class="getPointRecordClass(item)">
                {{ formatPointChange(item.changeAmount) }}
              </text>
            </view>
            <text v-if="item.recordDetail || item.remark" class="point-record-detail">
              {{ item.recordDetail || item.remark }}
            </text>
          </view>
        </view>
      </view>
    </view>
    
    <view class="info-section" v-if="student.learningProgress">
      <view class="section-header">
        <text class="section-title">学习进度</text>
      </view>
      <view class="section-content">
        <text>{{ student.learningProgress }}</text>
      </view>
    </view>
    
    <view class="info-section" v-if="student.learningPlan">
      <view class="section-header">
        <text class="section-title">学习计划</text>
      </view>
      <view class="section-content">
        <text>{{ student.learningPlan }}</text>
      </view>
    </view>
    
    <view class="info-section" v-if="student.notes">
      <view class="section-header">
        <text class="section-title">备注</text>
      </view>
      <view class="section-content">
        <text>{{ student.notes }}</text>
      </view>
    </view>
    
    <view class="price-history-section" v-if="priceHistory.length > 0">
      <view class="section-header">
        <text class="section-title">价格变更历史</text>
      </view>
      <view class="price-timeline">
        <view v-for="(item, index) in priceHistory" :key="item._id" class="timeline-item">
          <view class="timeline-dot" :class="{ 'is-latest': index === 0 }"></view>
          <view class="timeline-content">
            <view class="timeline-price">
              <text class="price-value">¥{{ item.price }}</text>
              <text class="price-unit">/课时</text>
              <text v-if="index === 0" class="current-tag">当前</text>
            </view>
            <text class="timeline-date">
              {{ formatDate(item.effectiveDate) }}
              <text v-if="item.expireDate"> - {{ formatDate(item.expireDate) }}</text>
            </text>
            <text class="timeline-course" v-if="item.courseTypeId?.name">
              {{ item.courseTypeId.name }}
            </text>
          </view>
        </view>
      </view>
    </view>
    
    <view class="action-section">
      <button class="btn-guardian" v-if="canManageStudent" @click="handleCreateGuardianInvite">学生端绑定码</button>
      <button class="btn-edit" v-if="canEditStudent" @click="handleEdit">{{ canManageStudent ? '编辑学生' : '编辑账户' }}</button>
      <button class="btn-delete" v-if="canManageStudent" @click="handleDelete">删除学生</button>
    </view>

    <view class="dialog-mask" v-if="adjustDialogVisible" @click="closeAdjustDialog">
      <view class="adjust-dialog" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">积分修正</text>
          <text class="dialog-close" @click="closeAdjustDialog">×</text>
        </view>
        <view class="dialog-body">
          <view class="form-item">
            <text class="form-label">调整积分</text>
            <input class="form-input" v-model="adjustForm.changeAmount" placeholder="例如 -10 或 20" />
          </view>
          <view class="form-item">
            <text class="form-label">修正原因</text>
            <textarea class="form-textarea" v-model="adjustForm.reason" placeholder="必须填写原因，欠账会按原因展示" />
          </view>
        </view>
        <view class="dialog-footer">
          <button class="btn-cancel" @click="closeAdjustDialog" :disabled="adjustSaving">取消</button>
          <button class="btn-submit-adjust" @click="submitPointAdjustment" :loading="adjustSaving" :disabled="adjustSaving">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, post, del } from '@/utils/request'
import { getPaymentTypeText } from '@/utils/paymentType'
import { formatDebtText, formatGrowthLevel, formatPointLabelText, getGrowthStarUnits } from '@/utils/reward'

const student = ref({})
const studentId = ref('')
const priceHistory = ref([])
const rewardOverview = ref({})
const pointRecords = ref([])
const adjustDialogVisible = ref(false)
const adjustSaving = ref(false)
const adjustForm = ref({
  changeAmount: '',
  reason: ''
})
const canEditStudent = computed(() => Boolean(student.value?._id))
const canManageStudent = computed(() => student.value.studentRelationType !== 'practice')

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  studentId.value = currentPage.options?.id || ''
  if (studentId.value) {
    fetchStudent()
    fetchPriceHistory()
    fetchRewardOverview()
    fetchPointRecords()
  }
})

onShow(() => {
  if (studentId.value) {
    fetchStudent()
    fetchPriceHistory()
    fetchRewardOverview()
    fetchPointRecords()
  }
})

const fetchStudent = async () => {
  try {
    const res = await get(`/students/${studentId.value}`)
    student.value = res.data || {}
  } catch (error) {
    uni.showToast({ title: '获取学生信息失败', icon: 'none' })
  }
}

const fetchPriceHistory = async () => {
  try {
    const res = await get(`/students/${studentId.value}/price-history`)
    priceHistory.value = res.data || []
  } catch (error) {
    console.error('获取价格历史失败', error)
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const fetchRewardOverview = async () => {
  try {
    const res = await get(`/students/${studentId.value}/reward-overview`)
    rewardOverview.value = res.data || {}
  } catch (error) {
    console.error('获取成长积分失败', error)
  }
}

const fetchPointRecords = async () => {
  try {
    const res = await get(`/students/${studentId.value}/point-records`, { limit: 20 })
    pointRecords.value = res.data?.items || []
  } catch (error) {
    console.error('获取积分明细失败', error)
  }
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const dateText = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const timeText = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return `${dateText} ${timeText}`
}

const formatPointChange = (value) => {
  const amount = Number(value) || 0
  return `${amount > 0 ? '+' : ''}${amount}积分`
}

const getPointRecordClass = (item) => {
  return (Number(item?.changeAmount) || 0) >= 0 ? 'income' : 'expense'
}

const formatPointBusinessType = (businessType) => {
  const map = {
    lesson_reward: '上课奖励',
    practice_reward: '练琴奖励',
    manual_adjust: '人工调整',
    reward_redeem: '礼物兑换',
    reward_refund: '兑换退回',
    settlement_void: '奖励作废'
  }
  return map[businessType] || '积分记录'
}

const getPracticeTeacherName = (student) => {
  return student.practiceTeacherId?.name || student.practiceTeacher || '未设置'
}

const handleEdit = () => {
  uni.navigateTo({
    url: `/pages/students/edit?id=${studentId.value}`
  })
}

const goToRewardMall = () => {
  uni.navigateTo({
    url: `/pages/rewards/mall?studentId=${studentId.value}`
  })
}

const openAdjustDialog = () => {
  adjustForm.value = {
    changeAmount: '',
    reason: ''
  }
  adjustDialogVisible.value = true
}

const closeAdjustDialog = () => {
  if (adjustSaving.value) return
  adjustDialogVisible.value = false
}

const submitPointAdjustment = async () => {
  const changeAmount = Number(adjustForm.value.changeAmount)
  const reason = adjustForm.value.reason.trim()

  if (!Number.isFinite(changeAmount) || changeAmount === 0) {
    uni.showToast({ title: '请输入非0积分', icon: 'none' })
    return
  }

  if (!reason) {
    uni.showToast({ title: '请填写修正原因', icon: 'none' })
    return
  }

  adjustSaving.value = true
  try {
    await post(`/students/${studentId.value}/point-adjustments`, {
      changeAmount,
      reason
    })
    uni.showToast({ title: '修正成功', icon: 'success' })
    adjustDialogVisible.value = false
    fetchRewardOverview()
    fetchPointRecords()
  } catch (error) {
    uni.showToast({ title: error.message || '修正失败', icon: 'none' })
  } finally {
    adjustSaving.value = false
  }
}

const handleCreateGuardianInvite = async () => {
  try {
    const res = await post('/guardian/invites', { studentId: studentId.value })
    const invite = res.data || {}

    uni.setClipboardData({
      data: invite.token,
      success: () => {
        uni.showModal({
          title: '学生端绑定码',
          content: `绑定码已复制：${invite.token}\n学生端路径：${invite.path}`,
          showCancel: false
        })
      }
    })
  } catch (error) {
    uni.showToast({ title: error.message || '生成失败', icon: 'none' })
  }
}

const handleDelete = () => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除学生"${student.value.name}"吗？`,
    confirmColor: '#A0523E',
    success: async (res) => {
      if (res.confirm) {
        try {
          await del(`/students/${studentId.value}`)
          uni.showToast({ title: '删除成功', icon: 'success' })
          setTimeout(() => {
            uni.navigateBack()
          }, 1000)
        } catch (error) {
          uni.showToast({ title: error.message || '删除失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style scoped>
.detail-container {
  padding: 20rpx;
  background-color: #F7EFE3;
  min-height: 100vh;
}

.info-section {
  background-color: #FFFDF8;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.reward-section {
  background-color: #FFFDF8;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.reward-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reward-rank {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 24rpx;
  color: #5F724C;
  font-weight: bold;
}

.growth-stars {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2rpx;
  max-width: 260rpx;
}

.growth-star {
  position: relative;
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}

.growth-star-empty,
.growth-star-fill {
  position: absolute;
  left: 0;
  top: 0;
  display: block;
  font-size: 24rpx;
  line-height: 24rpx;
}

.growth-star-empty {
  color: #E3D2B8;
}

.growth-star-fill {
  color: #D59A24;
  overflow: hidden;
  white-space: nowrap;
}

.reward-point-text {
  color: #5F724C;
}

.reward-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-bottom: 18rpx;
}

.reward-metric {
  min-height: 112rpx;
  padding: 18rpx;
  border-radius: 12rpx;
  background-color: #FBF6EE;
  box-sizing: border-box;
}

.metric-value {
  display: block;
  font-size: 32rpx;
  line-height: 40rpx;
  font-weight: bold;
  color: #3F352B;
  margin-bottom: 8rpx;
}

.metric-label {
  font-size: 22rpx;
  color: #8B8176;
}

.debt-box {
  padding: 18rpx;
  border-radius: 12rpx;
  background-color: #E7EFE3;
  margin-bottom: 18rpx;
}

.debt-box.active {
  background-color: #F8E4DD;
}

.debt-title {
  display: block;
  font-size: 26rpx;
  font-weight: bold;
  color: #5F724C;
}

.debt-box.active .debt-title {
  color: #A0523E;
}

.debt-list {
  margin-top: 14rpx;
}

.debt-item {
  padding: 14rpx 0;
  border-top: 1rpx solid rgba(160, 82, 62, 0.18);
}

.debt-reason,
.debt-detail,
.debt-points {
  display: block;
}

.debt-reason {
  font-size: 24rpx;
  color: #3F352B;
  font-weight: bold;
  margin-bottom: 4rpx;
}

.debt-detail {
  font-size: 22rpx;
  color: #6F6254;
  line-height: 32rpx;
}

.debt-points {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #A0523E;
}

.reward-actions {
  display: flex;
  gap: 16rpx;
}

.btn-mall,
.btn-adjust {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.btn-mall {
  background-color: #5F724C;
  color: #FFFDF8;
  border: none;
}

.btn-adjust {
  background-color: #FFFDF8;
  color: #A26B39;
  border: 2rpx solid #A26B39;
}

.point-record-section {
  margin-top: 22rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #E7D8C7;
}

.point-record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
}

.point-record-title {
  font-size: 28rpx;
  color: #3F352B;
  font-weight: bold;
}

.point-record-count {
  font-size: 22rpx;
  color: #8B8176;
}

.point-record-empty {
  padding: 20rpx 0 4rpx;
  font-size: 24rpx;
  color: #8B8176;
  text-align: center;
}

.point-record-list {
  display: flex;
  flex-direction: column;
}

.point-record-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid rgba(231, 216, 199, 0.72);
}

.point-record-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.point-record-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.point-record-info {
  flex: 1;
  min-width: 0;
}

.point-record-name,
.point-record-time,
.point-record-detail {
  display: block;
}

.point-record-name {
  font-size: 25rpx;
  color: #3F352B;
  font-weight: bold;
  line-height: 34rpx;
}

.point-record-time {
  margin-top: 4rpx;
  font-size: 21rpx;
  color: #8B8176;
}

.point-record-change {
  flex-shrink: 0;
  min-width: 96rpx;
  text-align: right;
  font-size: 28rpx;
  line-height: 34rpx;
  font-weight: bold;
}

.point-record-change.income {
  color: #5F724C;
}

.point-record-change.expense {
  color: #A0523E;
}

.point-record-detail {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #6F6254;
  line-height: 32rpx;
}

.info-header {
  display: flex;
  align-items: center;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 24rpx;
}

.student-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: #5F724C;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.student-avatar text {
  color: #FFFDF8;
  font-size: 40rpx;
  font-weight: bold;
}

.student-name {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #3F352B;
  margin-bottom: 8rpx;
}

.student-type {
  font-size: 24rpx;
  color: #8B8176;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
}

.info-label {
  font-size: 28rpx;
  color: #8B8176;
}

.info-value {
  font-size: 28rpx;
  color: #3F352B;
}

.text-primary {
  color: #5F724C;
  font-weight: bold;
}

.text-price {
  color: #A26B39;
  font-weight: bold;
}

.section-header {
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #3F352B;
}

.section-content {
  font-size: 28rpx;
  color: #6F6254;
  line-height: 1.6;
}

.price-history-section {
  background-color: #FFFDF8;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.price-timeline {
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  position: relative;
  padding-bottom: 24rpx;
  padding-left: 32rpx;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: 8rpx;
  top: 24rpx;
  bottom: 0;
  width: 2rpx;
  background-color: #E7D8C7;
}

.timeline-item:last-child::before {
  display: none;
}

.timeline-dot {
  position: absolute;
  left: 0;
  top: 8rpx;
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background-color: #dcdfe6;
}

.timeline-dot.is-latest {
  background-color: #5F724C;
}

.timeline-content {
  flex: 1;
}

.timeline-price {
  display: flex;
  align-items: center;
  margin-bottom: 6rpx;
}

.price-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #3F352B;
}

.price-unit {
  font-size: 24rpx;
  color: #8B8176;
  margin-left: 4rpx;
}

.current-tag {
  font-size: 20rpx;
  color: #FFFDF8;
  background-color: #5F724C;
  padding: 2rpx 10rpx;
  border-radius: 4rpx;
  margin-left: 12rpx;
}

.timeline-date {
  display: block;
  font-size: 24rpx;
  color: #8B8176;
  margin-bottom: 4rpx;
}

.timeline-course {
  display: block;
  font-size: 22rpx;
  color: #C4AA84;
}

.action-section {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  padding: 20rpx 0;
}

.btn-guardian {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #E7EFE3;
  color: #5F724C;
  border: 2rpx solid #5F724C;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-edit {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #5F724C;
  color: #FFFDF8;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-delete {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #FFFDF8;
  color: #A0523E;
  border: 2rpx solid #A0523E;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.dialog-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(63, 53, 43, 0.42);
}

.adjust-dialog {
  width: 86%;
  background-color: #FFFDF8;
  border-radius: 18rpx;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 26rpx;
  border-bottom: 1rpx solid #E7D8C7;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #3F352B;
}

.dialog-close {
  font-size: 38rpx;
  color: #8B8176;
}

.dialog-body {
  padding: 26rpx;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #3F352B;
  margin-bottom: 10rpx;
}

.form-input {
  width: 100%;
  height: 76rpx;
  padding: 0 18rpx;
  border: 2rpx solid #E7D8C7;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  height: 150rpx;
  padding: 18rpx;
  border: 2rpx solid #E7D8C7;
  border-radius: 8rpx;
  font-size: 26rpx;
  line-height: 38rpx;
  box-sizing: border-box;
}

.dialog-footer {
  display: flex;
  gap: 18rpx;
  padding: 20rpx 26rpx 26rpx;
}

.btn-cancel,
.btn-submit-adjust {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.btn-submit-adjust {
  background-color: #5F724C;
  color: #FFFDF8;
  border: none;
}
</style>
