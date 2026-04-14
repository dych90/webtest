<template>
  <view class="add-container">
    <view class="form-section">
      <view class="form-item">
        <text class="form-label">学生 *</text>
        <view class="search-picker-container">
          <input 
            class="search-input" 
            placeholder="搜索学生姓名" 
            v-model="studentSearchKeyword"
            @input="filterStudents"
          />
          <picker :value="studentIndex" :range="filteredStudents" range-key="name" @change="onStudentChange">
            <view class="form-picker">
              <text>{{ filteredStudents[studentIndex]?.name || '请选择学生' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>
      
      <view class="form-item">
        <text class="form-label">课程</text>
        <picker :value="courseIndex" :range="courseOptions" @change="onCourseChange">
          <view class="form-picker">
            <text>{{ courseOptions[courseIndex] || '请选择课程' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">课程类型</text>
        <picker :value="courseTypeIndex" :range="courseTypeOptions" @change="onCourseTypeChange">
          <view class="form-picker">
            <text>{{ courseTypeOptions[courseTypeIndex] || '请选择课程类型' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">上课日期 *</text>
        <picker mode="date" :value="form.courseDate" @change="onDateChange">
          <view class="form-picker">
            <text>{{ form.courseDate || '请选择日期' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">上课时间 *</text>
        <picker mode="time" :value="form.courseTime" start="08:00" end="23:00" @change="onTimeChange">
          <view class="form-picker">
            <text>{{ form.courseTime || '请选择时间' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">消课数量 *</text>
        <picker :value="lessonCountIndex" :range="lessonCountOptions" @change="onLessonCountChange">
          <view class="form-picker">
            <text>{{ lessonCountOptions[lessonCountIndex] || '请选择' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">上课曲目</text>
        <textarea class="form-textarea" v-model="form.lessonContent" placeholder="请输入上课曲目" />
      </view>
      
      <view class="form-item switch-item">
        <text class="form-label">是否扣费</text>
        <switch :checked="form.isDeducted" @change="onDeductedChange" color="#409EFF" />
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
import { ref, reactive, onMounted, computed } from 'vue'
import { get, post } from '@/utils/request'

const students = ref([])
const filteredStudents = ref([])
const studentSearchKeyword = ref('')
const studentIndex = ref(0)
const courses = ref([])
const courseIndex = ref(0)
const courseTypes = ref([])
const courseTypeIndex = ref(-1)
const loading = ref(false)
const lessonCountIndex = ref(2)

const lessonCountOptions = ['0.5节', '1节', '1.5节', '2节', '2.5节', '3节', '3.5节', '4节', '4.5节', '5节']
const lessonCountValues = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

const form = reactive({
  studentId: '',
  courseId: '',
  courseTypeId: '',
  courseDate: '',
  courseTime: '',
  lessonsConsumed: 1,
  lessonContent: '',
  isDeducted: true,
  notes: ''
})

const courseTypeOptions = computed(() => {
  return courseTypes.value.map(c => c.name)
})

const courseOptions = computed(() => {
  const filtered = courses.value.filter(c => {
    const courseStudentId = c.studentId?._id || c.studentId
    return courseStudentId === form.studentId
  })
  return filtered.map(c => {
    const date = c.startTime ? new Date(c.startTime) : null
    const timeStr = date ? `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '未设置'
    return `${c.courseTypeId?.name || '未设置'} - ${timeStr}`
  })
})

onMounted(() => {
  const today = new Date()
  form.courseDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  form.courseTime = '10:00'
  fetchStudents()
  fetchCourses()
  fetchCourseTypes()
})

const fetchStudents = async () => {
  try {
    const res = await get('/students')
    students.value = res.data || []
    filteredStudents.value = students.value
    
    if (students.value.length > 0 && !form.studentId) {
      form.studentId = students.value[0]._id
    }
  } catch (error) {
    console.error('获取学生列表失败', error)
  }
}

const filterStudents = () => {
  if (!studentSearchKeyword.value.trim()) {
    filteredStudents.value = students.value
  } else {
    const keyword = studentSearchKeyword.value.trim().toLowerCase()
    filteredStudents.value = students.value.filter(s => 
      s.name && s.name.toLowerCase().includes(keyword)
    )
  }
  studentIndex.value = 0
}

const fetchCourses = async () => {
  try {
    const res = await get('/courses')
    courses.value = (res.data || []).filter(c => c.status === 'normal')
  } catch (error) {
    console.error('获取课程列表失败', error)
  }
}

const fetchCourseTypes = async () => {
  try {
    const res = await get('/course-types')
    courseTypes.value = res.data || []
    
    const pianoCourse = courseTypes.value.find(ct => ct.name === '钢琴课')
    if (pianoCourse && !form.courseTypeId) {
      const idx = courseTypes.value.indexOf(pianoCourse)
      courseTypeIndex.value = idx >= 0 ? idx : -1
      form.courseTypeId = pianoCourse._id
    }
  } catch (error) {
    console.error('获取课程类型列表失败', error)
  }
}

const onStudentChange = (e) => {
  studentIndex.value = e.detail.value
  form.studentId = filteredStudents.value[e.detail.value]?._id || ''
}

const onCourseChange = (e) => {
  courseIndex.value = e.detail.value
  form.courseId = courses.value[e.detail.value]?._id || ''
}

const onCourseTypeChange = (e) => {
  courseTypeIndex.value = e.detail.value
  form.courseTypeId = courseTypes.value[e.detail.value]?._id || ''
}

const onDateChange = (e) => {
  form.courseDate = e.detail.value
}

const onTimeChange = (e) => {
  form.courseTime = e.detail.value
}

const onDeductedChange = (e) => {
  form.isDeducted = e.detail.value
}

const onLessonCountChange = (e) => {
  lessonCountIndex.value = e.detail.value
  form.lessonsConsumed = lessonCountValues[e.detail.value]
}

const handleCancel = () => {
  uni.navigateBack()
}

const handleSubmit = async () => {
  if (!form.studentId) {
    uni.showToast({ title: '请选择学生', icon: 'none' })
    return
  }
  if (!form.courseDate || !form.courseTime) {
    uni.showToast({ title: '请选择上课日期和时间', icon: 'none' })
    return
  }
  if (!form.lessonsConsumed || form.lessonsConsumed <= 0) {
    uni.showToast({ title: '请选择消课数量', icon: 'none' })
    return
  }
  
  loading.value = true
  
  const submitData = {
    studentId: form.studentId,
    courseId: form.courseId || undefined,
    courseTypeId: form.courseTypeId || undefined,
    courseStartTime: new Date(`${form.courseDate}T${form.courseTime}:00`).toISOString(),
    lessonsConsumed: form.lessonsConsumed,
    lessonContent: form.lessonContent,
    isDeducted: form.isDeducted,
    notes: form.notes
  }
  
  try {
    await post('/lesson-records', submitData)
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

.search-input {
  margin-bottom: 16rpx;
}

.search-picker-container {
  display: flex;
  flex-direction: column;
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
