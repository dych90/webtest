<template>
  <view class="edit-container">
    <view class="form-section">
      <view class="form-item">
        <text class="form-label">学生 *</text>
        <view class="student-picker" @click="showStudentPicker = true">
          <view class="form-picker">
            <text :class="{ 'placeholder': !form.studentId }">{{ getSelectedStudentName() }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </view>
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
    
    <!-- 学生选择弹窗 -->
    <view class="student-picker-mask" v-if="showStudentPicker" @click.self="showStudentPicker = false">
      <view class="student-picker-dialog" @click.stop>
        <view class="picker-header">
          <text class="picker-title">选择学生</text>
          <text class="picker-close" @click="showStudentPicker = false">×</text>
        </view>
        <view class="picker-search">
          <input 
            class="search-input" 
            v-model="studentSearchText" 
            placeholder="搜索学生姓名"
            @input="filterStudents"
          />
        </view>
        <scroll-view scroll-y class="picker-list">
          <view 
            v-for="student in filteredStudents" 
            :key="student._id" 
            class="picker-item"
            :class="{ selected: form.studentId === student._id }"
            @click="selectStudent(student)"
          >
            <view class="student-item-content">
              <view class="student-avatar-small">
                <text>{{ student.name.charAt(0) }}</text>
              </view>
              <view class="student-item-info">
                <text class="student-item-name">{{ formatStudentName(student.name) }}</text>
                <text class="student-item-phone" v-if="student.phone">{{ student.phone }}</text>
              </view>
            </view>
            <view class="check-icon" v-if="form.studentId === student._id">✓</view>
          </view>
          <view v-if="filteredStudents.length === 0" class="empty-student">
            <text>未找到匹配的学生</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { get, put } from '@/utils/request'

const students = ref([])
const filteredStudents = ref([])
const studentSearchText = ref('')
const showStudentPicker = ref(false)
const paymentMethods = ['现金', '微信', '支付宝', '银行转账']
const paymentMethodIndex = ref(0)
const selectedStudentPaymentType = ref('prepaid')
const loading = ref(false)
const paymentId = ref('')

const form = reactive({
  studentId: '',
  paymentType: '微信',
  amount: '',
  totalLessons: '',
  bonusLessons: '',
  paymentDate: '',
  notes: ''
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  paymentId.value = currentPage.options?.id || ''
  if (paymentId.value) {
    fetchPayment()
    fetchStudents()
  }
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

const fetchPayment = async () => {
  try {
    const res = await get(`/payments/${paymentId.value}`)
    const data = res.data || {}
    form.studentId = data.studentId?._id || data.studentId || ''
    form.paymentType = data.paymentType || '微信'
    form.amount = data.amount || ''
    form.totalLessons = data.totalLessons || ''
    form.bonusLessons = data.bonusLessons || ''
    form.paymentDate = data.paymentDate ? data.paymentDate.split('T')[0] : ''
    form.notes = data.notes || ''
    
    paymentMethodIndex.value = paymentMethods.indexOf(form.paymentType)
    if (paymentMethodIndex.value < 0) paymentMethodIndex.value = 1
    
    selectedStudentPaymentType.value = data.studentId?.paymentType || 'prepaid'
  } catch (error) {
    uni.showToast({ title: '获取缴费信息失败', icon: 'none' })
  }
}

const fetchStudents = async () => {
  try {
    const res = await get('/students')
    students.value = res.data || []
    filteredStudents.value = [...students.value]
  } catch (error) {
    console.error('获取学生列表失败', error)
  }
}

const filterStudents = () => {
  if (!studentSearchText.value) {
    filteredStudents.value = [...students.value]
  } else {
    const keyword = studentSearchText.value.toLowerCase()
    filteredStudents.value = students.value.filter(s => 
      s.name.toLowerCase().includes(keyword)
    )
  }
}

const getSelectedStudentName = () => {
  if (!form.studentId) return '请选择学生'
  const student = students.value.find(s => s._id === form.studentId)
  return student ? formatStudentName(student.name) : '请选择学生'
}

const formatStudentName = (name) => {
  if (!name) return ''
  return name.replace(/（/g, '(').replace(/）/g, ')')
}

const selectStudent = (student) => {
  form.studentId = student._id
  selectedStudentPaymentType.value = student.paymentType || 'prepaid'
  if (student.paymentType === 'payPerLesson') {
    form.totalLessons = ''
    form.bonusLessons = ''
  }
  showStudentPicker.value = false
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
    await put(`/payments/${paymentId.value}`, submitData)
    uni.showToast({ title: '更新成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  } catch (error) {
    uni.showToast({ title: error.message || '更新失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.edit-container {
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

.placeholder {
  color: #909399;
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

/* 学生选择弹窗 */
.student-picker-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}

.student-picker-dialog {
  width: 100%;
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.picker-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.picker-close {
  font-size: 40rpx;
  color: #909399;
}

.picker-search {
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.search-input {
  width: 100%;
  height: 70rpx;
  padding: 0 20rpx;
  background-color: #f5f7fa;
  border-radius: 35rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.picker-list {
  flex: 1;
  max-height: 50vh;
}

.picker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.picker-item.selected {
  background-color: #ecf5ff;
}

.student-item-content {
  display: flex;
  align-items: center;
}

.student-avatar-small {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background-color: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.student-avatar-small text {
  color: #fff;
  font-size: 26rpx;
  font-weight: bold;
}

.student-item-info {
  display: flex;
  flex-direction: column;
}

.student-item-name {
  font-size: 30rpx;
  color: #333;
}

.student-item-phone {
  font-size: 24rpx;
  color: #909399;
  margin-top: 4rpx;
}

.check-icon {
  color: #409EFF;
  font-size: 32rpx;
}

.empty-student {
  text-align: center;
  padding: 60rpx 0;
  color: #909399;
  font-size: 28rpx;
}
</style>
