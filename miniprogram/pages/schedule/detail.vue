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
          <text class="info-label">计划课时</text>
          <text class="info-value">{{ getCoursePlannedLessons(course) }}</text>
        </view>
        <view class="info-item" v-if="showCourseTeacher">
          <text class="info-label">老师</text>
          <text class="info-value">{{ course.teacherId.name }}</text>
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

    <view class="record-section" v-if="course.lessonRecord">
      <view class="record-header">
        <text class="record-title">消课记录</text>
        <button class="btn-record-detail" @click="goEditLessonRecord">
          {{ canManageCourse ? '编辑记录' : '查看记录' }}
        </button>
      </view>
      <view class="record-body">
        <text class="record-text" v-if="course.lessonRecord.lessonContent">{{ course.lessonRecord.lessonContent }}</text>
        <text class="record-media" v-if="getMediaSummary(course.lessonRecord)">{{ getMediaSummary(course.lessonRecord) }}</text>
        <text class="record-meta">记录 {{ course.lessonRecord.lessonsConsumed || 0 }} 课时</text>
      </view>
    </view>
    
    <view class="action-section" v-if="canManageCourse">
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
        class="btn-restore"
        @click="handleRestoreCourse"
        v-if="course.status === 'cancelled'"
      >
        恢复课程
      </button>
      <button
        class="btn-delete" 
        @click="handleDelete"
      >
        删除课程
      </button>
      <button 
        class="btn-delete-group" 
        @click="handleDeleteGroup"
        v-if="course.groupId"
      >
        批量删除同组
      </button>
      <button 
        class="btn-reschedule" 
        @click="openRescheduleDialog"
        v-if="course.groupId"
      >
        重新排课
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
            <view class="student-picker" @click="openStudentPicker">
              <view class="form-picker">
                <text :class="{ placeholder: !editForm.studentId }">{{ getSelectedStudentName() }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </view>
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
            <picker mode="time" :value="editForm.startTime" start="08:00" end="23:00" @change="onStartTimeChange">
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
            <text class="form-label">计划课时</text>
            <picker :value="plannedLessonIndex" :range="lessonCountOptions" @change="onPlannedLessonChange">
              <view class="form-picker">
                <text>{{ lessonCountOptions[plannedLessonIndex] }}</text>
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
            <switch :checked="editForm.isRecurring" @change="onRecurringChange" color="#5F724C" />
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
            <view v-if="course.groupId" class="batch-operation-section">
              <view class="batch-operation-item" @click="toggleApplyToGroup">
                <view class="checkbox" :class="{ checked: applyToGroup }">
                  <text v-if="applyToGroup">✓</text>
                </view>
                <text class="batch-operation-label">应用到同组课程</text>
              </view>
            </view>
            <view v-if="applyToGroup && course.groupId" class="batch-operation-section">
              <view class="batch-operation-label">更新范围</view>
              <view class="radio-group">
                <view class="radio-item" @click="updateScope = 'all'">
                  <view class="radio" :class="{ checked: updateScope === 'all' }">
                    <text v-if="updateScope === 'all'">●</text>
                    <text v-else>○</text>
                  </view>
                  <text class="radio-label">全部更新（{{ groupCourseCount }}节）</text>
                </view>
                <view class="radio-item" @click="updateScope = 'fromCurrent'">
                  <view class="radio" :class="{ checked: updateScope === 'fromCurrent' }">
                    <text v-if="updateScope === 'fromCurrent'">●</text>
                    <text v-else>○</text>
                  </view>
                  <text class="radio-label">从当前课程开始更新（{{ groupCourseCount - courseIndex }}节）</text>
                </view>
                <view class="radio-item" @click="updateScope = 'uncompleted'">
                  <view class="radio" :class="{ checked: updateScope === 'uncompleted' }">
                    <text v-if="updateScope === 'uncompleted'">●</text>
                    <text v-else>○</text>
                  </view>
                  <text class="radio-label">只更新未上课的课程</text>
                </view>
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

    <view class="student-picker-mask" v-if="showStudentPicker" @click.self="closeStudentPicker">
      <view class="student-picker-dialog" @click.stop>
        <view class="picker-header">
          <text class="picker-title">选择学生</text>
          <text class="picker-close" @click="closeStudentPicker">×</text>
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
            class="picker-item clear-student-item"
            :class="{ selected: !editForm.studentId }"
            @click="selectStudent(null)"
          >
            <view class="student-item-content">
              <view class="student-avatar-small empty-avatar">
                <text>-</text>
              </view>
              <view class="student-item-info">
                <text class="student-item-name">不分配学生</text>
              </view>
            </view>
            <view class="check-icon" v-if="!editForm.studentId">✓</view>
          </view>
          <view
            v-for="student in filteredStudents"
            :key="student._id"
            class="picker-item"
            :class="{ selected: editForm.studentId === student._id }"
            @click="selectStudent(student)"
          >
            <view class="student-item-content">
              <view class="student-avatar-small">
                <text>{{ (student.name || '').charAt(0) || '?' }}</text>
              </view>
              <view class="student-item-info">
                <view class="student-item-name-row">
                  <text class="student-item-name">{{ formatStudentName(student.name) }}</text>
                  <text v-if="student.studentRelationType === 'practice'" class="student-relation-tag">陪练</text>
                </view>
                <text class="student-item-phone" v-if="student.phone">{{ student.phone }}</text>
              </view>
            </view>
            <view class="check-icon" v-if="editForm.studentId === student._id">✓</view>
          </view>
          <view v-if="filteredStudents.length === 0" class="empty-student">
            <text>未找到匹配的学生</text>
          </view>
        </scroll-view>
      </view>
    </view>
    
    <view class="dialog-mask" v-if="rescheduleDialogVisible" @click.self="rescheduleDialogVisible = false">
      <view class="dialog-content" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">重新排课</text>
          <text class="dialog-close" @click="rescheduleDialogVisible = false">×</text>
        </view>
        <view class="dialog-body" @click.stop>
          <view class="reschedule-info">
            <text class="reschedule-tip">从第 {{ courseIndex + 1 }} 节课程开始修改，前面的 {{ courseIndex }} 节课程保持不变</text>
          </view>
          <view class="form-item">
            <text class="form-label">开始日期</text>
            <picker mode="date" :value="rescheduleForm.newStartDate" @change="onRescheduleStartChange">
              <view class="form-picker">
                <text>{{ rescheduleForm.newStartDate || '请选择日期' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">结束日期</text>
            <picker mode="date" :value="rescheduleForm.newEndDate" @change="onRescheduleEndChange">
              <view class="form-picker">
                <text>{{ rescheduleForm.newEndDate || '请选择日期' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">开始时间</text>
            <picker mode="time" :value="rescheduleForm.newStartTime" start="08:00" end="23:00" @change="onRescheduleTimeChange">
              <view class="form-picker">
                <text>{{ rescheduleForm.newStartTime || '请选择时间' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">课程时长</text>
            <picker :value="rescheduleDurationIndex" :range="durationOptions" @change="onRescheduleDurationChange">
              <view class="form-picker">
                <text>{{ durationOptions[rescheduleDurationIndex] }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item" v-if="rescheduleForm.newStartDate">
            <text class="form-label">排课星期</text>
            <view class="form-picker readonly">
              <text class="weekday-tag">{{ getDayOfWeekName(rescheduleForm.newStartDate) }}</text>
              <text class="weekday-tip">由开始日期自动确定</text>
            </view>
          </view>
          <view class="reschedule-preview" v-if="reschedulePreviewCount > 0">
            <text class="preview-title">将创建 {{ reschedulePreviewCount }} 节课程</text>
          </view>
        </view>
        <view class="dialog-footer">
          <button class="btn-dialog-cancel" @click="rescheduleDialogVisible = false">取消</button>
          <button class="btn-dialog-save" @click="handleReschedule">确认重新排课</button>
        </view>
      </view>
    </view>
    
    <view class="dialog-mask" v-if="attendDialogVisible" @click.self="attendDialogVisible = false">
      <view class="dialog-content" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">确认上课</text>
          <text class="dialog-close" @click="attendDialogVisible = false">×</text>
        </view>
        <view class="dialog-body">
          <view class="attend-info">
            <text class="attend-student">{{ formatStudentName(course.studentId?.name) }}</text>
            <text class="attend-course">{{ course.courseTypeId?.name || '未设置' }}</text>
            <text class="attend-time">{{ formatDateTime(course.startTime) }}</text>
          </view>
          <view class="form-item">
            <text class="form-label">记录课时</text>
            <picker :value="lessonCountIndex" :range="lessonCountOptions" @change="onLessonCountChange">
              <view class="form-picker">
                <text>{{ lessonCountOptions[lessonCountIndex] }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
        </view>
        <view class="dialog-footer">
          <button class="btn-dialog-cancel" @click="attendDialogVisible = false">取消</button>
          <button class="btn-dialog-save" @click="confirmAttendFromDialog">确认上课</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, put, post, del } from '@/utils/request'
import { emitRewardStateChanged } from '@/utils/rewardEvents'

const course = ref({})
const courseId = ref('')
const editDialogVisible = ref(false)
const rescheduleDialogVisible = ref(false)
const students = ref([])
const filteredStudents = ref([])
const studentSearchText = ref('')
const showStudentPicker = ref(false)
const courseTypes = ref([{ name: '请选择课程类型', _id: '' }])
const courseTypeIndex = ref(0)
const dayNames = ['日', '一', '二', '三', '四', '五', '六']

const durationOptions = ['30分钟', '45分钟', '50分钟', '60分钟', '70分钟', '90分钟', '120分钟']
const durationIndex = ref(3)
const durationValues = [30, 45, 50, 60, 70, 90, 120]
const rescheduleDurationIndex = ref(3)
const DEFAULT_PLANNED_LESSONS = 1
const plannedLessonIndex = ref(1)

const editForm = ref({
  studentId: '',
  courseTypeId: '',
  date: '',
  startTime: '',
  duration: 60,
  plannedLessons: DEFAULT_PLANNED_LESSONS,
  isRecurring: false,
  recurringStartDate: '',
  recurringEndDate: '',
  notes: ''
})

const rescheduleForm = ref({
  newStartDate: '',
  newEndDate: '',
  newStartTime: '',
  duration: 60
})

const applyToGroup = ref(false)
const groupCourseCount = ref(0)
const courseIndex = ref(0)
const allCourses = ref([])
const updateScope = ref('all')
const attendDialogVisible = ref(false)
const lessonCountIndex = ref(1)
const lessonCountOptions = ['0.5节', '1节', '1.5节', '2节', '2.5节', '3节', '3.5节', '4节', '4.5节', '5节']
const lessonCountValues = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

const getCoursePlannedLessons = (courseItem) => {
  const plannedLessons = Number(courseItem?.plannedLessons)
  if (!Number.isFinite(plannedLessons) || plannedLessons <= 0) {
    return DEFAULT_PLANNED_LESSONS
  }

  return Math.round((plannedLessons + Number.EPSILON) * 100) / 100
}

const getLessonCountIndexByValue = (value) => {
  const targetValue = getCoursePlannedLessons({ plannedLessons: value })
  let closestIndex = 0
  let minDiff = Number.POSITIVE_INFINITY

  lessonCountValues.forEach((option, index) => {
    const diff = Math.abs(option - targetValue)
    if (diff < minDiff) {
      minDiff = diff
      closestIndex = index
    }
  })

  return closestIndex
}

const statusText = computed(() => {
  const map = { normal: '待上课', completed: '已完成', cancelled: '已取消' }
  return map[course.value.status] || '待上课'
})

const statusClass = computed(() => {
  const map = { normal: 'status-normal', completed: 'status-completed', cancelled: 'status-cancelled' }
  return map[course.value.status] || 'status-normal'
})

const canManageCourse = computed(() => Boolean(course.value?._id) && course.value.canManageCourse !== false)
const showCourseTeacher = computed(() => Boolean(course.value?.teacherId?.name && !canManageCourse.value))

const ensureCanManageCourse = () => {
  if (canManageCourse.value) return true
  uni.showToast({ title: '只能查看该课程', icon: 'none' })
  return false
}

const getMediaSummary = (record) => {
  const mediaItems = record?.mediaItems || []
  const imageCount = mediaItems.filter(item => item.type === 'image').length
  const audioCount = mediaItems.filter(item => item.type === 'audio').length
  const parts = []

  if (imageCount > 0) {
    parts.push(`${imageCount}张照片`)
  }
  if (audioCount > 0) {
    parts.push(`${audioCount}段语音`)
  }

  return parts.join('，')
}

const goEditLessonRecord = () => {
  const recordId = course.value?.lessonRecord?._id
  if (!recordId) return

  uni.navigateTo({
    url: `/pages/lessons/edit?id=${recordId}`
  })
}

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

const reschedulePreviewCount = computed(() => {
  if (!rescheduleForm.value.newStartDate || !rescheduleForm.value.newEndDate) {
    return 0
  }
  
  const startDate = new Date(rescheduleForm.value.newStartDate)
  const endDate = new Date(rescheduleForm.value.newEndDate)
  const targetDayOfWeek = startDate.getDay()
  
  let count = 0
  let currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    if (currentDate.getDay() === targetDayOfWeek) {
      count++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return count
})

const getDayOfWeekName = (dateStr) => {
  const date = new Date(dateStr)
  return `周${dayNames[date.getDay()]}`
}

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
    students.value = res.data || []
    filteredStudents.value = [...students.value]
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

const fetchAllCourses = async () => {
  try {
    const res = await get('/courses')
    allCourses.value = res.data || []
  } catch (error) {
    console.error('获取课程列表失败', error)
  }
}

const toggleApplyToGroup = () => {
  applyToGroup.value = !applyToGroup.value
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

const openStudentPicker = () => {
  studentSearchText.value = ''
  filteredStudents.value = [...students.value]
  showStudentPicker.value = true
}

const closeStudentPicker = () => {
  showStudentPicker.value = false
}

const filterStudents = () => {
  const keyword = studentSearchText.value.trim().toLowerCase()
  if (!keyword) {
    filteredStudents.value = [...students.value]
    return
  }

  filteredStudents.value = students.value.filter(student =>
    (student.name || '').toLowerCase().includes(keyword)
  )
}

const getSelectedStudentName = () => {
  if (!editForm.value.studentId) return '请选择学生'

  const selectedId = editForm.value.studentId.toString()
  const student = students.value.find(s => (s._id || '').toString() === selectedId)
  return student ? formatStudentName(student.name) : '请选择学生'
}

const selectStudent = (student) => {
  if (!student) {
    editForm.value.studentId = ''
    closeStudentPicker()
    return
  }

  editForm.value.studentId = student._id
  closeStudentPicker()
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

const onPlannedLessonChange = (e) => {
  plannedLessonIndex.value = e.detail.value
  editForm.value.plannedLessons = lessonCountValues[e.detail.value]
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

const onRescheduleStartChange = (e) => {
  rescheduleForm.value.newStartDate = e.detail.value
}

const onRescheduleEndChange = (e) => {
  rescheduleForm.value.newEndDate = e.detail.value
}

const onRescheduleTimeChange = (e) => {
  rescheduleForm.value.newStartTime = e.detail.value
}

const onRescheduleDurationChange = (e) => {
  rescheduleDurationIndex.value = e.detail.value
  rescheduleForm.value.duration = durationValues[e.detail.value]
}

const handleEdit = async () => {
  if (!ensureCanManageCourse()) return

  await fetchStudents()
  await fetchCourseTypes()
  await fetchAllCourses()
  
  const startTime = new Date(course.value.startTime)
  const endTime = new Date(course.value.endTime)
  const duration = Math.round((endTime - startTime) / 60000)
  
  if (course.value.groupId) {
    const groupCourses = allCourses.value.filter(c => c.groupId === course.value.groupId)
    groupCourseCount.value = groupCourses.length
    courseIndex.value = groupCourses.findIndex(c => c._id === course.value._id)
  } else {
    groupCourseCount.value = 0
    courseIndex.value = 0
  }
  
  editForm.value = {
    studentId: course.value.studentId?._id || '',
    courseTypeId: course.value.courseTypeId?._id || '',
    date: formatDate(startTime),
    startTime: formatTime(startTime),
    duration: duration,
    plannedLessons: getCoursePlannedLessons(course.value),
    isRecurring: false,
    recurringStartDate: formatDate(startTime),
    recurringEndDate: '',
    notes: course.value.notes || ''
  }
  
  applyToGroup.value = false
  updateScope.value = 'all'
  
  const durIdx = durationValues.findIndex(d => d === duration)
  durationIndex.value = durIdx >= 0 ? durIdx : 3
  plannedLessonIndex.value = getLessonCountIndexByValue(editForm.value.plannedLessons)
  
  editDialogVisible.value = true
}

const handleSaveEdit = async () => {
  if (!ensureCanManageCourse()) return

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
      plannedLessons: editForm.value.plannedLessons,
      notes: editForm.value.notes
    }
    
    if (applyToGroup.value && course.value.groupId) {
      const groupCourses = allCourses.value.filter(c => c.groupId === course.value.groupId)
      const [hours, minutes] = editForm.value.startTime.split(':')
      
      const coursesToUpdate = groupCourses.slice(courseIndex.value)
      
      const updatePromises = coursesToUpdate.map(courseItem => {
        const originalDate = new Date(courseItem.startTime)
        const newStartTime = new Date(originalDate)
        newStartTime.setHours(parseInt(hours))
        newStartTime.setMinutes(parseInt(minutes))
        const newEndTime = new Date(newStartTime.getTime() + editForm.value.duration * 60000)
        
        return put(`/courses/${courseItem._id}`, {
          studentId: editForm.value.studentId || null,
          courseTypeId: editForm.value.courseTypeId || null,
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
          plannedLessons: editForm.value.plannedLessons,
          notes: editForm.value.notes
        })
      })
      
      await Promise.all(updatePromises)
      uni.showToast({ title: `成功更新${coursesToUpdate.length}节课程`, icon: 'success' })
    } else {
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
            plannedLessons: editForm.value.plannedLessons,
            status: 'normal',
            notes: editForm.value.notes
          })
        })
        
        await Promise.all(promises)
        uni.showToast({ title: `保存成功`, icon: 'success' })
      } else {
        uni.showToast({ title: '保存成功', icon: 'success' })
      }
    }
    
    editDialogVisible.value = false
    fetchCourse()
  } catch (error) {
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  }
}

const openRescheduleDialog = async () => {
  if (!ensureCanManageCourse()) return

  await fetchAllCourses()
  
  const startTime = new Date(course.value.startTime)
  const endTime = new Date(course.value.endTime)
  const duration = Math.round((endTime - startTime) / 60000)
  
  if (course.value.groupId) {
    const groupCourses = allCourses.value.filter(c => c.groupId === course.value.groupId)
    groupCourseCount.value = groupCourses.length
    courseIndex.value = groupCourses.findIndex(c => c._id === course.value._id)
  }
  
  rescheduleForm.value = {
    newStartDate: formatDate(startTime),
    newEndDate: formatDate(startTime),
    newStartTime: formatTime(startTime),
    duration: duration
  }
  
  const durIdx = durationValues.findIndex(d => d === duration)
  rescheduleDurationIndex.value = durIdx >= 0 ? durIdx : 3
  
  rescheduleDialogVisible.value = true
}

const handleReschedule = async () => {
  if (!ensureCanManageCourse()) return

  try {
    if (!rescheduleForm.value.newStartDate || !rescheduleForm.value.newEndDate || !rescheduleForm.value.newStartTime) {
      uni.showToast({ title: '请填写完整的重新排课信息', icon: 'none' })
      return
    }
    
    const response = await post(`/courses/group/${course.value.groupId}/reschedule`, {
      fromCourseId: course.value._id,
      newStartDate: rescheduleForm.value.newStartDate,
      newEndDate: rescheduleForm.value.newEndDate,
      newStartTime: rescheduleForm.value.newStartTime,
      duration: rescheduleForm.value.duration,
      plannedLessons: getCoursePlannedLessons(course.value)
    })
    
    uni.showToast({ title: response.message || '重新排课成功', icon: 'success' })
    rescheduleDialogVisible.value = false
    
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error) {
    uni.showToast({ title: error.message || '重新排课失败', icon: 'none' })
  }
}

const handleAttend = async () => {
  if (!ensureCanManageCourse()) return

  if (!course.value.courseTypeId?._id && !course.value.courseTypeId) {
    uni.showModal({
      title: '提示',
      content: '该课程未设置课程类型，上课后无法记录收入。是否继续上课？',
      success: async (res) => {
        if (res.confirm) {
          lessonCountIndex.value = getLessonCountIndexByValue(getCoursePlannedLessons(course.value))
          attendDialogVisible.value = true
        }
      }
    })
    return
  }
  
  lessonCountIndex.value = getLessonCountIndexByValue(getCoursePlannedLessons(course.value))
  attendDialogVisible.value = true
}

const onLessonCountChange = (e) => {
  lessonCountIndex.value = e.detail.value
}

const confirmAttendFromDialog = async () => {
  if (!ensureCanManageCourse()) return

  attendDialogVisible.value = false
  await doAttend(lessonCountValues[lessonCountIndex.value])
}

const doAttend = async (lessonsConsumed = 1) => {
  if (!ensureCanManageCourse()) return

  try {
    await put(`/courses/${courseId.value}`, { status: 'completed' })
    
    const studentId = course.value.studentId?._id || course.value.studentId
    if (!studentId) {
      uni.showToast({ title: '课程缺少学生信息', icon: 'none' })
      return
    }
    
    const courseTypeId = course.value.courseTypeId?._id || course.value.courseTypeId
    
    await post('/lesson-records', {
      studentId: studentId,
      courseId: course.value._id,
      courseTypeId: courseTypeId,
      courseStartTime: course.value.startTime,
      lessonsConsumed: lessonsConsumed,
      lessonContent: '',
      isDeducted: true,
      notes: '从课程详情上课'
    })
    emitRewardStateChanged({ source: 'schedule-detail-attend', studentId })
    uni.showToast({ title: '上课成功', icon: 'success' })
    fetchCourse()
  } catch (error) {
    uni.showToast({ title: error.message || '上课失败', icon: 'none' })
  }
}

const handleCancelAttend = async () => {
  if (!ensureCanManageCourse()) return

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
          emitRewardStateChanged({ source: 'schedule-detail-cancel-attend', studentId: course.value.studentId?._id || course.value.studentId })
          
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
  if (!ensureCanManageCourse()) return

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

const handleRestoreCourse = async () => {
  if (!ensureCanManageCourse()) return

  uni.showModal({
    title: '提示',
    content: '确定要恢复这节课为待上课吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await put(`/courses/${courseId.value}`, { status: 'normal' })
          uni.showToast({ title: '课程已恢复', icon: 'success' })
          fetchCourse()
        } catch (error) {
          uni.showToast({ title: error.message || '恢复失败', icon: 'none' })
        }
      }
    }
  })
}

const handleDelete = async () => {
  if (!ensureCanManageCourse()) return

  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个课程吗？',
    confirmColor: '#A0523E',
    success: async (res) => {
      if (res.confirm) {
        try {
          await del(`/courses/${courseId.value}`)
          emitRewardStateChanged({ source: 'schedule-detail-delete-course', studentId: course.value.studentId?._id || course.value.studentId })
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

const handleDeleteGroup = async () => {
  if (!ensureCanManageCourse()) return

  await fetchAllCourses()
  const count = allCourses.value.filter(c => c.groupId === course.value.groupId).length
  
  uni.showModal({
    title: '批量删除确认',
    content: `确定要删除同组的${count}节课程吗？此操作不可恢复！`,
    confirmColor: '#A0523E',
    success: async (res) => {
      if (res.confirm) {
        try {
          await del(`/courses/group/${course.value.groupId}`)
          emitRewardStateChanged({ source: 'schedule-detail-delete-course-group', studentId: course.value.studentId?._id || course.value.studentId })
          uni.showToast({ title: `成功删除${count}节课程`, icon: 'success' })
          setTimeout(() => {
            uni.navigateBack()
          }, 1000)
        } catch (error) {
          uni.showToast({ title: error.message || '批量删除失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style scoped>
.detail-container {
  padding: 20rpx;
  background-color: #F7EFE3;
  min-height: 100vh;
}

.info-section {
  background-color: #FFFDF8;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.record-section {
  background-color: #FFFDF8;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 20rpx;
}

.record-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #3F352B;
}

.record-body {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.record-text {
  font-size: 28rpx;
  line-height: 40rpx;
  color: #3F352B;
}

.record-media {
  font-size: 26rpx;
  color: #5F724C;
}

.record-meta {
  font-size: 24rpx;
  color: #8B8176;
}

.btn-record-detail {
  min-width: 160rpx;
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 20rpx;
  background-color: #E7EFE3;
  color: #5F724C;
  border: 2rpx solid #5F724C;
  border-radius: 8rpx;
  font-size: 26rpx;
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
  color: #3F352B;
}

.info-status {
  font-size: 24rpx;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

.status-normal {
  background-color: #E7EFE3;
  color: #5F724C;
}

.status-completed {
  background-color: #EAF1E3;
  color: #5F724C;
}

.status-cancelled {
  background-color: #F8E4DD;
  color: #A0523E;
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
  color: #8B8176;
}

.info-value {
  font-size: 28rpx;
  color: #3F352B;
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
  background-color: #5F724C;
  color: #FFFDF8;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-attend {
  flex: 1;
  min-width: 45%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #5F724C;
  color: #FFFDF8;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-cancel-attend {
  flex: 1;
  min-width: 45%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #A26B39;
  color: #FFFDF8;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-cancel {
  flex: 1;
  min-width: 45%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #FFFDF8;
  color: #A0523E;
  border: 2rpx solid #A0523E;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-restore {
  flex: 1;
  min-width: 45%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #5F724C;
  color: #FFFDF8;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-delete {
  flex: 1;
  min-width: 45%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #FFFDF8;
  color: #8B8176;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-delete-group {
  flex: 1;
  min-width: 45%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #FFFDF8;
  color: #A26B39;
  border: 2rpx solid #A26B39;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-reschedule {
  flex: 1;
  min-width: 45%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #5F724C;
  color: #FFFDF8;
  border: none;
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
  background-color: #FFFDF8;
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
  color: #3F352B;
}

.dialog-close {
  font-size: 40rpx;
  color: #8B8176;
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
  color: #3F352B;
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

.form-picker .placeholder {
  color: #8B8176;
}

.form-picker.readonly {
  background-color: #FBF6EE;
  color: #6F6254;
}

.readonly-value {
  color: #6F6254;
}

.picker-arrow {
  font-size: 20rpx;
  color: #8B8176;
}

.switch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.switch-item .form-label {
  margin-bottom: 0;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox.checked {
  background-color: #A26B39;
  border-color: #A26B39;
}

.checkbox text {
  color: #FFFDF8;
  font-size: 24rpx;
}

.recurring-section {
  background-color: #FBF6EE;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
}

.recurring-info {
  margin-bottom: 20rpx;
}

.recurring-tip {
  font-size: 26rpx;
  color: #5F724C;
}

.recurring-preview {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #E7D8C7;
}

.preview-title {
  font-size: 26rpx;
  color: #3F352B;
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
  color: #6F6254;
  background-color: #FFFDF8;
  padding: 6rpx 12rpx;
  border-radius: 6rpx;
}

.preview-more {
  font-size: 24rpx;
  color: #8B8176;
}

.batch-operation-section {
  background-color: #F6E8C9;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid #ffd591;
}

.batch-operation-item {
  display: flex;
  align-items: center;
  padding: 12rpx;
}

.batch-operation-label {
  flex: 1;
  font-size: 26rpx;
  color: #A26B39;
  margin-left: 12rpx;
}

.btn-dialog-save {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #5F724C;
  color: #FFFDF8;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.reschedule-info {
  background-color: #E7EFE3;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
}

.reschedule-info .reschedule-tip {
  color: #5F724C;
  font-size: 26rpx;
}

.reschedule-preview {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #E7D8C7;
}

.weekday-tag {
  background-color: #5F724C;
  color: #FFFDF8;
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  font-size: 26rpx;
}

.weekday-tip {
  margin-left: 16rpx;
  color: #8B8176;
  font-size: 24rpx;
}

.dialog-footer {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
}

.btn-dialog-cancel {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #FFFDF8;
  color: #6F6254;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.attend-info {
  text-align: center;
  margin-bottom: 30rpx;
  padding: 20rpx;
  background-color: #FBF6EE;
  border-radius: 12rpx;
}

.attend-student {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #3F352B;
  margin-bottom: 8rpx;
}

.attend-course {
  display: block;
  font-size: 26rpx;
  color: #6F6254;
  margin-bottom: 4rpx;
}

.attend-time {
  display: block;
  font-size: 24rpx;
  color: #8B8176;
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
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.student-picker-dialog {
  width: 90%;
  max-width: 600rpx;
  background-color: #FFFDF8;
  border-radius: 20rpx;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.student-avatar-small.empty-avatar {
  background-color: #8B8176;
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
