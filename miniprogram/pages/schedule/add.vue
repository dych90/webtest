<template>
  <view class="add-container">
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
        <text class="form-label">课程类型</text>
        <picker :value="courseTypeIndex >= 0 ? courseTypeIndex : 0" :range="courseTypes" range-key="name" @change="onCourseTypeChange">
          <view class="form-picker">
            <text>{{ courseTypeIndex >= 0 ? courseTypes[courseTypeIndex]?.name : '请选择课程类型' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">上课日期 *</text>
        <picker mode="date" :value="form.date" @change="onDateChange">
          <view class="form-picker">
            <text>{{ form.date || '请选择日期' }} {{ weekDayText }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">开始时间 *</text>
        <picker mode="time" :value="form.startTime" start="06:00" end="23:00" @change="onStartTimeChange">
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
        <view class="default-duration-check" @click.stop="toggleDefaultDuration">
          <view class="checkbox" :class="{ checked: saveAsDefaultDuration }">
            <text v-if="saveAsDefaultDuration">✓</text>
          </view>
          <text class="checkbox-label">设为默认时长</text>
        </view>
      </view>
      
      <view class="form-item switch-item" @click.stop>
        <text class="form-label">是否重复</text>
        <switch :checked="form.isRecurring" @change="onRecurringChange" color="#409EFF" />
      </view>
      
      <view v-if="form.isRecurring" class="recurring-section" @click.stop>
        <view class="recurring-info">
          <text class="recurring-tip">将在此日期的每周{{ weekDayText }}重复排课</text>
        </view>
        
        <view class="form-item">
          <text class="form-label">重复开始日期</text>
          <picker mode="date" :value="form.recurringStartDate" @change="onRecurringStartChange">
            <view class="form-picker">
              <text>{{ form.recurringStartDate || form.date || '请选择日期' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
        
        <view class="form-item">
          <text class="form-label">重复结束日期</text>
          <picker mode="date" :value="form.recurringEndDate" @change="onRecurringEndChange">
            <view class="form-picker">
              <text>{{ form.recurringEndDate || '请选择日期' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
        
        <view class="recurring-preview" v-if="recurringDates.length > 0">
          <text class="preview-title">将创建 {{ recurringDates.length }} 节课程</text>
          <view class="preview-dates">
            <text v-for="(date, index) in recurringDates.slice(0, 5)" :key="index" class="preview-date">
              {{ formatDateShort(date) }}
            </text>
            <text v-if="recurringDates.length > 5" class="preview-more">
              ...等{{ recurringDates.length }}个日期
            </text>
          </view>
        </view>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { get, post } from '@/utils/request'

const students = ref([])
const filteredStudents = ref([])
const studentSearchText = ref('')
const showStudentPicker = ref(false)
const courseTypes = ref([])
const courseTypeIndex = ref(-1)
const durationOptions = ['30分钟', '45分钟', '50分钟', '60分钟', '70分钟', '90分钟', '120分钟']
const durationIndex = ref(3)
const durationValues = [30, 45, 50, 60, 70, 90, 120]
const statusOptions = ['正常', '已取消', '已改期']
const statusValues = ['normal', 'cancelled', 'rescheduled']
const statusIndex = ref(0)
const loading = ref(false)
const dayNames = ['日', '一', '二', '三', '四', '五', '六']
const saveAsDefaultDuration = ref(false)

const form = reactive({
  studentId: '',
  courseTypeId: '',
  date: '',
  startTime: '',
  duration: 60,
  isRecurring: false,
  recurringStartDate: '',
  recurringEndDate: '',
  status: 'normal',
  notes: ''
})

const weekDayText = computed(() => {
  if (!form.date) return ''
  const date = new Date(form.date)
  return `周${dayNames[date.getDay()]}`
})

const recurringDates = computed(() => {
  if (!form.isRecurring || !form.recurringStartDate || !form.recurringEndDate) {
    return []
  }
  
  const dates = []
  const startDate = new Date(form.recurringStartDate)
  const endDate = new Date(form.recurringEndDate)
  const targetDayOfWeek = new Date(form.date).getDay()
  
  let currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    if (currentDate.getDay() === targetDayOfWeek) {
      dates.push(new Date(currentDate))
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return dates
})

onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const date = currentPage.options?.date || ''
  const time = currentPage.options?.time || ''
  
  if (date) {
    form.date = date
    form.recurringStartDate = date
  } else {
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    form.date = dateStr
    form.recurringStartDate = dateStr
  }
  
  if (time) {
    form.startTime = time
  }
  
  loadDefaultDuration()
  
  await fetchCourseTypes()
  await fetchStudents()
})

const loadDefaultDuration = () => {
  try {
    const saved = uni.getStorageSync('defaultDuration')
    if (saved) {
      const idx = durationValues.indexOf(Number(saved))
      if (idx >= 0) {
        durationIndex.value = idx
        form.duration = durationValues[idx]
      }
    }
  } catch (e) {
    console.error('读取默认时长失败', e)
  }
}

const saveDefaultDuration = () => {
  try {
    uni.setStorageSync('defaultDuration', form.duration)
    uni.showToast({ title: '已设置默认时长', icon: 'success' })
  } catch (e) {
    console.error('保存默认时长失败', e)
  }
}

const toggleDefaultDuration = () => {
  saveAsDefaultDuration.value = !saveAsDefaultDuration.value
  if (saveAsDefaultDuration.value) {
    saveDefaultDuration()
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

const fetchCourseTypes = async () => {
  try {
    const res = await get('/course-types')
    courseTypes.value = res.data || []
  } catch (error) {
    console.error('获取课程类型失败', error)
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
  
  if (student && student.defaultCourseTypeId) {
    const courseTypeId = student.defaultCourseTypeId._id || student.defaultCourseTypeId
    const idx = courseTypes.value.findIndex(t => t._id === courseTypeId)
    if (idx >= 0) {
      courseTypeIndex.value = idx
      form.courseTypeId = courseTypes.value[idx]._id
    }
  }
  
  showStudentPicker.value = false
}

const onCourseTypeChange = (e) => {
  courseTypeIndex.value = e.detail.value
  form.courseTypeId = courseTypes.value[e.detail.value]?._id || ''
}

const onDateChange = (e) => {
  form.date = e.detail.value
  if (!form.recurringStartDate) {
    form.recurringStartDate = e.detail.value
  }
}

const onStartTimeChange = (e) => {
  form.startTime = e.detail.value
}

const onDurationChange = (e) => {
  durationIndex.value = e.detail.value
  form.duration = durationValues[e.detail.value]
  if (saveAsDefaultDuration.value) {
    saveDefaultDuration()
  }
}

const onRecurringChange = (e) => {
  form.isRecurring = e.detail.value
  if (form.isRecurring && !form.recurringStartDate) {
    form.recurringStartDate = form.date
  }
}

const onRecurringStartChange = (e) => {
  form.recurringStartDate = e.detail.value
}

const onRecurringEndChange = (e) => {
  form.recurringEndDate = e.detail.value
}

const onStatusChange = (e) => {
  statusIndex.value = e.detail.value
  form.status = statusValues[e.detail.value]
}

const formatDateShort = (date) => {
  return `${date.getMonth() + 1}/${date.getDate()}`
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
  
  if (form.isRecurring && (!form.recurringStartDate || !form.recurringEndDate)) {
    uni.showToast({ title: '请选择重复区间', icon: 'none' })
    return
  }
  
  loading.value = true
  
  try {
    if (form.isRecurring && recurringDates.value.length > 0) {
      const promises = recurringDates.value.map(date => {
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        const startTime = new Date(`${dateStr}T${form.startTime}:00`)
        const endTime = new Date(startTime.getTime() + form.duration * 60000)
        
        return post('/courses', {
          studentId: form.studentId,
          courseTypeId: form.courseTypeId || undefined,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          status: form.status,
          notes: form.notes
        })
      })
      
      await Promise.all(promises)
      uni.showToast({ title: `成功创建${recurringDates.value.length}节课程`, icon: 'success' })
    } else {
      const startTime = new Date(`${form.date}T${form.startTime}:00`)
      const endTime = new Date(startTime.getTime() + form.duration * 60000)
      
      await post('/courses', {
        studentId: form.studentId,
        courseTypeId: form.courseTypeId || undefined,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: form.status,
        notes: form.notes
      })
      uni.showToast({ title: '添加成功', icon: 'success' })
    }
    
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

.default-duration-check {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
}

.checkbox.checked {
  background-color: #409EFF;
  border-color: #409EFF;
}

.checkbox text {
  color: #fff;
  font-size: 24rpx;
}

.checkbox-label {
  font-size: 26rpx;
  color: #606266;
}

.switch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.switch-item .form-label {
  margin-bottom: 0;
}

.recurring-section {
  background-color: #f5f7fa;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 30rpx;
}

.recurring-info {
  margin-bottom: 20rpx;
}

.recurring-tip {
  font-size: 26rpx;
  color: #409EFF;
}

.recurring-preview {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #e4e7ed;
}

.preview-title {
  font-size: 26rpx;
  color: #333;
  font-weight: bold;
  display: block;
  margin-bottom: 12rpx;
}

.preview-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.preview-date {
  font-size: 24rpx;
  color: #606266;
  background-color: #fff;
  padding: 6rpx 12rpx;
  border-radius: 6rpx;
}

.preview-more {
  font-size: 24rpx;
  color: #909399;
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
