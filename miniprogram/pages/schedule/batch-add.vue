<template>
  <view class="batch-add-container">
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
        <text class="form-label">课程时长</text>
        <picker :value="durationIndex" :range="durationOptions" @change="onDurationChange">
          <view class="form-picker">
            <text>{{ durationOptions[durationIndex] }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
        <view class="default-duration-check" @click.stop="toggleDefaultDuration">
          <view class="checkbox" :class="{ checked: isDefaultDuration }">
            <text v-if="isDefaultDuration">✓</text>
          </view>
          <text class="checkbox-label">设为默认时长</text>
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
    </view>
    
    <view class="course-list-section">
      <view class="section-header">
        <text class="section-title">课程列表</text>
        <text class="course-count">共 {{ courseList.length }} 节</text>
      </view>
      
      <view class="course-list">
        <view v-for="(item, index) in courseList" :key="index" class="course-row">
          <view class="row-index">{{ index + 1 }}</view>
          <picker mode="date" :value="item.date" @change="(e) => onItemDateChange(e, index)" class="row-date">
            <view class="form-picker-small">
              <text>{{ item.date || '日期' }}</text>
              <text class="picker-arrow-small">▼</text>
            </view>
          </picker>
          <picker mode="time" :value="item.startTime" start="08:00" end="23:00" @change="(e) => onItemTimeChange(e, index)" class="row-time">
            <view class="form-picker-small">
              <text>{{ item.startTime || '时间' }}</text>
              <text class="picker-arrow-small">▼</text>
            </view>
          </picker>
          <view class="row-actions">
            <text class="btn-remove" @click="removeCourse(index)">✕</text>
          </view>
        </view>
      </view>
      
      <button class="btn-add-row" @click="addCourseRow">
        <text>+ 添加一行</text>
      </button>
    </view>
    
    <view class="form-actions">
      <button class="btn-cancel" @click="handleCancel">取消</button>
      <button class="btn-submit" @click="handleSubmit" :loading="loading">保存</button>
    </view>
    
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
import { ref, reactive, onMounted } from 'vue'
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
const statusOptions = ['未上课', '已完成', '已取消']
const statusValues = ['normal', 'completed', 'cancelled']
const statusIndex = ref(1)
const loading = ref(false)
const dayNames = ['日', '一', '二', '三', '四', '五', '六']
const isDefaultDuration = ref(false)

const form = reactive({
  studentId: '',
  courseTypeId: '',
  duration: 60,
  status: 'completed'
})

const courseList = ref([
  { date: '', startTime: '' }
])

onMounted(async () => {
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  courseList.value[0].date = dateStr
  
  try {
    const saved = uni.getStorageSync('defaultDuration')
    if (saved) {
      const idx = durationValues.indexOf(Number(saved))
      if (idx >= 0) {
        durationIndex.value = idx
        form.duration = durationValues[idx]
        isDefaultDuration.value = true
      }
    }
  } catch (e) {
    console.error('读取默认时长失败', e)
  }
  
  await fetchCourseTypes()
  await fetchStudents()
})

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
    
    if (courseTypeIndex.value < 0 && courseTypes.value.length > 0) {
      const defaultType = courseTypes.value.find(t => t.isDefault)
      if (defaultType) {
        const idx = courseTypes.value.findIndex(t => t._id === defaultType._id)
        courseTypeIndex.value = idx
        form.courseTypeId = defaultType._id
      }
    }
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

const onDurationChange = (e) => {
  durationIndex.value = e.detail.value
  form.duration = durationValues[e.detail.value]
}

const toggleDefaultDuration = () => {
  isDefaultDuration.value = !isDefaultDuration.value
  if (isDefaultDuration.value) {
    try {
      uni.setStorageSync('defaultDuration', form.duration)
      uni.showToast({ title: '已设置默认时长', icon: 'success' })
    } catch (e) {
      console.error('保存默认时长失败', e)
    }
  }
}

const onStatusChange = (e) => {
  statusIndex.value = e.detail.value
  form.status = statusValues[e.detail.value]
}

const addCourseRow = () => {
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  courseList.value.push({ date: dateStr, startTime: '' })
}

const removeCourse = (index) => {
  if (courseList.value.length > 1) {
    courseList.value.splice(index, 1)
  } else {
    uni.showToast({ title: '至少保留一行', icon: 'none' })
  }
}

const onItemDateChange = (e, index) => {
  courseList.value[index].date = e.detail.value
}

const onItemTimeChange = (e, index) => {
  courseList.value[index].startTime = e.detail.value
}

const handleCancel = () => {
  uni.navigateBack()
}

const handleSubmit = async () => {
  if (!form.studentId) {
    uni.showToast({ title: '请选择学生', icon: 'none' })
    return
  }
  
  const incompleteCourses = courseList.value.filter(item => !item.date || !item.startTime)
  if (incompleteCourses.length > 0) {
    uni.showToast({ title: '请完善所有课程的日期和时间', icon: 'none' })
    return
  }
  
  loading.value = true
  
  try {
    const promises = courseList.value.map(item => {
      const startTime = new Date(`${item.date}T${item.startTime}:00`)
      const endTime = new Date(startTime.getTime() + form.duration * 60000)
      
      const coursePromise = post('/courses', {
        studentId: form.studentId,
        courseTypeId: form.courseTypeId || undefined,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: form.status,
        notes: '批量添加'
      })
      
      if (form.status === 'completed') {
        return coursePromise.then(courseRes => {
          return post('/lesson-records', {
            studentId: form.studentId,
            courseId: courseRes.data._id,
            courseTypeId: form.courseTypeId,
            courseStartTime: startTime.toISOString(),
            lessonsConsumed: 1,
            lessonContent: '',
            isDeducted: true,
            notes: '批量添加-自动消课'
          })
        })
      }
      
      return coursePromise
    })
    
    await Promise.all(promises)
    uni.showToast({ title: `成功创建${courseList.value.length}节课程`, icon: 'success' })
    
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
.batch-add-container {
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

.default-duration-check {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
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
  font-size: 24rpx;
  color: #fff;
  background: #fff;
  transition: all 0.2s;
}

.checkbox.checked {
  background: #409EFF;
  border-color: #409EFF;
}

.checkbox-label {
  font-size: 26rpx;
  color: #606266;
}

.course-list-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.course-count {
  font-size: 26rpx;
  color: #409EFF;
}

.course-list {
  margin-bottom: 20rpx;
}

.course-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.row-index {
  width: 50rpx;
  font-size: 26rpx;
  color: #909399;
  text-align: center;
}

.row-date {
  flex: 1;
  margin: 0 8rpx;
}

.row-time {
  flex: 1;
  margin: 0 8rpx;
}

.form-picker-small {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64rpx;
  padding: 0 16rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 26rpx;
  background-color: #fafafa;
}

.picker-arrow-small {
  font-size: 18rpx;
  color: #909399;
}

.row-actions {
  width: 60rpx;
  display: flex;
  justify-content: center;
}

.btn-remove {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fef0f0;
  color: #F56C6C;
  border-radius: 50%;
  font-size: 24rpx;
}

.btn-add-row {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #ecf5ff;
  color: #409EFF;
  border: 2rpx dashed #409EFF;
  border-radius: 8rpx;
  font-size: 28rpx;
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

.student-picker-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.student-picker-dialog {
  width: 90%;
  max-width: 600rpx;
  background-color: #fff;
  border-radius: 24rpx;
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
  height: 50vh;
  overflow-y: auto;
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
