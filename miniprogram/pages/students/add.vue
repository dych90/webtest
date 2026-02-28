<template>
  <view class="add-container">
    <view class="form-section">
      <view class="form-item">
        <text class="form-label">学生姓名 *</text>
        <input class="form-input" v-model="form.name" placeholder="请输入学生姓名" />
      </view>
      
      <view class="form-item">
        <text class="form-label">联系电话</text>
        <input class="form-input" v-model="form.phone" placeholder="请输入联系电话" type="tel" />
      </view>
      
      <view class="form-item">
        <text class="form-label">付费方式 *</text>
        <picker :value="paymentTypeIndex" :range="paymentTypes" @change="onPaymentTypeChange">
          <view class="form-picker">
            <text>{{ paymentTypes[paymentTypeIndex] }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">备注</text>
        <textarea class="form-textarea" v-model="form.notes" placeholder="请输入备注信息" />
      </view>
    </view>
    
    <view class="form-actions">
      <button class="btn-cancel" @click="handleCancel">取消</button>
      <button class="btn-submit" @click="handleSubmit" :loading="loading">保存</button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { post } from '@/utils/request'

const paymentTypes = ['预付费', '单次付费']
const paymentTypeIndex = ref(0)
const loading = ref(false)

const form = reactive({
  name: '',
  phone: '',
  paymentType: 'prepaid',
  notes: ''
})

const onPaymentTypeChange = (e) => {
  paymentTypeIndex.value = e.detail.value
  form.paymentType = e.detail.value === 0 ? 'prepaid' : 'single'
}

const handleCancel = () => {
  uni.navigateBack()
}

const handleSubmit = async () => {
  if (!form.name) {
    uni.showToast({ title: '请输入学生姓名', icon: 'none' })
    return
  }
  
  loading.value = true
  try {
    await post('/students', form)
    uni.showToast({ title: '添加成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  } catch (error) {
    uni.showToast({ title: error.message || '添加失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.add-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.form-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 80rpx;
  padding: 0 20rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.picker-arrow {
  font-size: 20rpx;
  color: #909399;
}

.form-textarea {
  width: 100%;
  height: 160rpx;
  padding: 20rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-actions {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 0;
}

.btn-cancel {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #fff;
  color: #606266;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-submit {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #409EFF;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}
</style>
