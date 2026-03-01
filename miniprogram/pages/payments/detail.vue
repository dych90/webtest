<template>
  <view class="detail-container">
    <view class="info-section">
      <view class="info-header">
        <text class="student-name">{{ payment.studentId?.name || '未知学生' }}</text>
        <text class="payment-amount">¥{{ payment.amount }}</text>
      </view>
      
      <view class="info-list">
        <view class="info-item">
          <text class="info-label">缴费类型</text>
          <text class="info-value">{{ payment.paymentType || '未设置' }}</text>
        </view>
        <view class="info-item" v-if="payment.totalLessons">
          <text class="info-label">预交课时</text>
          <text class="info-value">{{ payment.totalLessons }} 课时</text>
        </view>
        <view class="info-item" v-if="payment.bonusLessons">
          <text class="info-label">赠送课时</text>
          <text class="info-value text-success">{{ payment.bonusLessons }} 课时</text>
        </view>
        <view class="info-item">
          <text class="info-label">缴费日期</text>
          <text class="info-value">{{ formatDate(payment.paymentDate) }}</text>
        </view>
        <view class="info-item" v-if="payment.notes">
          <text class="info-label">备注</text>
          <text class="info-value">{{ payment.notes }}</text>
        </view>
      </view>
    </view>
    
    <view class="action-section">
      <button class="btn-edit" @click="handleEdit">编辑</button>
      <button class="btn-delete" @click="handleDelete">删除</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, del } from '@/utils/request'

const payment = ref({})
const paymentId = ref('')

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  paymentId.value = currentPage.options?.id || ''
  if (paymentId.value) {
    fetchPayment()
  }
})

onShow(() => {
  if (paymentId.value) {
    fetchPayment()
  }
})

const fetchPayment = async () => {
  try {
    const res = await get(`/payments/${paymentId.value}`)
    payment.value = res.data || {}
  } catch (error) {
    uni.showToast({ title: '获取缴费信息失败', icon: 'none' })
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const handleEdit = () => {
  uni.navigateTo({
    url: `/pages/payments/edit?id=${paymentId.value}`
  })
}

const handleDelete = () => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条缴费记录吗？',
    confirmColor: '#F56C6C',
    success: async (res) => {
      if (res.confirm) {
        try {
          await del(`/payments/${paymentId.value}`)
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
  background-color: #f8f8f8;
  min-height: 100vh;
}

.info-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 24rpx;
}

.student-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.payment-amount {
  font-size: 40rpx;
  font-weight: bold;
  color: #F56C6C;
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
  color: #909399;
}

.info-value {
  font-size: 28rpx;
  color: #333;
}

.text-success {
  color: #67C23A;
}

.action-section {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 0;
}

.btn-edit {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #409EFF;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-delete {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #fff;
  color: #F56C6C;
  border: 2rpx solid #F56C6C;
  border-radius: 8rpx;
  font-size: 28rpx;
}
</style>
