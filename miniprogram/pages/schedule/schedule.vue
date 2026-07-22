<template>
  <view class="schedule-container">
    <view class="view-tabs">
      <view 
        class="tab-item" 
        :class="{ active: viewMode === 'year' }" 
        @click="viewMode = 'year'"
      >
        年
      </view>
      <view 
        class="tab-item" 
        :class="{ active: viewMode === 'month' }" 
        @click="viewMode = 'month'"
      >
        月
      </view>
      <view 
        class="tab-item" 
        :class="{ active: viewMode === 'week' }" 
        @click="viewMode = 'week'"
      >
        周
      </view>
      <view 
        class="tab-item" 
        :class="{ active: viewMode === 'day' }" 
        @click="viewMode = 'day'"
      >
        日
      </view>
    </view>
    
    <view class="date-nav">
      <view class="nav-btn" @click="prevPeriod">
        <text>‹</text>
      </view>
      <view class="current-period">
        <text>{{ periodText }}</text>
      </view>
      <view class="nav-btn" @click="nextPeriod">
        <text>›</text>
      </view>
      <view class="date-actions">
        <view class="today-btn" @click="goToday">
          <text>今天</text>
        </view>
        <view
          v-if="viewMode === 'week'"
          class="image-btn"
          :class="{ disabled: generatingImage }"
          @click="saveWeekScheduleImage"
        >
          <text>{{ generatingImage ? '生成中' : '生成图片' }}</text>
        </view>
      </view>
    </view>
    
    <view v-if="viewMode === 'year'" class="year-view">
      <scroll-view scroll-y class="year-scroll">
        <view 
          v-for="month in yearMonths" 
          :key="month.month" 
          class="year-month-card"
          @click="selectMonth(month.month)"
        >
          <view class="year-month-header">
            <text class="year-month-title">{{ month.month + 1 }}月</text>
            <text class="year-month-count">{{ month.courseCountLabel }} {{ month.courseCount }} 节</text>
          </view>
          <view class="year-month-grid">
            <view class="year-day-name" v-for="name in dayNames" :key="name">{{ name }}</view>
            <view 
              v-for="(day, index) in month.days" 
              :key="index"
              class="year-day"
              :class="{ 
                'other-month': day.otherMonth,
                'is-today': day.isToday,
                'has-courses': day.courseCount > 0
              }"
            >
              <text class="year-day-number">{{ day.dayNumber }}</text>
              <view v-if="day.courseCount > 0" class="year-dot"></view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
    
    <view v-if="viewMode === 'month'" class="month-view">
      <view class="month-header">
        <view class="month-day-name" v-for="name in dayNames" :key="name">{{ name }}</view>
      </view>
      <view class="month-grid">
        <view 
          v-for="(day, index) in monthDays" 
          :key="index"
          class="month-day"
          :class="{ 
            'other-month': day.otherMonth,
            'is-today': day.isToday,
            'is-selected': day.date === selectedDate,
            'has-courses': day.courseCount > 0,
            'has-pending-overdue': day.hasPendingOverdue
          }"
          @click="selectDate(day)"
        >
          <view v-if="day.hasPendingOverdue" class="month-overdue-mark">!</view>
          <text class="day-number">{{ day.dayNumber }}</text>
          <text v-if="day.courseCount > 0" class="course-count">{{ day.courseCount }}节</text>
        </view>
      </view>
    </view>
    
    <view v-if="viewMode === 'week'" class="week-calendar-view">
      <view class="week-calendar-header">
        <view class="week-time-header"></view>
        <view
          v-for="day in weekDays"
          :key="day.date"
          class="week-day-header"
          :class="{
            'is-today': day.isToday,
            'is-selected': day.date === selectedDate,
            'has-courses': day.courseCount > 0
          }"
          @click="selectWeekDate(day.date)"
        >
          <text class="week-header-name">{{ day.dayName }}</text>
          <text class="week-header-date">{{ day.dayNumber }}</text>
          <text v-if="day.courseCount > 0" class="week-header-count">{{ day.courseCount }}</text>
        </view>
      </view>

      <scroll-view scroll-y class="week-calendar-scroll">
        <view v-if="weekTimeRows.length === 0" class="empty-tip">
          本周暂无课程安排
        </view>

        <view v-else class="week-calendar-grid">
          <view
            v-for="row in weekTimeRows"
            :key="row.hour"
            class="week-time-row"
          >
            <view class="week-time-label">{{ row.label }}</view>
            <view
              v-for="cell in row.cells"
              :key="cell.date"
              class="week-time-cell"
              :class="{
                'is-today': cell.isToday,
                'has-courses': cell.courses.length > 0
              }"
              @click="handleWeekCellClick(cell.date, row.hour)"
            >
              <view
                v-for="course in cell.courses"
                :key="course._id"
                class="week-calendar-course"
                :class="[
                  getCourseRoleClass(course),
                  {
                    'completed': course.status === 'completed',
                    'cancelled': course.status === 'cancelled',
                    'pending-overdue': isPendingOverdueCourse(course)
                  }
                ]"
                @click.stop="goToDetail(course)"
              >
                <view v-if="isPendingOverdueCourse(course)" class="week-calendar-overdue-mark">!</view>
                <text class="week-calendar-time">{{ formatTime(course.startTime) }}</text>
                <text class="week-calendar-role">{{ getCourseRoleText(course) }}</text>
                <text class="week-calendar-name">{{ getCoursePersonName(course) }}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
    
    <view v-if="viewMode === 'day'" class="day-header">
      <text class="day-title">{{ selectedDateText }}</text>
    </view>
    
    <view v-if="viewMode !== 'week'" class="course-list">
      <view v-if="dayCourses.length === 0" class="empty-tip">
        当日暂无课程安排
      </view>
      
      <view v-else class="course-list-sections">
        <view
          v-for="section in dayCourseSections"
          :key="section.key"
          class="course-section"
        >
          <view class="course-section-header">
            <text class="course-section-title">{{ section.title }}</text>
            <text class="course-section-count">{{ section.items.length }}节</text>
          </view>

          <view class="course-timeline">
            <view
              v-for="(course, index) in section.items"
              :key="course._id"
              class="course-item"
              :class="[
                getCourseRoleClass(course),
                {
                  'completed': course.status === 'completed',
                  'cancelled': course.status === 'cancelled'
                }
              ]"
              @click="goToDetail(course)"
            >
              <view class="timeline-dot">
                <text class="dot-number">{{ index + 1 }}</text>
              </view>
              <view class="timeline-line"></view>
              <view class="course-content">
                <view class="course-time">
                  <text>{{ formatTime(course.startTime) }} - {{ formatTime(course.endTime) }}</text>
                </view>
                <view class="course-main">
                  <text class="student-name">{{ getCoursePersonName(course) }}</text>
                  <view class="course-meta-row">
                    <text class="course-type">{{ getCourseSubjectName(course) }}</text>
                    <text v-if="!isLearningCourse(course)" class="course-lesson-count">{{ formatCourseLessonCount(course) }}</text>
                    <text class="course-role-tag" :class="getCourseRoleClass(course)">{{ getCourseRoleText(course) }}</text>
                  </view>
                </view>
                <text v-if="getCourseTeacherText(course)" class="course-teacher">{{ getCourseTeacherText(course) }}</text>
                <view class="course-status">
                  <text
                    class="status-tag"
                    :class="{
                      'status-normal': course.status === 'normal',
                      'status-completed': course.status === 'completed',
                      'status-cancelled': course.status === 'cancelled'
                    }"
                  >
                    {{ getStatusText(course.status) }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
    
    <view class="add-btn" @click="showAddMenu = true">
  <text>+</text>
</view>

<view class="add-menu-popup" v-if="showAddMenu" @click.self="showAddMenu = false">
  <view class="menu-content" @click.stop>
    <view class="menu-item" @click="handleSingleAdd">
      <text class="menu-icon">📝</text>
      <text class="menu-text">添加单节课程</text>
    </view>
    <view class="menu-item" @click="handleBatchAdd">
      <text class="menu-icon">📋</text>
      <text class="menu-text">批量添加课程</text>
    </view>
  </view>
</view>
    <canvas
      canvas-id="weekScheduleCanvas"
      class="week-share-canvas"
      :style="{ width: shareCanvasWidth + 'px', height: shareCanvasHeight + 'px' }"
    ></canvas>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get } from '@/utils/request'

function formatDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const viewMode = ref('month')
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date())
const currentWeekStart = ref(new Date())
const selectedDate = ref(formatDateString(new Date()))
const courses = ref([])
const dayNames = ['日', '一', '二', '三', '四', '五', '六']
const shareCanvasWidth = ref(1125)
const shareCanvasHeight = ref(900)
const generatingImage = ref(false)

const yearMonths = computed(() => {
  const months = []
  const today = formatDateString(new Date())

  for (let m = 0; m < 12; m++) {
    const days = []
    const year = currentYear.value
    const firstDay = new Date(year, m, 1)
    const lastDay = new Date(year, m + 1, 0)
    const startDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()
    
    const prevMonth = new Date(year, m, 0)
    const prevMonthDays = prevMonth.getDate()
    
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i
      const date = new Date(year, m - 1, day)
      days.push(buildCalendarDay(date, day, true, today))
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, m, i)
      days.push(buildCalendarDay(date, i, false, today))
    }
    
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, m + 1, i)
      days.push(buildCalendarDay(date, i, true, today))
    }
    
    const courseCount = days
      .filter(d => !d.otherMonth)
      .reduce((sum, d) => sum + d.courseCount, 0)
    
    months.push({
      month: m,
      days,
      courseCount,
      courseCountLabel: getMonthCourseCountLabel(year, m)
    })
  }

  return months
})

const monthDays = computed(() => {
  const days = []
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const today = formatDateString(new Date())

  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const prevMonth = new Date(year, month, 0)
  const prevMonthDays = prevMonth.getDate()
  
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthDays - i
    const date = new Date(year, month - 1, day)
    days.push(buildCalendarDay(date, day, true, today))
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i)
    days.push(buildCalendarDay(date, i, false, today))
  }
  
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i)
    days.push(buildCalendarDay(date, i, true, today))
  }
  
  return days
})

const weekDays = computed(() => {
  const days = []
  const today = formatDateString(new Date())
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart.value)
    date.setDate(date.getDate() + i)
    const dateStr = formatDateString(date)
    
    days.push({
      date: dateStr,
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      isToday: dateStr === today,
      courseCount: getCoursesByDate(dateStr).length
    })
  }
  
  return days
})

const weekTimeRows = computed(() => {
  const weekDateSet = new Set(weekDays.value.map(day => day.date))
  const hours = new Set()

  courses.value.forEach(course => {
    const startTime = new Date(course.startTime)
    const dateStr = formatDateString(startTime)

    if (weekDateSet.has(dateStr)) {
      hours.add(startTime.getHours())
    }
  })

  return Array.from(hours)
    .sort((a, b) => a - b)
    .map(hour => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      cells: weekDays.value.map(day => ({
        ...day,
        courses: getCoursesForWeekSlot(day.date, hour)
      }))
    }))
})

const periodText = computed(() => {
  if (viewMode.value === 'year') {
    return `${currentYear.value}年`
  } else if (viewMode.value === 'month') {
    const year = currentMonth.value.getFullYear()
    const month = currentMonth.value.getMonth() + 1
    return `${year}年${month}月`
  } else if (viewMode.value === 'week') {
    const start = currentWeekStart.value
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    
    const startMonth = start.getMonth() + 1
    const endMonth = end.getMonth() + 1
    
    if (startMonth === endMonth) {
      return `${startMonth}月${start.getDate()}日 - ${end.getDate()}日`
    }
    return `${startMonth}月${start.getDate()}日 - ${endMonth}月${end.getDate()}日`
  } else {
    const date = new Date(selectedDate.value)
    const weekDay = dayNames[date.getDay()]
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 周${weekDay}`
  }
})

const selectedDateText = computed(() => {
  if (!selectedDate.value) return ''
  const date = new Date(selectedDate.value)
  const weekDay = dayNames[date.getDay()]
  return `${date.getMonth() + 1}月${date.getDate()}日 周${weekDay}`
})

const dayCourses = computed(() => {
  return courses.value
    .filter(c => formatDateString(new Date(c.startTime)) === selectedDate.value)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
})

const dayCourseSections = computed(() => {
  const teachingCourses = dayCourses.value.filter(course => isOwnCourse(course) && !isLearningCourse(course))
  const learningCourses = dayCourses.value.filter(course => isLearningCourse(course))
  const sharedCourses = dayCourses.value.filter(course => !isOwnCourse(course))

  return [
    { key: 'teaching', title: '我的授课', items: teachingCourses },
    { key: 'learning', title: '我上的课', items: learningCourses },
    { key: 'shared', title: getSharedCoursesTitle(sharedCourses), items: sharedCourses }
  ].filter(section => section.items.length > 0)
})

function buildCalendarDay(dateObj, dayNumber, otherMonth, today) {
  const date = formatDateString(dateObj)
  const countMode = getMonthCourseCountMode(dateObj.getFullYear(), dateObj.getMonth())

  return {
    date,
    dayNumber,
    otherMonth,
    isToday: !otherMonth && date === today,
    courseCount: getCourseCount(date, countMode),
    hasPendingOverdue: hasPendingOverdueCourses(date)
  }
}

function getMonthCourseCountMode(year, month) {
  const now = new Date()
  const currentYearValue = now.getFullYear()
  const currentMonthValue = now.getMonth()

  if (year < currentYearValue) return 'actual'
  if (year > currentYearValue) return 'scheduled'
  return month < currentMonthValue ? 'actual' : 'scheduled'
}

function getMonthCourseCountLabel(year, month) {
  return getMonthCourseCountMode(year, month) === 'actual' ? '已上' : '应消'
}

function getCourseCount(dateStr, mode = 'scheduled') {
  const courseList = courses.value.filter(c => formatDateString(new Date(c.startTime)) === dateStr)

  if (mode === 'actual') {
    return courseList.filter(c => c.status === 'completed').length
  }

  return courseList.filter(c => c.status !== 'cancelled' && c.status !== 'rescheduled').length
}

function hasPendingOverdueCourses(dateStr) {
  return courses.value.some(course => getCourseDateString(course) === dateStr && isPendingOverdueCourse(course))
}

function getCoursesByDate(dateStr) {
  return courses.value
    .filter(c => formatDateString(new Date(c.startTime)) === dateStr)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
}

function getCoursesForWeekSlot(dateStr, hour) {
  return courses.value
    .filter(c => {
      const startTime = new Date(c.startTime)
      return formatDateString(startTime) === dateStr && startTime.getHours() === hour
    })
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
}

function getCourseDateString(course) {
  const startTime = new Date(course?.startTime)
  if (Number.isNaN(startTime.getTime())) return ''
  return formatDateString(startTime)
}

function isPendingOverdueCourse(course) {
  if (course?.status !== 'normal') return false
  const courseDate = getCourseDateString(course)
  if (!courseDate) return false
  return courseDate < formatDateString(new Date())
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatStudentName(name) {
  if (!name) return '未分配'
  return name.replace(/（/g, '(').replace(/）/g, ')')
}

function isLearningCourse(course) {
  return course?.participationRole === 'student'
}

function getCoursePersonName(course) {
  if (isLearningCourse(course)) {
    return course?.externalTeacherName || '未设置老师'
  }

  return formatStudentName(course?.studentId?.name)
}

function getCourseSubjectName(course) {
  if (isLearningCourse(course)) {
    return course?.externalCourseName || '未设置课程'
  }

  return course?.courseTypeId?.name || '未设置'
}

function getCoursePlannedLessons(course) {
  const plannedLessons = Number(course?.plannedLessons)
  if (!Number.isFinite(plannedLessons) || plannedLessons <= 0) {
    return 1
  }

  return Math.round((plannedLessons + Number.EPSILON) * 100) / 100
}

function formatLessonCount(value) {
  const numericValue = Number(value) || 0
  if (Number.isInteger(numericValue)) {
    return numericValue.toString()
  }

  return numericValue.toFixed(2).replace(/\.?0+$/, '')
}

function formatCourseLessonCount(course) {
  return `${formatLessonCount(getCoursePlannedLessons(course))}节课`
}

function getStatusText(status) {
  const statusMap = {
    'normal': '待上课',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[status] || '待上课'
}

function isOwnCourse(course) {
  return course?.canManageCourse !== false
}

function getCourseRoleText(course) {
  if (isLearningCourse(course)) {
    return '我上课'
  }

  if (isOwnCourse(course)) {
    return course?.courseRelationType === 'practice' ? '我的陪练课' : '我的授课'
  }

  if (course?.courseRelationType === 'owner') {
    return '陪练老师上课'
  }
  if (course?.courseRelationType === 'practice') {
    return '任课老师上课'
  }
  return '互通课程'
}

function getCourseRoleClass(course) {
  if (isLearningCourse(course)) {
    return 'course-role-learning'
  }

  if (isOwnCourse(course)) {
    return course?.courseRelationType === 'practice' ? 'course-role-my-practice' : 'course-role-mine'
  }

  if (course?.courseRelationType === 'owner') {
    return 'course-role-practice'
  }
  if (course?.courseRelationType === 'practice') {
    return 'course-role-owner'
  }
  return 'course-role-shared'
}

function getSharedCoursesTitle(items = []) {
  if (items.length === 0) return '互通课程'

  const hasPracticeTeacherCourses = items.some(course => course?.courseRelationType === 'owner')
  const hasOwnerTeacherCourses = items.some(course => course?.courseRelationType === 'practice')

  if (hasPracticeTeacherCourses && !hasOwnerTeacherCourses) return '陪练课程'
  if (hasOwnerTeacherCourses && !hasPracticeTeacherCourses) return '任课老师课程'
  return '互通课程'
}

function getCourseTeacherText(course) {
  const teacherName = course?.teacherId?.name || course?.teacherId?.username
  if (!teacherName || isOwnCourse(course)) return ''

  if (course?.courseRelationType === 'owner') {
    return `陪练老师：${teacherName}`
  }
  if (course?.courseRelationType === 'practice') {
    return `任课老师：${teacherName}`
  }
  return `老师：${teacherName}`
}

function getWeekDateRangeText() {
  const start = new Date(currentWeekStart.value)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`
  }

  return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 - ${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日`
}

function getWeekCourses() {
  const weekCourses = []
  weekDays.value.forEach(day => {
    weekCourses.push(...getCoursesByDate(day.date))
  })
  return weekCourses
}

function getWeekImageSummaryText() {
  const weekCourses = getWeekCourses()
  const activeCount = weekCourses.filter(course => course.status !== 'cancelled' && course.status !== 'rescheduled').length
  const completedCount = weekCourses.filter(course => course.status === 'completed').length
  const cancelledCount = weekCourses.filter(course => course.status === 'cancelled').length

  return `共 ${activeCount} 节课程，已完成 ${completedCount} 节${cancelledCount > 0 ? `，已取消 ${cancelledCount} 节` : ''}`
}

function getCourseImageColor(course) {
  if (course?.status === 'cancelled') return '#8B8176'
  if (isLearningCourse(course)) return '#4C6F72'
  if (isOwnCourse(course)) {
    return course?.courseRelationType === 'practice' ? '#6F6254' : '#5F724C'
  }
  return '#A26B39'
}

function getCourseImageRoleText(course) {
  const statusText = course?.status === 'completed'
    ? '已完成'
    : (course?.status === 'cancelled' ? '已取消' : getCourseRoleText(course))

  const courseType = getCourseSubjectName(course)
  return courseType ? `${statusText} · ${courseType}` : statusText
}

function ellipsizeText(text, maxChars) {
  const value = String(text || '')
  if (value.length <= maxChars) return value
  if (maxChars <= 3) return value.slice(0, maxChars)
  return `${value.slice(0, maxChars - 3)}...`
}

function drawText(ctx, text, x, y, fontSize, color, align = 'left') {
  ctx.setFillStyle(color)
  ctx.setFontSize(fontSize)
  ctx.setTextAlign(align)
  ctx.fillText(String(text || ''), x, y)
}

function drawLine(ctx, x1, y1, x2, y2, color = '#E7D8C7', lineWidth = 1) {
  ctx.setStrokeStyle(color)
  ctx.setLineWidth(lineWidth)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

function drawRoundRect(ctx, x, y, width, height, radius, color) {
  ctx.setFillStyle(color)
  ctx.beginPath()
  ctx.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5)
  ctx.arc(x + width - radius, y + radius, radius, Math.PI * 1.5, Math.PI * 2)
  ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI * 0.5)
  ctx.arc(x + radius, y + height - radius, radius, Math.PI * 0.5, Math.PI)
  ctx.closePath()
  ctx.fill()
}

function drawLegendItem(ctx, x, y, color, text) {
  drawRoundRect(ctx, x, y - 13, 22, 22, 5, color)
  drawText(ctx, text, x + 34, y + 4, 22, '#6F6254')
}

function drawOverdueMark(ctx, x, y) {
  drawRoundRect(ctx, x, y, 22, 22, 11, '#A0523E')
  drawText(ctx, '!', x + 11, y + 18, 18, '#FFFDF8', 'center')
}

function buildWeekImageRows() {
  return weekTimeRows.value.map(row => {
    const maxCourseCount = Math.max(...row.cells.map(cell => cell.courses.length), 1)
    return {
      ...row,
      imageHeight: Math.max(108, 28 + maxCourseCount * 78)
    }
  })
}

async function drawWeekScheduleImage() {
  const width = 1125
  const margin = 48
  const timeColumnWidth = 92
  const dayColumnWidth = (width - margin * 2 - timeColumnWidth) / 7
  const headerTop = 48
  const gridTop = 218
  const dayHeaderHeight = 92
  const rows = buildWeekImageRows()
  const rowTotalHeight = rows.reduce((sum, row) => sum + row.imageHeight, 0)
  const emptyHeight = rows.length === 0 ? 320 : 0
  const height = Math.max(700, gridTop + dayHeaderHeight + rowTotalHeight + emptyHeight + 120)

  shareCanvasWidth.value = width
  shareCanvasHeight.value = height
  await new Promise(resolve => setTimeout(resolve, 80))

  const ctx = uni.createCanvasContext('weekScheduleCanvas')
  ctx.setFillStyle('#FFFDF8')
  ctx.fillRect(0, 0, width, height)

  drawText(ctx, '周课表', width / 2, headerTop, 38, '#3F352B', 'center')
  drawText(ctx, getWeekDateRangeText(), width / 2, headerTop + 44, 24, '#6F6254', 'center')
  drawText(ctx, getWeekImageSummaryText(), width / 2, headerTop + 78, 22, '#8B8176', 'center')

  const legendY = headerTop + 126
  drawLegendItem(ctx, margin, legendY, '#5F724C', '我的授课')
  drawLegendItem(ctx, margin + 180, legendY, '#4C6F72', '我上课')
  drawLegendItem(ctx, margin + 335, legendY, '#6F6254', '我的陪练课')
  drawLegendItem(ctx, margin + 570, legendY, '#A26B39', '互通课程')
  drawLegendItem(ctx, margin + 790, legendY, '#8B8176', '已取消')

  drawRoundRect(ctx, margin, gridTop, width - margin * 2, dayHeaderHeight, 12, '#FBF6EE')
  drawLine(ctx, margin + timeColumnWidth, gridTop, margin + timeColumnWidth, gridTop + dayHeaderHeight, '#E7D8C7')

  weekDays.value.forEach((day, index) => {
    const x = margin + timeColumnWidth + index * dayColumnWidth
    if (index > 0) {
      drawLine(ctx, x, gridTop, x, gridTop + dayHeaderHeight, '#E7D8C7')
    }
    drawText(ctx, `周${day.dayName}`, x + dayColumnWidth / 2, gridTop + 34, 22, day.isToday ? '#5F724C' : '#6F6254', 'center')
    drawText(ctx, `${day.dayNumber}日`, x + dayColumnWidth / 2, gridTop + 66, 28, '#3F352B', 'center')
    if (day.courseCount > 0) {
      drawText(ctx, `${day.courseCount}节`, x + dayColumnWidth / 2, gridTop + 88, 18, '#5F724C', 'center')
    }
  })

  let y = gridTop + dayHeaderHeight

  if (rows.length === 0) {
    drawLine(ctx, margin, y, width - margin, y, '#E7D8C7')
    drawText(ctx, '本周暂无课程安排', width / 2, y + 145, 28, '#8B8176', 'center')
  } else {
    rows.forEach(row => {
      drawLine(ctx, margin, y, width - margin, y, '#E7D8C7')
      drawText(ctx, row.label, margin + timeColumnWidth / 2, y + 42, 22, '#8B8176', 'center')
      drawLine(ctx, margin + timeColumnWidth, y, margin + timeColumnWidth, y + row.imageHeight, '#E7D8C7')

      row.cells.forEach((cell, index) => {
        const cellX = margin + timeColumnWidth + index * dayColumnWidth
        if (index > 0) {
          drawLine(ctx, cellX, y, cellX, y + row.imageHeight, '#F0E5D8')
        }

        cell.courses.forEach((course, courseIndex) => {
          const cardX = cellX + 8
          const cardY = y + 14 + courseIndex * 78
          const cardWidth = dayColumnWidth - 16
          const cardHeight = 64
          const maxChars = Math.max(4, Math.floor(cardWidth / 15))

          drawRoundRect(ctx, cardX, cardY, cardWidth, cardHeight, 8, getCourseImageColor(course))
          if (isPendingOverdueCourse(course)) {
            drawOverdueMark(ctx, cardX + cardWidth - 30, cardY + 8)
          }
          drawText(ctx, formatTime(course.startTime), cardX + 10, cardY + 21, 18, '#F5EFE7')
          drawText(ctx, ellipsizeText(getCourseImageRoleText(course), maxChars), cardX + 10, cardY + 42, 17, '#E7D8C7')
          drawText(ctx, ellipsizeText(getCoursePersonName(course), maxChars), cardX + 10, cardY + 61, 21, '#FFFDF8')
        })
      })

      y += row.imageHeight
    })
    drawLine(ctx, margin, y, width - margin, y, '#E7D8C7')
  }

  drawText(ctx, '保存后可在相册中分享或打印', width / 2, height - 42, 20, '#8B8176', 'center')

  await new Promise(resolve => {
    ctx.draw(false, () => {
      setTimeout(resolve, 300)
    })
  })

  return { width, height }
}

function canvasToTempFilePath(width, height) {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvasId: 'weekScheduleCanvas',
      destWidth: width,
      destHeight: height,
      success: resolve,
      fail: reject
    })
  })
}

function saveImageToAlbum(filePath) {
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath,
      success: resolve,
      fail: reject
    })
  })
}

async function saveWeekScheduleImage() {
  if (generatingImage.value) return

  if (viewMode.value !== 'week') {
    uni.showToast({ title: '请先切换到周课表', icon: 'none' })
    return
  }

  generatingImage.value = true
  uni.showLoading({ title: '生成图片中...' })

  try {
    const { width, height } = await drawWeekScheduleImage()
    const tempFile = await canvasToTempFilePath(width, height)
    await saveImageToAlbum(tempFile.tempFilePath)
    uni.hideLoading()
    uni.showToast({ title: '已保存到相册', icon: 'success' })
  } catch (error) {
    uni.hideLoading()
    const errMsg = String(error?.errMsg || '')
    if (errMsg.includes('auth') || errMsg.includes('authorize') || errMsg.includes('deny')) {
      uni.showModal({
        title: '提示',
        content: '需要您授权保存图片到相册',
        confirmText: '去授权',
        success: (res) => {
          if (res.confirm) {
            uni.openSetting()
          }
        }
      })
    } else {
      uni.showToast({ title: '生成图片失败', icon: 'none' })
    }
  } finally {
    generatingImage.value = false
  }
}

const prevPeriod = () => {
  if (viewMode.value === 'year') {
    currentYear.value -= 1
  } else if (viewMode.value === 'month') {
    const newDate = new Date(currentMonth.value)
    newDate.setMonth(newDate.getMonth() - 1)
    currentMonth.value = newDate
  } else if (viewMode.value === 'week') {
    const newDate = new Date(currentWeekStart.value)
    newDate.setDate(newDate.getDate() - 7)
    currentWeekStart.value = newDate
  } else if (viewMode.value === 'day') {
    const current = new Date(selectedDate.value)
    current.setDate(current.getDate() - 1)
    selectedDate.value = formatDateString(current)
  }
  fetchCourses()
}

const nextPeriod = () => {
  if (viewMode.value === 'year') {
    currentYear.value += 1
  } else if (viewMode.value === 'month') {
    const newDate = new Date(currentMonth.value)
    newDate.setMonth(newDate.getMonth() + 1)
    currentMonth.value = newDate
  } else if (viewMode.value === 'week') {
    const newDate = new Date(currentWeekStart.value)
    newDate.setDate(newDate.getDate() + 7)
    currentWeekStart.value = newDate
  } else if (viewMode.value === 'day') {
    const current = new Date(selectedDate.value)
    current.setDate(current.getDate() + 1)
    selectedDate.value = formatDateString(current)
  }
  fetchCourses()
}

const goToday = () => {
  const today = new Date()
  currentYear.value = today.getFullYear()
  currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
  const dayOfWeek = today.getDay()
  currentWeekStart.value = new Date(today)
  currentWeekStart.value.setDate(today.getDate() - dayOfWeek)
  selectedDate.value = formatDateString(today)
  fetchCourses()
}

const selectMonth = (month) => {
  currentMonth.value = new Date(currentYear.value, month, 1)
  viewMode.value = 'month'
}

const selectDate = (day) => {
  if (day.otherMonth) {
    const date = new Date(day.date)
    currentMonth.value = new Date(date.getFullYear(), date.getMonth(), 1)
  }
  selectedDate.value = day.date
}

const selectWeekDate = (date) => {
  selectedDate.value = date
}

const handleWeekCellClick = (date, hour) => {
  selectedDate.value = date
  const hourStr = String(hour).padStart(2, '0')
  uni.navigateTo({
    url: `/pages/schedule/add?date=${date}&time=${hourStr}:00`
  })
}

const fetchCourses = async () => {
  try {
    let start, end
    
    if (viewMode.value === 'year') {
      start = new Date(currentYear.value, 0, 1)
      start.setDate(start.getDate() - start.getDay())
      end = new Date(currentYear.value, 11, 31)
      end.setDate(end.getDate() + (6 - end.getDay()))
    } else if (viewMode.value === 'month') {
      start = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1)
      start.setDate(start.getDate() - start.getDay())
      end = new Date(start)
      end.setDate(end.getDate() + 42)
    } else if (viewMode.value === 'week') {
      start = new Date(currentWeekStart.value)
      start.setHours(0, 0, 0, 0)
      end = new Date(start)
      end.setDate(end.getDate() + 7)
    } else if (viewMode.value === 'day') {
      start = new Date(selectedDate.value)
      start.setHours(0, 0, 0, 0)
      end = new Date(start)
      end.setHours(23, 59, 59, 999)
    }
    
    if (viewMode.value !== 'day') {
      end.setHours(23, 59, 59, 999)
    }
    
    const res = await get('/courses', {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      includeLearningCourses: true
    })
    
    courses.value = res.data || []
  } catch (error) {
    console.error('获取课程列表失败', error)
  }
}

const goToDetail = (course) => {
  uni.navigateTo({
    url: `/pages/schedule/detail?id=${course._id}`
  })
}

const showAddMenu = ref(false)

const handleSingleAdd = () => {
  showAddMenu.value = false
  uni.navigateTo({
    url: `/pages/schedule/add?date=${selectedDate.value}`
  })
}

const handleBatchAdd = () => {
  showAddMenu.value = false
  uni.navigateTo({
    url: `/pages/schedule/batch-add?date=${selectedDate.value}`
  })
}

watch(viewMode, () => {
  fetchCourses()
})

onMounted(() => {
  const today = new Date()
  currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
  
  const dayOfWeek = today.getDay()
  currentWeekStart.value = new Date(today)
  currentWeekStart.value.setDate(today.getDate() - dayOfWeek)
  
  fetchCourses()
})

onShow(() => {
  fetchCourses()
})
</script>

<style scoped>
.schedule-container {
  background-color: #F7EFE3;
  min-height: 100vh;
}

.view-tabs {
  display: flex;
  background-color: #FFFDF8;
  padding: 16rpx 20rpx;
  gap: 16rpx;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 28rpx;
  color: #6F6254;
  background-color: #FBF6EE;
  border-radius: 8rpx;
}

.tab-item.active {
  background-color: #5F724C;
  color: #FFFDF8;
}

.date-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background-color: #FFFDF8;
  border-bottom: 1rpx solid #E7D8C7;
}

.nav-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn text {
  font-size: 36rpx;
  color: #5F724C;
}

.current-period {
  flex: 1;
  min-width: 0;
  text-align: center;
  font-size: 32rpx;
  font-weight: bold;
  color: #3F352B;
}

.date-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}

.today-btn {
  padding: 8rpx 20rpx;
  background-color: #5F724C;
  color: #FFFDF8;
  font-size: 24rpx;
  border-radius: 6rpx;
}

.image-btn {
  padding: 8rpx 16rpx;
  background-color: #A26B39;
  color: #FFFDF8;
  font-size: 24rpx;
  border-radius: 6rpx;
}

.image-btn.disabled {
  opacity: 0.6;
}

.month-view {
  background-color: #FFFDF8;
  padding: 20rpx;
}

.month-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 16rpx;
}

.month-day-name {
  text-align: center;
  font-size: 24rpx;
  color: #8B8176;
  padding: 8rpx 0;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4rpx;
}

.month-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  position: relative;
}

.month-day.other-month .day-number {
  color: #C4AA84;
}

.month-day.is-today {
  background-color: #E7EFE3;
}

.month-day.is-selected {
  background-color: #5F724C;
}

.month-day.is-selected .day-number {
  color: #FFFDF8;
}

.month-overdue-mark {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 20rpx;
  height: 20rpx;
  border-radius: 999rpx;
  background-color: var(--theme-danger);
  color: #FFFDF8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16rpx;
  line-height: 20rpx;
  font-weight: 600;
}

.day-number {
  font-size: 26rpx;
  color: #3F352B;
}

.course-count {
  margin-top: 4rpx;
  min-width: 38rpx;
  max-width: 90%;
  height: 24rpx;
  line-height: 24rpx;
  padding: 0 6rpx;
  border-radius: 4rpx;
  box-sizing: border-box;
  background-color: #E7EFE3;
  color: #5F724C;
  font-size: 18rpx;
  text-align: center;
  white-space: nowrap;
}

.month-day.other-month .course-count {
  background-color: #F3EBDD;
  color: #a8abb2;
}

.month-day.is-selected .course-count {
  background-color: rgba(255, 255, 255, 0.22);
  color: #FFFDF8;
}

.year-view {
  background-color: #F7EFE3;
  height: calc(100vh - 200rpx);
}

.year-scroll {
  height: 100%;
  box-sizing: border-box;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}

.year-month-card {
  background-color: #FFFDF8;
  margin: 20rpx;
  padding: 20rpx;
  border-radius: 16rpx;
}

.year-month-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.year-month-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #3F352B;
}

.year-month-count {
  font-size: 24rpx;
  color: #5F724C;
}

.year-month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2rpx;
}

.year-day-name {
  text-align: center;
  font-size: 20rpx;
  color: #8B8176;
  padding: 4rpx 0;
}

.year-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 4rpx;
  position: relative;
}

.year-day-number {
  font-size: 20rpx;
  color: #3F352B;
}

.year-day.other-month .year-day-number {
  color: #C4AA84;
}

.year-day.is-today {
  background-color: #5F724C;
}

.year-day.is-today .year-day-number {
  color: #FFFDF8;
}

.year-day.has-courses .year-day-number {
  font-weight: bold;
}

.year-dot {
  width: 6rpx;
  height: 6rpx;
  border-radius: 50%;
  background-color: #5F724C;
  position: absolute;
  bottom: 4rpx;
}

.year-day.is-today .year-dot {
  background-color: #FFFDF8;
}

.week-calendar-view {
  background-color: #FFFDF8;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200rpx);
}

.week-calendar-header {
  display: grid;
  grid-template-columns: 64rpx repeat(7, minmax(0, 1fr));
  min-height: 88rpx;
  border-bottom: 1rpx solid #E7D8C7;
  background-color: #FBF6EE;
}

.week-time-header {
  border-right: 1rpx solid #E7D8C7;
}

.week-day-header {
  min-width: 0;
  height: 88rpx;
  border-right: 1rpx solid #E7D8C7;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  box-sizing: border-box;
}

.week-day-header:last-child {
  border-right: none;
}

.week-day-header.is-today {
  background-color: #E7EFE3;
}

.week-day-header.is-selected {
  background-color: #5F724C;
}

.week-header-name {
  font-size: 20rpx;
  line-height: 22rpx;
  color: #8B8176;
}

.week-header-date {
  font-size: 26rpx;
  line-height: 30rpx;
  font-weight: bold;
  color: #3F352B;
}

.week-header-count {
  min-width: 28rpx;
  height: 22rpx;
  line-height: 22rpx;
  padding: 0 5rpx;
  border-radius: 11rpx;
  box-sizing: border-box;
  background-color: #E7EFE3;
  color: #5F724C;
  font-size: 18rpx;
  text-align: center;
}

.week-day-header.is-selected .week-header-name,
.week-day-header.is-selected .week-header-date {
  color: #FFFDF8;
}

.week-day-header.is-selected .week-header-count {
  background-color: rgba(255, 255, 255, 0.22);
  color: #FFFDF8;
}

.week-calendar-scroll {
  flex: 1;
  height: 0;
}

.week-calendar-grid {
  background-color: #FFFDF8;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.week-time-row {
  display: grid;
  grid-template-columns: 64rpx repeat(7, minmax(0, 1fr));
  min-height: 96rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.week-time-label {
  min-width: 0;
  padding-top: 12rpx;
  box-sizing: border-box;
  border-right: 1rpx solid #E7D8C7;
  background-color: #FFFDF8;
  color: #8B8176;
  font-size: 18rpx;
  line-height: 22rpx;
  text-align: center;
}

.week-time-cell {
  min-width: 0;
  min-height: 96rpx;
  padding: 4rpx;
  box-sizing: border-box;
  border-right: 1rpx solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.week-time-cell:last-child {
  border-right: none;
}

.week-time-cell.is-today {
  background-color: #FFFDF8;
}

.week-calendar-course {
  min-width: 0;
  min-height: 74rpx;
  padding: 5rpx 4rpx;
  border-radius: 6rpx;
  box-sizing: border-box;
  background-color: #5F724C;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.week-calendar-course.course-role-practice,
.week-calendar-course.course-role-owner,
.week-calendar-course.course-role-shared {
  background-color: #A26B39;
}

.week-calendar-course.course-role-my-practice {
  background-color: #6F6254;
}

.week-calendar-course.course-role-learning {
  background-color: #4C6F72;
}

.week-calendar-course.completed {
  background-color: #5F724C;
}

.week-calendar-course.completed.course-role-practice,
.week-calendar-course.completed.course-role-owner,
.week-calendar-course.completed.course-role-shared {
  background-color: #A26B39;
}

.week-calendar-course.completed.course-role-my-practice {
  background-color: #6F6254;
}

.week-calendar-course.completed.course-role-learning {
  background-color: #4C6F72;
}

.week-calendar-course.cancelled {
  background-color: #8B8176;
}

.week-calendar-course.pending-overdue {
  padding-right: 20rpx;
  box-shadow: inset 0 0 0 2rpx #A0523E;
}

.week-calendar-overdue-mark {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 18rpx;
  height: 18rpx;
  border-radius: 999rpx;
  background-color: var(--theme-danger);
  color: #FFFDF8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16rpx;
  line-height: 18rpx;
  font-weight: 600;
}

.week-calendar-time {
  font-size: 16rpx;
  line-height: 20rpx;
  color: rgba(255, 255, 255, 0.82);
  white-space: nowrap;
}

.week-calendar-role {
  min-width: 0;
  font-size: 15rpx;
  line-height: 19rpx;
  color: rgba(255, 255, 255, 0.72);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.week-calendar-name {
  min-width: 0;
  font-size: 20rpx;
  line-height: 24rpx;
  color: #FFFDF8;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.week-share-canvas {
  position: fixed;
  left: -9999rpx;
  top: 0;
}

.day-header {
  background-color: #FFFDF8;
  padding: 20rpx;
  text-align: center;
}

.day-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #3F352B;
}

.course-list {
  padding: 20rpx;
  padding-bottom: calc(200rpx + env(safe-area-inset-bottom));
}

.course-list-sections {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.course-section {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.course-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4rpx;
}

.course-section-title {
  font-size: 28rpx;
  line-height: 36rpx;
  font-weight: bold;
  color: #3F352B;
}

.course-section-count {
  font-size: 22rpx;
  color: #8B8176;
}

.empty-tip {
  text-align: center;
  padding: 100rpx 0;
  color: #8B8176;
  font-size: 28rpx;
}

.course-timeline {
  display: flex;
  flex-direction: column;
}

.course-item {
  display: flex;
  position: relative;
  padding-bottom: 30rpx;
}

.course-item:last-child {
  padding-bottom: 0;
}

.course-item:last-child .timeline-line {
  display: none;
}

.timeline-dot {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: #5F724C;
  margin-right: 20rpx;
  margin-top: 10rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dot-number {
  font-size: 22rpx;
  color: #FFFDF8;
  font-weight: bold;
}

.course-item.completed .timeline-dot {
  background-color: #5F724C;
}

.course-item.course-role-practice .timeline-dot,
.course-item.course-role-owner .timeline-dot,
.course-item.course-role-shared .timeline-dot {
  background-color: #A26B39;
}

.course-item.course-role-my-practice .timeline-dot {
  background-color: #6F6254;
}

.course-item.course-role-learning .timeline-dot {
  background-color: #4C6F72;
}

.course-item.cancelled .timeline-dot {
  background-color: #A0523E;
}

.timeline-line {
  position: absolute;
  left: 19rpx;
  top: 50rpx;
  bottom: 0;
  width: 2rpx;
  background-color: #E7D8C7;
}

.course-content {
  flex: 1;
  background-color: #FFFDF8;
  border-radius: 16rpx;
  padding: 24rpx;
  border-left: 6rpx solid #5F724C;
  box-sizing: border-box;
}

.course-item.course-role-practice .course-content,
.course-item.course-role-owner .course-content,
.course-item.course-role-shared .course-content {
  border-left-color: #A26B39;
}

.course-item.course-role-my-practice .course-content {
  border-left-color: #6F6254;
}

.course-item.course-role-learning .course-content {
  border-left-color: #4C6F72;
}

.course-time {
  font-size: 24rpx;
  color: #8B8176;
  margin-bottom: 12rpx;
}

.course-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.student-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #3F352B;
}

.course-type {
  font-size: 26rpx;
  color: #6F6254;
}

.course-meta-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8rpx;
}

.course-lesson-count {
  display: inline-flex;
  align-items: center;
  min-height: 32rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  box-sizing: border-box;
  font-size: 20rpx;
  line-height: 32rpx;
  white-space: nowrap;
  color: #6f6254;
  background-color: #f3ece2;
}

.course-role-tag {
  display: inline-flex;
  align-items: center;
  min-height: 32rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  box-sizing: border-box;
  font-size: 20rpx;
  line-height: 32rpx;
  white-space: nowrap;
}

.course-role-tag.course-role-mine,
.course-role-tag.course-role-my-practice {
  color: #5F724C;
  background-color: #E7EFE3;
}

.course-role-tag.course-role-practice,
.course-role-tag.course-role-owner,
.course-role-tag.course-role-shared {
  color: #A26B39;
  background-color: #F6E8C9;
}

.course-role-tag.course-role-learning {
  color: #4C6F72;
  background-color: #E4F0EE;
}

.course-teacher {
  display: block;
  margin-bottom: 12rpx;
  font-size: 24rpx;
  line-height: 32rpx;
  color: #8B8176;
}

.course-status {
  text-align: right;
}

.status-tag {
  display: inline-block;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
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

.add-btn {
  position: fixed;
  right: 40rpx;
  bottom: 120rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: #5F724C;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(64, 158, 255, 0.4);
}

.add-btn text {
  color: #FFFDF8;
  font-size: 48rpx;
  font-weight: 300;
}

.add-menu-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 999;
}

.menu-content {
  width: 100%;
  background-color: #FFFDF8;
  border-radius: 24rpx 24rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 36rpx 40rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background-color: #FBF6EE;
}

.menu-icon {
  font-size: 40rpx;
  margin-right: 24rpx;
}

.menu-text {
  font-size: 32rpx;
  color: #3F352B;
}
</style>
