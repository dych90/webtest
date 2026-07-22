<template>
  <view class="batch-add-container">
    <view class="form-section">
      <view class="form-item">
        <text class="form-label">我的身份 *</text>
        <view class="role-switch">
          <view
            v-for="item in roleOptions"
            :key="item.value"
            class="role-option"
            :class="{ active: form.participationRole === item.value }"
            @click="setParticipationRole(item.value)"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="form-item" v-if="form.participationRole === 'teacher'">
        <text class="form-label">学生 *</text>
        <view class="student-picker" @click="showStudentPicker = true">
          <view class="form-picker">
            <text :class="{ 'placeholder': !form.studentId }">{{ getSelectedStudentName() }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </view>
      </view>
      
      <view class="form-item">
        <text class="form-label">{{ isLearningCourseForm() ? '课程类型 *' : '课程类型' }}</text>
        <picker :value="courseTypeIndex >= 0 ? courseTypeIndex : 0" :range="visibleCourseTypes" range-key="name" @change="onCourseTypeChange">
          <view class="form-picker">
            <text :class="{ 'placeholder': !form.courseTypeId }">{{ selectedCourseTypeName }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>

      <view class="form-item" v-if="form.participationRole === 'student'">
        <text class="form-label">授课老师 *</text>
        <input
          class="form-input"
          v-model="form.externalTeacherName"
          placeholder="请输入老师姓名"
        />
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

      <view class="form-item" v-if="form.participationRole === 'teacher'">
        <text class="form-label">计划课时</text>
        <picker :value="plannedLessonIndex" :range="lessonCountOptions" @change="onPlannedLessonChange">
          <view class="form-picker">
            <text>{{ lessonCountOptions[plannedLessonIndex] }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">状态</text>
        <picker :value="statusIndex" :range="currentStatusOptions" @change="onStatusChange">
          <view class="form-picker">
            <text>{{ currentStatusOptions[statusIndex] }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>
    
    <view class="course-list-section">
      <view class="section-header">
        <text class="section-title">课程列表</text>
        <text class="course-count">共 {{ courseList.length }} {{ courseCountUnit }}</text>
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
          <view class="row-time">
            <input
              class="time-input"
              type="text"
              v-model="item.startTime"
              placeholder="时间"
              maxlength="5"
              confirm-type="done"
              @blur="() => normalizeItemTime(index)"
            />
          </view>
          <view class="row-actions">
            <text class="btn-remove" @click="removeCourse(index)">✕</text>
          </view>
        </view>
      </view>
      
      <view class="date-mode-row">
        <view class="date-increment-check" @click.stop="toggleDateIncrement">
          <view class="checkbox" :class="{ checked: isDateIncrementEnabled }">
            <text v-if="isDateIncrementEnabled">✓</text>
          </view>
          <text class="checkbox-label">日期递增</text>
        </view>
        <view class="date-increment-control" :class="{ disabled: !isDateIncrementEnabled }">
          <input
            class="date-increment-input"
            type="number"
            v-model="dateIncrementDays"
            :disabled="!isDateIncrementEnabled"
          />
          <text class="date-increment-unit">天</text>
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
                <view class="student-item-name-row">
                  <text class="student-item-name">{{ formatStudentName(student.name) }}</text>
                  <text v-if="student.studentRelationType === 'practice'" class="student-relation-tag">陪练</text>
                </view>
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
const lessonCountOptions = ['0.5节', '1节', '1.5节', '2节', '2.5节', '3节', '3.5节', '4节', '4.5节', '5节']
const lessonCountValues = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
const plannedLessonIndex = ref(1)
const teacherStatusOptions = ['未上课', '已完成', '已取消']
const teacherStatusValues = ['normal', 'completed', 'cancelled']
const learningStatusOptions = ['未上课', '已完成', '已取消']
const learningStatusValues = ['normal', 'completed', 'cancelled']
const statusIndex = ref(1)
const loading = ref(false)
const dayNames = ['日', '一', '二', '三', '四', '五', '六']
const isDefaultDuration = ref(false)
const isDateIncrementEnabled = ref(false)
const dateIncrementDays = ref(7)
const roleOptions = [
  { label: '我授课', value: 'teacher' },
  { label: '我上课', value: 'student' }
]

const getCourseTypeRole = (type) => {
  return type?.participationRole === 'student' ? 'student' : 'teacher'
}

const form = reactive({
  participationRole: 'teacher',
  studentId: '',
  courseTypeId: '',
  externalTeacherName: '',
  externalCourseName: '',
  duration: 60,
  plannedLessons: 1,
  status: 'completed'
})

const isLearningCourseForm = () => form.participationRole === 'student'

const visibleCourseTypes = computed(() => {
  return courseTypes.value.filter(type => getCourseTypeRole(type) === form.participationRole)
})

const selectedCourseType = computed(() => {
  if (!form.courseTypeId) return null
  return visibleCourseTypes.value.find(type => type._id === form.courseTypeId) || null
})

const selectedCourseTypeName = computed(() => {
  if (selectedCourseType.value) {
    return selectedCourseType.value.name
  }

  return isLearningCourseForm() ? '请选择我上课类型' : '请选择课程类型'
})

const currentStatusOptions = computed(() => {
  return isLearningCourseForm() ? learningStatusOptions : teacherStatusOptions
})

const currentStatusValues = computed(() => {
  return isLearningCourseForm() ? learningStatusValues : teacherStatusValues
})

const courseCountUnit = computed(() => {
  return isLearningCourseForm() ? '项' : '节'
})

const courseList = ref([
  { date: '', startTime: '' }
])

onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const dateStr = currentPage.options?.date || getTodayDateString()
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

const applyCourseTypeDuration = (courseType) => {
  if (!courseType?.duration) return

  const idx = durationValues.indexOf(Number(courseType.duration))
  if (idx >= 0) {
    durationIndex.value = idx
    form.duration = durationValues[idx]
  }
}

const applyDefaultCourseTypeForRole = () => {
  const currentIdx = visibleCourseTypes.value.findIndex(type => type._id === form.courseTypeId)
  if (currentIdx >= 0) {
    courseTypeIndex.value = currentIdx
    return
  }

  const defaultType = visibleCourseTypes.value.find(type => type.isDefault) || visibleCourseTypes.value[0]
  if (!defaultType) {
    courseTypeIndex.value = -1
    form.courseTypeId = ''
    return
  }

  courseTypeIndex.value = visibleCourseTypes.value.findIndex(type => type._id === defaultType._id)
  form.courseTypeId = defaultType._id
  applyCourseTypeDuration(defaultType)
}

const setParticipationRole = (role) => {
  form.participationRole = role

  if (role === 'student') {
    form.studentId = ''
    plannedLessonIndex.value = 1
    form.plannedLessons = 1
    statusIndex.value = 0
    form.status = learningStatusValues[0]
  } else {
    statusIndex.value = 1
    form.status = teacherStatusValues[1]
  }

  applyDefaultCourseTypeForRole()
}

const fetchCourseTypes = async () => {
  try {
    const res = await get('/course-types', { includeAll: true })
    courseTypes.value = res.data || []
    applyDefaultCourseTypeForRole()
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

const applyStudentCourseType = (student) => {
  if (!student) return

  const targetCourseTypeId = student.studentRelationType === 'practice'
    ? courseTypes.value.find(t => t.name === '陪练课' && getCourseTypeRole(t) === 'teacher')?._id
    : (student.defaultCourseTypeId?._id || student.defaultCourseTypeId)

  if (targetCourseTypeId) {
    const idx = visibleCourseTypes.value.findIndex(t => t._id === targetCourseTypeId)
    if (idx >= 0) {
      courseTypeIndex.value = idx
      form.courseTypeId = visibleCourseTypes.value[idx]._id
      applyCourseTypeDuration(visibleCourseTypes.value[idx])
    }
  }
}

const selectStudent = (student) => {
  form.studentId = student._id
  applyStudentCourseType(student)
  
  showStudentPicker.value = false
}

const onCourseTypeChange = (e) => {
  courseTypeIndex.value = e.detail.value
  const courseType = visibleCourseTypes.value[e.detail.value]
  form.courseTypeId = courseType?._id || ''
  applyCourseTypeDuration(courseType)
}

const onDurationChange = (e) => {
  durationIndex.value = e.detail.value
  form.duration = durationValues[e.detail.value]
}

const onPlannedLessonChange = (e) => {
  plannedLessonIndex.value = e.detail.value
  form.plannedLessons = lessonCountValues[e.detail.value]
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
  form.status = currentStatusValues.value[e.detail.value]
}

const getTodayDateString = () => {
  const today = new Date()
  return formatDateString(today)
}

const formatDateString = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const getNextCourseDate = (lastDate) => {
  const baseDate = lastDate || getTodayDateString()
  if (!isDateIncrementEnabled.value) return baseDate

  const days = Number(dateIncrementDays.value)
  if (!Number.isFinite(days) || days < 1) return baseDate

  const nextDate = new Date(`${baseDate}T00:00:00`)
  if (Number.isNaN(nextDate.getTime())) return baseDate

  nextDate.setDate(nextDate.getDate() + Math.floor(days))
  return formatDateString(nextDate)
}

const toggleDateIncrement = () => {
  isDateIncrementEnabled.value = !isDateIncrementEnabled.value
}

const addCourseRow = () => {
  const lastCourse = courseList.value[courseList.value.length - 1]
  const lastStartTime = normalizeTimeInput(lastCourse?.startTime)
  if (lastCourse) {
    lastCourse.startTime = lastStartTime
  }

  courseList.value.push({
    date: getNextCourseDate(lastCourse?.date),
    startTime: lastStartTime
  })
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

const normalizeTimeInput = (value) => {
  const normalized = String(value || '').trim().replace(/\uFF1A/g, ':')
  if (!normalized) return ''

  const match = normalized.match(/^(\d{1,2}):(\d{1,2})$/)
  if (!match) return normalized

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return normalized

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const normalizeItemTime = (index) => {
  const item = courseList.value[index]
  if (!item) return

  item.startTime = normalizeTimeInput(item.startTime)
}

const isValidTime = (value) => {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

const createCourseGroupId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

const handleCancel = () => {
  uni.navigateBack()
}

const buildCoursePayload = (startTime, endTime, groupId) => {
  const payload = {
    participationRole: form.participationRole,
    courseTypeId: form.courseTypeId || undefined,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    plannedLessons: isLearningCourseForm() ? 1 : form.plannedLessons,
    status: form.status,
    notes: '批量添加',
    groupId
  }

  if (isLearningCourseForm()) {
    payload.studentId = null
    payload.externalTeacherName = form.externalTeacherName.trim()
    payload.externalCourseName = selectedCourseType.value?.name || ''
    return payload
  }

  payload.studentId = form.studentId
  return payload
}

const handleSubmit = async () => {
  if (!isLearningCourseForm() && !form.studentId) {
    uni.showToast({ title: '请选择学生', icon: 'none' })
    return
  }

  if (isLearningCourseForm() && !form.courseTypeId) {
    uni.showToast({ title: '请选择我上课的课程类型', icon: 'none' })
    return
  }

  if (isLearningCourseForm() && !form.externalTeacherName.trim()) {
    uni.showToast({ title: '请填写授课老师', icon: 'none' })
    return
  }

  courseList.value.forEach((_, index) => normalizeItemTime(index))
  
  const incompleteCourses = courseList.value.filter(item => !item.date || !item.startTime)
  if (incompleteCourses.length > 0) {
    uni.showToast({ title: '请完善所有课程的日期和时间', icon: 'none' })
    return
  }

  const invalidTimeIndex = courseList.value.findIndex(item => !isValidTime(item.startTime))
  if (invalidTimeIndex >= 0) {
    uni.showToast({ title: `第${invalidTimeIndex + 1}行时间格式错误`, icon: 'none' })
    return
  }
  
  loading.value = true
  
  try {
    const groupId = createCourseGroupId()
    const promises = courseList.value.map(item => {
      const startTime = new Date(`${item.date}T${item.startTime}:00`)
      const endTime = new Date(startTime.getTime() + form.duration * 60000)
      
      const coursePromise = post('/courses', buildCoursePayload(startTime, endTime, groupId))
      
      if (!isLearningCourseForm() && form.status === 'completed') {
        return coursePromise.then(courseRes => {
          return post('/lesson-records', {
            studentId: form.studentId,
            courseId: courseRes.data._id,
            courseTypeId: form.courseTypeId,
            courseStartTime: startTime.toISOString(),
            lessonsConsumed: form.plannedLessons,
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
  background-color: #F7EFE3;
  min-height: 100vh;
}

.form-section {
  background-color: #FFFDF8;
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
  color: #3F352B;
  margin-bottom: 12rpx;
}

.role-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
  padding: 8rpx;
  background-color: #FBF6EE;
  border-radius: 8rpx;
}

.role-option {
  min-width: 0;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6rpx;
  color: #6F6254;
  font-size: 28rpx;
}

.role-option.active {
  background-color: #5F724C;
  color: #FFFDF8;
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
  color: #8B8176;
}

.picker-arrow {
  font-size: 20rpx;
  color: #8B8176;
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
  color: #FFFDF8;
  background: #FFFDF8;
  transition: all 0.2s;
}

.checkbox.checked {
  background: #5F724C;
  border-color: #5F724C;
}

.checkbox-label {
  font-size: 26rpx;
  color: #6F6254;
}

.course-list-section {
  background-color: #FFFDF8;
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
  color: #3F352B;
}

.course-count {
  font-size: 26rpx;
  color: #5F724C;
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
  color: #8B8176;
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
  background-color: #FFFDF8;
}

.time-input {
  width: 100%;
  height: 64rpx;
  box-sizing: border-box;
  padding: 0 16rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #3F352B;
  background-color: #FFFDF8;
}

.picker-arrow-small {
  font-size: 18rpx;
  color: #8B8176;
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
  background-color: #F8E4DD;
  color: #A0523E;
  border-radius: 50%;
  font-size: 24rpx;
}

.date-mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.date-increment-check {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.date-increment-control {
  display: flex;
  align-items: center;
  height: 64rpx;
  padding: 0 18rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  background-color: #FFFDF8;
}

.date-increment-control.disabled {
  opacity: 0.55;
}

.date-increment-input {
  width: 90rpx;
  height: 64rpx;
  font-size: 26rpx;
  color: #3F352B;
  text-align: center;
}

.date-increment-unit {
  font-size: 26rpx;
  color: #6F6254;
  margin-left: 8rpx;
}

.btn-add-row {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #E7EFE3;
  color: #5F724C;
  border: 2rpx dashed #5F724C;
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
  background-color: #FFFDF8;
  color: #6F6254;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-submit {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #5F724C;
  color: #FFFDF8;
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
  background-color: #FFFDF8;
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
  color: #3F352B;
}

.picker-close {
  font-size: 40rpx;
  color: #8B8176;
}

.picker-search {
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.search-input {
  width: 100%;
  height: 70rpx;
  padding: 0 20rpx;
  background-color: #FBF6EE;
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
  background-color: #E7EFE3;
}

.student-item-content {
  display: flex;
  align-items: center;
}

.student-avatar-small {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background-color: #5F724C;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.student-avatar-small text {
  color: #FFFDF8;
  font-size: 26rpx;
  font-weight: bold;
}

.student-item-info {
  display: flex;
  flex-direction: column;
}

.student-item-name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.student-item-name {
  font-size: 30rpx;
  color: #3F352B;
}

.student-relation-tag {
  font-size: 20rpx;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  background-color: #F8E4DD;
  color: #A0523E;
}

.student-item-phone {
  font-size: 24rpx;
  color: #8B8176;
  margin-top: 4rpx;
}

.check-icon {
  color: #5F724C;
  font-size: 32rpx;
}

.empty-student {
  text-align: center;
  padding: 60rpx 0;
  color: #8B8176;
  font-size: 28rpx;
}
</style>
