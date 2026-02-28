<template>
  <view class="add-container">
    <view class="form-section">
      <view class="form-item">
        <text class="form-label">学生 *</text>
        <picker :value="studentIndex" :range="students" range-key="name" @change="onStudentChange">
          <view class="form-picker">
            <text>{{ students[studentIndex]?.name || '请选择学生' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">缴费类型</text>
        <picker :value="paymentMethodIndex" :range="paymentMethods" @change="onPaymentMethodChange">
          <view class="form-picker">
            <text>{{ paymentMethods[paymentMethodIndex] }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">缴费金额 *</text>
        <input class="form-input" v-model="form.amount" type="digit" placeholder="请输入缴费金额" />
      </view>
      
      <template v-if="selectedStudentPaymentType === 'prepaid'">
        <view class="form-item">
          <text class="form-label">预交课时 *</text>
          <input class="form-input" v-model="form.totalLessons" type="number" placeholder="请输入预交课时数" />
        </view>
        
        <view class="form-item">
          <text class="form-label">赠送课时</text>
          <input class="form-input" v-model="form.bonusLessons" type="number" placeholder="请输入赠送课时数" />
        </view>
      </template>
      
      <view class="form-item">
        <text class="form-label">缴费日期 *</text>
        <picker mode="date" :value="form.paymentDate" @change="onDateChange">
          <view class="form-picker">
            <text>{{ form.paymentDate || '请选择日期' }}</text>
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
import { ref, reactive, onMounted, watch } from 'vue'
import { get, post } from '@/utils/request'

const students = ref([])
const studentIndex = ref(0)
const paymentMethods = ['现金', '微信', '支付宝', '银行转账']
const paymentMethodIndex = ref(0)
const selectedStudentPaymentType = ref('prepaid')
const loading = ref(false)

const form = reactive({
  studentId: '',
  paymentType: '现金',
  amount: '',
  totalLessons: '',
  bonusLessons: '',
  paymentDate: '',
  notes: ''
})

onMounted(() => {
  const today = new Date()
  form.paymentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  fetchStudents()
})

watch(() => form.studentId, (newStudentId) => {
  const student = students.value.find(s => s._id === newStudentId)
  if (student) {
    selectedStudentPaymentType.value = student.paymentType || 'prepaid'
    if (student.paymentType === 'payPerLesson') {
      form.totalLessons = ''
      form.bonusLessons = ''
    }
  }
})

const fetchStudents = async () => {
  try {
    const res = await get('/students')
    students.value = res.data || []
  } catch (error) {
    console.error('获取学生列表失败', error)
  }
}

const onStudentChange = (e) => {
  studentIndex.value = e.detail.value
  form.studentId = students.value[e.detail.value]?._id || ''
}

const onPaymentMethodChange = (e) => {
  paymentMethodIndex.value = e.detail.value
  form.paymentType = paymentMethods[e.detail.value]
}

const onDateChange = (e) => {
  form.paymentDate = e.detail.value
}

const handleCancel = () => {
  uni.navigateBack()
}

const handleSubmit = async () => {
  if (!form.studentId) {
    uni.showToast({ title: '请选择学生', icon: 'none' })
    return
  }
  if (!form.amount || form.amount <= 0) {
    uni.showToast({ title: '请输入有效的缴费金额', icon: 'none' })
    return
  }
  
  if (selectedStudentPaymentType.value === 'prepaid') {
    if (!form.totalLessons || form.totalLessons <= 0) {
      uni.showToast({ title: '请输入预交课时数', icon: 'none' })
      return
    }
  }
  
  loading.value = true
  
  const submitData = {
    studentId: form.studentId,
    paymentType: form.paymentType,
    amount: Number(form.amount),
    totalLessons: selectedStudentPaymentType.value === 'prepaid' ? Number(form.totalLessons) : 0,
    bonusLessons: selectedStudentPaymentType.value === 'prepaid' ? Number(form.bonusLessons || 0) : 0,
    paymentDate: form.paymentDate,
    notes: form.notes
  }
  
  try {
    await post('/payments', submitData)
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
