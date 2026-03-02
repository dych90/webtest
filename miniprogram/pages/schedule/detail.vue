<template>
  <view class="detail-container">
    <view class="info-section">
      <view class="info-header">
        <text class="info-title">课程详情</text>
        <text class="info-status" :class="statusClass">{{ statusText }}</text>
      </view>
      
      <view class="info-list">
        <view class="info-item">
          <text class="info-label">学生</text>
          <text class="info-value">{{ formatStudentName(course.studentId?.name) }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">课程类型</text>
          <text class="info-value">{{ course.courseTypeId?.name || '未设置' }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">上课时间</text>
          <text class="info-value">{{ formatDateTime(course.startTime) }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">结束时间</text>
          <text class="info-value">{{ formatDateTime(course.endTime) }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">备注</text>
          <text class="info-value">{{ course.notes || '未设置' }}</text>
        </view>
      </view>
    </view>
    
    <view class="action-section">
      <button 
        class="btn-edit" 
        @click="handleEdit"
      >
        编辑课程
      </button>
      <button 
        class="btn-attend" 
        @click="handleAttend" 
        v-if="course.status === 'normal'"
      >
        上课
      </button>
      <button 
        class="btn-cancel-attend" 
        @click="handleCancelAttend" 
        v-if="course.status === 'completed'"
      >
        取消上课
      </button>
      <button 
        class="btn-cancel" 
        @click="handleCancel" 
        v-if="course.status === 'normal'"
      >
        取消课程
      </button>
      <button 
        class="btn-delete" 
        @click="handleDelete"
      >
        删除课程
      </button>
    </view>
    
    <view class="dialog-mask" v-if="editDialogVisible" @click.self="editDialogVisible = false">
      <view class="dialog-content" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">编辑课程</text>
          <text class="dialog-close" @click="editDialogVisible = false">×</text>
        </view>
        <view class="dialog-body" @click.stop>
          <view class="form-item">
            <text class="form-label">学生</text>
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
            <text class="form-label">上课日期</text>
            <picker mode="date" :value="editForm.date" @change="onDateChange">
              <view class="form-picker">
                <text>{{ editForm.date || '请选择日期' }} {{ editWeekDayText }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">开始时间</text>
            <picker mode="time" :value="editForm.startTime" start="06:00" end="23:00" @change="onStartTimeChange">
              <view class="form-picker">
                <text>{{ editForm.startTime || '请选择时间' }}</text>
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
          <view class="form-item">
            <text class="form-label">结束时间</text>
            <view class="form-picker readonly">
              <text class="readonly-value">{{ computedEndTime }}</text>
            </view>
          </view>
          <view class="form-item switch-item" @click.stop>
            <text class="form-label">是否重复</text>
            <switch :checked="editForm.isRecurring" @change="onRecurringChange" color="#409EFF" />
          </view>
          <view v-if="editForm.isRecurring" class="recurring-section" @click.stop>
            <view class="recurring-info">
              <text class="recurring-tip">将在此日期的每周{{ editWeekDayText }}重复排课</text>
            </view>
            <view class="form-item">
              <text class="form-label">重复开始日期</text>
              <picker mode="date" :value="editForm.recurringStartDate" @change="onRecurringStartChange">
                <view class="form-picker">
                  <text>{{ editForm.recurringStartDate || editForm.date || '请选择日期' }}</text>
                  <text class="picker-arrow">▼</text>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">重复结束日期</text>
              <picker mode="date" :value="editForm.recurringEndDate" @change="onRecurringEndChange">
                <view class="form-picker">
                  <text>{{ editForm.recurringEndDate || '请选择日期' }}</text>
                  <text class="picker-arrow">▼</text>
                </view>
              </picker>
            </view>
            <view class="recurring-preview" v-if="recurringDates.length > 0">
              <text class="preview-title">将创建 {{ recurringDates.length }} 节新课程</text>
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
            <text class="form-label">备注</text>
            <textarea class="form-textarea" v-model="editForm.notes" placeholder="请输入备注" />
          </view>
        </view>
        <view class="dialog-footer">
          <button class="btn-dialog-cancel" @click="editDialogVisible = false">取消</button>
          <button class="btn-dialog-save" @click="handleSaveEdit">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, put, post, del } from '@/utils/request'

const course = ref({})
const courseId = ref('')
const editDialogVisible = ref(false)
const students = ref([{ name: '请选择学生', _id: '' }])
const courseTypes = ref([{ name: '请选择课程类型', _id: '' }])
const studentIndex = ref(0)
const courseTypeIndex = ref(0)
const dayNames = ['日', '一', '二', '三', '四', '五', '六']

const durationOptions = ['30分钟', '45分钟', '50分钟', '60分钟', '70分钟', '90分钟', '120分钟']
const durationIndex = ref(3)
const durationValues = [30, 45, 50, 60, 70, 90, 120]

const editForm = ref({
  studentId: '',
  courseTypeId: '',
  date: '',
  startTime: '',
  duration: 60,
  isRecurring: false,
  recurringStartDate: '',
  recurringEndDate: '',
  notes: ''
})

const statusText = computed(() => {
  const map = { normal: '待上课', completed: '已完成', cancelled: '已取消' }
  return map[course.value.status] || '待上课'
})

const statusClass = computed(() => {
  const map = { normal: 'status-normal', completed: 'status-completed', cancelled: 'status-cancelled' }
  return map[course.value.status] || 'status-normal'
})

const editWeekDayText = computed(() => {
  if (!editForm.value.date) return ''
  const date = new Date(editForm.value.date)
  return `周${dayNames[date.getDay()]}`
})

const computedEndTime = computed(() => {
  if (!editForm.value.date || !editForm.value.startTime) return '未设置'
  
  const [hours, minutes] = editForm.value.startTime.split(':').map(Number)
  const startDate = new Date(editForm.value.date)
  startDate.setHours(hours, minutes, 0, 0)
  
  const endDate = new Date(startDate.getTime() + editForm.value.duration * 60000)
  
  return `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
})

const recurringDates = computed(() => {
  if (!editForm.value.isRecurring || !editForm.value.recurringStartDate || !editForm.value.recurringEndDate) {
    return []
  }
  
  const dates = []
  const startDate = new Date(editForm.value.recurringStartDate)
  const endDate = new Date(editForm.value.recurringEndDate)
  const originalDate = new Date(editForm.value.date)
  const targetDayOfWeek = originalDate.getDay()
  
  let currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    if (currentDate.getDay() === targetDayOfWeek) {
      const dateStr = formatDate(currentDate)
      if (dateStr !== editForm.value.date) {
        dates.push(new Date(currentDate))
      }
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return dates
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  courseId.value = currentPage.options?.id || ''
  if (courseId.value) {
    fetchCourse()
  }
})

onShow(() => {
  if (courseId.value) {
    fetchCourse()
  }
})

const fetchCourse = async () => {
  try {
    const res = await get(`/courses/${courseId.value}`)
    course.value = res.data || {}
  } catch (error) {
    uni.showToast({ title: '获取课程信息失败', icon: 'none' })
  }
}

const fetchStudents = async () => {
  try {
    const res = await get('/students')
    students.value = [{ name: '请选择学生', _id: '' }, ...(res.data || [])]
    
    const studentId = (course.value.studentId?._id || course.value.studentId || '').toString()
    const idx = students.value.findIndex(s => (s._id || '').toString() === studentId)
    studentIndex.value = idx >= 0 ? idx : 0
  } catch (error) {
    console.error('获取学生列表失败', error)
  }
}

const fetchCourseTypes = async () => {
  try {
    const res = await get('/course-types')
    courseTypes.value = [{ name: '请选择课程类型', _id: '' }, ...(res.data || [])]
    
    const courseTypeId = (course.value.courseTypeId?._id || course.value.courseTypeId || '').toString()
    const idx = courseTypes.value.findIndex(t => (t._id || '').toString() === courseTypeId)
    courseTypeIndex.value = idx >= 0 ? idx : 0
  } catch (error) {
    console.error('获取课程类型列表失败', error)
  }
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const formatDate = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatTime = (date) => {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const formatDateShort = (date) => {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const formatStudentName = (name) => {
  if (!name) return '未分配'
  return name.replace(/（/g, '(').replace(/）/g, ')')
}

const onStudentChange = (e) => {
  studentIndex.value = e.detail.value
  editForm.value.studentId = students.value[e.detail.value]?._id || ''
}

const onCourseTypeChange = (e) => {
  courseTypeIndex.value = e.detail.value
  editForm.value.courseTypeId = courseTypes.value[e.detail.value]?._id || ''
}

const onDateChange = (e) => {
  editForm.value.date = e.detail.value
  if (!editForm.value.recurringStartDate) {
    editForm.value.recurringStartDate = e.detail.value
  }
}

const onStartTimeChange = (e) => {
  editForm.value.startTime = e.detail.value
}

const onDurationChange = (e) => {
  durationIndex.value = e.detail.value
  editForm.value.duration = durationValues[e.detail.value]
}

const onRecurringChange = (e) => {
  editForm.value.isRecurring = e.detail.value
  if (editForm.value.isRecurring) {
    if (!editForm.value.recurringStartDate) {
      editForm.value.recurringStartDate = editForm.value.date
    }
    if (!editForm.value.recurringEndDate) {
      // 默认设置重复结束日期为开始日期后3个月
      const defaultEndDate = new Date(editForm.value.recurringStartDate)
      defaultEndDate.setMonth(defaultEndDate.getMonth() + 3)
      editForm.value.recurringEndDate = formatDate(defaultEndDate)
    }
  }
}

const onRecurringStartChange = (e) => {
  editForm.value.recurringStartDate = e.detail.value
}

const onRecurringEndChange = (e) => {
  editForm.value.recurringEndDate = e.detail.value
}

const handleEdit = async () => {
  await fetchStudents()
  await fetchCourseTypes()
  
  const startTime = new Date(course.value.startTime)
  const endTime = new Date(course.value.endTime)
  const duration = Math.round((endTime - startTime) / 60000)
  
  editForm.value = {
    studentId: course.value.studentId?._id || '',
    courseTypeId: course.value.courseTypeId?._id || '',
    date: formatDate(startTime),
    startTime: formatTime(startTime),
    duration: duration,
    isRecurring: false,
    recurringStartDate: formatDate(startTime),
    recurringEndDate: '',
    notes: course.value.notes || ''
  }
  
  const durIdx = durationValues.findIndex(d => d === duration)
  durationIndex.value = durIdx >= 0 ? durIdx : 3
  
  editDialogVisible.value = true
}

const handleSaveEdit = async () => {
  try {
    const [hours, minutes] = editForm.value.startTime.split(':').map(Number)
    const startDate = new Date(editForm.value.date)
    startDate.setHours(hours, minutes, 0, 0)
    
    const endDate = new Date(startDate.getTime() + editForm.value.duration * 60000)
    
    const updateData = {
      studentId: editForm.value.studentId || null,
      courseTypeId: editForm.value.courseTypeId || null,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      notes: editForm.value.notes
    }
    
    await put(`/courses/${courseId.value}`, updateData)
    
    if (editForm.value.isRecurring && recurringDates.value.length > 0) {
      const promises = recurringDates.value.map(date => {
        const dateStr = formatDate(date)
        const courseStartTime = new Date(`${dateStr}T${editForm.value.startTime}:00`)
        const courseEndTime = new Date(courseStartTime.getTime() + editForm.value.duration * 60000)
        
        return post('/courses', {
          studentId: editForm.value.studentId || undefined,
          courseTypeId: editForm.value.courseTypeId || undefined,
          startTime: courseStartTime.toISOString(),
          endTime: courseEndTime.toISOString(),
          status: 'normal',
          notes: editForm.value.notes
        })
      })
      
      await Promise.all(promises)
      uni.showToast({ title: `保存成功，新增${recurringDates.value.length}节课程`, icon: 'success' })
    } else {
      uni.showToast({ title: '保存成功', icon: 'success' })
    }
    
    editDialogVisible.value = false
    fetchCourse()
  } catch (error) {
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  }
}

const handleAttend = async () => {
  try {
    await put(`/courses/${courseId.value}`, { status: 'completed' })
    await post('/lesson-records', {
      studentId: course.value.studentId._id,
      courseId: course.value._id,
      courseStartTime: course.value.startTime,
      lessonsConsumed: 1,
      lessonContent: '',
      isDeducted: true,
      notes: '从课程详情上课'
    })
    uni.showToast({ title: '上课成功', icon: 'success' })
    fetchCourse()
  } catch (error) {
    uni.showToast({ title: error.message || '上课失败', icon: 'none' })
  }
}

const handleCancelAttend = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要取消上课吗？这将撤销消课记录。',
    success: async (res) => {
      if (res.confirm) {
        try {
          const lessonRecords = await get('/lesson-records', {
            courseId: courseId.value
          })
          
          if (lessonRecords.data && lessonRecords.data.length > 0) {
            const courseIdStr = courseId.value.toString ? courseId.value.toString() : courseId.value
            const record = lessonRecords.data.find(r => {
              const rCourseId = r.courseId?._id ? r.courseId._id : r.courseId
              return (rCourseId?.toString ? rCourseId.toString() : rCourseId) === courseIdStr
            }) || lessonRecords.data[0]
            
            await del(`/lesson-records/${record._id}`)
          }
          
          await put(`/courses/${courseId.value}`, { status: 'normal' })
          
          uni.showToast({ title: '取消上课成功', icon: 'success' })
          fetchCourse()
        } catch (error) {
          uni.showToast({ title: error.message || '取消上课失败', icon: 'none' })
        }
      }
    }
  })
}

const handleCancel = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要取消这节课吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await put(`/courses/${courseId.value}`, { status: 'cancelled' })
          uni.showToast({ title: '课程已取消', icon: 'success' })
          fetchCourse()
        } catch (error) {
          uni.showToast({ title: error.message || '操作失败', icon: 'none' })
        }
      }
    }
  })
}

const handleDelete = async () => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个课程吗？',
    confirmColor: '#F56C6C',
    success: async (res) => {
      if (res.confirm) {
        try {
          await del(`/courses/${courseId.value}`)
          uni.showToast({ title: '删除成功', icon: 'success' })
          setTimeout(() => {
            uni.navigateBack()
          }, 1000)
        } catch (error) {
          uni.showToast({ title: error.message || '删除失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style scoped>
.detail-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.info-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 24rpx;
}

.info-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.info-status {
  font-size: 24rpx;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

.status-normal {
  background-color: #ecf5ff;
  color: #409EFF;
}

.status-completed {
  background-color: #f0f9eb;
  color: #67C23A;
}

.status-cancelled {
  background-color: #fef0f0;
  color: #F56C6C;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
}

.info-label {
  font-size: 28rpx;
  color: #909399;
}

.info-value {
  font-size: 28rpx;
  color: #333;
}

.action-section {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  padding: 20rpx 0;
}

.btn-edit {
  flex: 1;
  min-width: 45%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #409EFF;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-attend {
  flex: 1;
  min-width: 45%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #67C23A;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-cancel-attend {
  flex: 1;
  min-width: 45%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #E6A23C;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-cancel {
  flex: 1;
  min-width: 45%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #fff;
  color: #F56C6C;
  border: 2rpx solid #F56C6C;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-delete {
  flex: 1;
  min-width: 45%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #fff;
  color: #909399;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.dialog-mask {
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

.dialog-content {
  width: 90%;
  max-width: 600rpx;
  background-color: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.dialog-close {
  font-size: 40rpx;
  color: #909399;
}

.dialog-body {
  padding: 30rpx;
  overflow-y: auto;
  flex: 1;
}

.form-item {
  margin-bottom: 24rpx;
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

.form-picker.readonly {
  background-color: #f5f7fa;
  color: #606266;
}

.readonly-value {
  color: #606266;
}

.picker-arrow {
  font-size: 20rpx;
  color: #909399;
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
  margin-bottom: 24rpx;
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

.form-textarea {
  width: 100%;
  height: 160rpx;
  padding: 20rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.dialog-footer {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
}

.btn-dialog-cancel {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #fff;
  color: #606266;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-dialog-save {
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
