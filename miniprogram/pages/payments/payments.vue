<template>
  <view class="payments-container">
    <view v-if="payments.length === 0" class="empty-tip">
      暂无缴费记录
    </view>
    
    <view v-else class="payment-list">
      <view v-for="payment in payments" :key="payment._id" class="payment-item" @click="handleDetail(payment)">
        <view class="payment-header">
          <text class="student-name">{{ payment.studentId?.name || '未知学生' }}</text>
          <text class="payment-amount">¥{{ payment.amount }}</text>
        </view>
        <view class="payment-body">
          <view class="payment-info">
            <text class="info-label">缴费类型：</text>
            <text class="info-value">{{ payment.paymentType || '未设置' }}</text>
          </view>
          <view class="payment-info" v-if="payment.totalLessons">
            <text class="info-label">预交课时：</text>
            <text class="info-value">{{ payment.totalLessons }} 课时</text>
          </view>
          <view class="payment-info" v-if="payment.bonusLessons">
            <text class="info-label">赠送课时：</text>
            <text class="info-value text-success">{{ payment.bonusLessons }} 课时</text>
          </view>
          <view class="payment-info">
            <text class="info-label">缴费日期：</text>
            <text class="info-value">{{ formatDate(payment.paymentDate) }}</text>
          </view>
          <view class="payment-info" v-if="payment.notes">
            <text class="info-label">备注：</text>
            <text class="info-value">{{ payment.notes }}</text>
          </view>
        </view>
        <view class="payment-actions">
          <button class="btn-edit" @click.stop="handleEdit(payment)">编辑</button>
          <button class="btn-delete" @click.stop="handleDelete(payment)">删除</button>
        </view>
      </view>
    </view>
    
    <view class="add-btn" @click="handleAdd">
      <text>+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, del } from '@/utils/request'

const payments = ref([])

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const fetchPayments = async () => {
  try {
    const res = await get('/payments')
    payments.value = res.data || []
  } catch (error) {
    console.error('获取缴费记录失败', error)
  }
}

const handleAdd = () => {
  uni.navigateTo({
    url: '/pages/payments/add'
  })
}

const handleDetail = (payment) => {
  uni.navigateTo({
    url: `/pages/payments/detail?id=${payment._id}`
  })
}

const handleEdit = (payment) => {
  uni.navigateTo({
    url: `/pages/payments/edit?id=${payment._id}`
  })
}

const handleDelete = (payment) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除${payment.studentId?.name || '该学生'}的缴费记录吗？`,
    confirmColor: '#F56C6C',
    success: async (res) => {
      if (res.confirm) {
        try {
          await del(`/payments/${payment._id}`)
          uni.showToast({ title: '删除成功', icon: 'success' })
          fetchPayments()
        } catch (error) {
          uni.showToast({ title: error.message || '删除失败', icon: 'none' })
        }
      }
    }
  })
}

onMounted(() => {
  fetchPayments()
})

onShow(() => {
  fetchPayments()
})
</script>

<style scoped>
.payments-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
  padding-bottom: 140rpx;
}

.empty-tip {
  text-align: center;
  padding: 100rpx 0;
  color: #909399;
  font-size: 28rpx;
}

.payment-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.payment-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.payment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.student-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.payment-amount {
  font-size: 36rpx;
  font-weight: bold;
  color: #F56C6C;
}

.payment-body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.payment-info {
  display: flex;
  font-size: 26rpx;
}

.info-label {
  color: #909399;
}

.info-value {
  color: #333;
}

.text-success {
  color: #67C23A;
}

.payment-actions {
  display: flex;
  gap: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.btn-edit {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  background-color: #409EFF;
  color: #fff;
  font-size: 24rpx;
  border: none;
  border-radius: 8rpx;
}

.btn-delete {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  background-color: #fff;
  color: #F56C6C;
  font-size: 24rpx;
  border: 2rpx solid #F56C6C;
  border-radius: 8rpx;
}

.add-btn {
  position: fixed;
  right: 40rpx;
  bottom: 120rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(64, 158, 255, 0.4);
}

.add-btn text {
  color: #fff;
  font-size: 48rpx;
  font-weight: 300;
}
</style>
