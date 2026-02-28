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
        <text class="form-label">课程类型</text>
        <picker :value="courseTypeIndex" :range="courseTypes" range-key="name" @change="onCourseTypeChange">
          <view class="form-picker">
            <text>{{ courseTypes[courseTypeIndex]?.name || '请选择课程类型' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">上课日期 *</text>
        <picker mode="date" :value="form.date" @change="onDateChange">
          <view class="form-picker">
            <text>{{ form.date || '请选择日期' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">开始时间 *</text>
        <picker mode="time" :value="form.startTime" start="08:00" end="22:00" @change="onStartTimeChange">
          <view class="form-picker">
            <text>{{ form.startTime || '请选择时间' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">课程时长</text>
        <picker :value="durationIndex" :range="durationOptions" @change="onDurationChange">
          <view class="form-picker">
            <text>{{ durationOptions[durationIndex] }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item switch-item">
        <text class="form-label">是否重复</text>
        <switch :checked="form.isRecurring" @change="onRecurringChange" color="#409EFF" />
      </view>
      
      <view class="form-item" v-if="form.isRecurring">
        <text class="form-label">重复模式</text>
        <input class="form-input" v-model="form.recurringPattern" placeholder="例如：每周一、每周二" />
      </view>
      
      <view class="form-item">
        <text class="form-label">状态</text>
        <picker :value="statusIndex" :range="statusOptions" @change="onStatusChange">
          <view class="form-picker">
            <text>{{ statusOptions[statusIndex] }}</text>
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
const courseTypes = ref([])
const courseTypeIndex = ref(0)
const durationOptions = ['30分钟', '45分钟', '60分钟', '90分钟', '120分钟']
const durationIndex = ref(2)
const durationValues = [30, 45, 60, 90, 120]
const statusOptions = ['正常', '已取消', '已改期']
const statusValues = ['normal', 'cancelled', 'rescheduled']
const statusIndex = ref(0)
const loading = ref(false)

const form = reactive({
  studentId: '',
  courseTypeId: '',
  date: '',
  startTime: '',
  duration: 60,
  isRecurring: false,
  recurringPattern: '',
  status: 'normal',
  notes: ''
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const date = currentPage.options?.date || ''
  if (date) {
    form.date = date
  } else {
    const today = new Date()
    form.date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }
  fetchStudents()
  fetchCourseTypes()
})

watch(() => form.studentId, (newStudentId) => {
  const student = students.value.find(s => s._id === newStudentId)
  if (student && student.defaultCourseTypeId) {
    const idx = courseTypes.value.findIndex(t => t._id === student.defaultCourseTypeId._id || student.defaultCourseTypeId)
    if (idx >= 0) {
      courseTypeIndex.value = idx
      form.courseTypeId = courseTypes.value[idx]._id
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

const fetchCourseTypes = async () => {
  try {
    const res = await get('/course-types')
    courseTypes.value = res.data || []
  } catch (error) {
    console.error('获取课程类型失败', error)
  }
}

const onStudentChange = (e) => {
  studentIndex.value = e.detail.value
  form.studentId = students.value[e.detail.value]?._id || ''
}

const onCourseTypeChange = (e) => {
  courseTypeIndex.value = e.detail.value
  form.courseTypeId = courseTypes.value[e.detail.value]?._id || ''
}

const onDateChange = (e) => {
  form.date = e.detail.value
}

const onStartTimeChange = (e) => {
  form.startTime = e.detail.value
}

const onDurationChange = (e) => {
  durationIndex.value = e.detail.value
  form.duration = durationValues[e.detail.value]
}

const onRecurringChange = (e) => {
  form.isRecurring = e.detail.value
}

const onStatusChange = (e) => {
  statusIndex.value = e.detail.value
  form.status = statusValues[e.detail.value]
}

const handleCancel = () => {
  uni.navigateBack()
}

const handleSubmit = async () => {
  if (!form.studentId) {
    uni.showToast({ title: '请选择学生', icon: 'none' })
    return
  }
  if (!form.date || !form.startTime) {
    uni.showToast({ title: '请填写完整的上课时间', icon: 'none' })
    return
  }
  
  loading.value = true
  
  const startTime = new Date(`${form.date}T${form.startTime}:00`)
  const endTime = new Date(startTime.getTime() + form.duration * 60000)
  
  const submitData = {
    studentId: form.studentId,
    courseTypeId: form.courseTypeId || undefined,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    isRecurring: form.isRecurring,
    recurringPattern: form.recurringPattern,
    status: form.status,
    notes: form.notes
  }
  
  try {
    await post('/courses', submitData)
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

.switch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.switch-item .form-label {
  margin-bottom: 0;
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
