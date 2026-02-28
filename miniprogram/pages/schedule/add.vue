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
        <picker mode="time" :value="form.startTime" @change="onStartTimeChange">
          <view class="form-picker">
            <text>{{ form.startTime || '请选择时间' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">结束时间 *</text>
        <picker mode="time" :value="form.endTime" @change="onEndTimeChange">
          <view class="form-picker">
            <text>{{ form.endTime || '请选择时间' }}</text>
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
import { ref, reactive, onMounted } from 'vue'
import { get, post } from '@/utils/request'

const students = ref([])
const studentIndex = ref(0)
const courseTypes = ref([])
const courseTypeIndex = ref(0)
const loading = ref(false)

const form = reactive({
  studentId: '',
  courseTypeId: '',
  date: '',
  startTime: '',
  endTime: '',
  notes: ''
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const date = currentPage.options?.date || ''
  if (date) {
    form.date = date
  }
  fetchStudents()
  fetchCourseTypes()
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

const onEndTimeChange = (e) => {
  form.endTime = e.detail.value
}

const handleCancel = () => {
  uni.navigateBack()
}

const handleSubmit = async () => {
  if (!form.studentId) {
    uni.showToast({ title: '请选择学生', icon: 'none' })
    return
  }
  if (!form.date || !form.startTime || !form.endTime) {
    uni.showToast({ title: '请填写完整的课程时间', icon: 'none' })
    return
  }
  
  const startTime = new Date(`${form.date}T${form.startTime}:00`)
  const endTime = new Date(`${form.date}T${form.endTime}:00`)
  
  loading.value = true
  try {
    await post('/courses', {
      studentId: form.studentId,
      courseTypeId: form.courseTypeId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      notes: form.notes
    })
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
