<template>
  <div class="dashboard">
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :xs="12" :sm="12" :md="12" :lg="12" :xl="12">
        <el-card>
          <template #header>
            <span>今日课程</span>
          </template>
          <div v-if="todayCourses.length > 0" class="course-list">
            <div v-for="course in todayCourses" :key="course._id" class="course-item">
              <div class="course-info">
                <div class="course-time">{{ formatTime(course.startTime) }}</div>
                <div class="course-name">
                  {{ course.studentId?.name || '未分配' }}
                  <el-tag v-if="course.isGiftLesson" type="warning" size="small" style="margin-left: 8px">赠课</el-tag>
                </div>
              </div>
              <div class="course-status">
                <el-tag :type="getCourseStatusType(course.status)" size="small">
                  {{ getCourseStatusText(course.status) }}
                </el-tag>
                <el-button 
                  v-if="course.status === 'normal'" 
                  type="primary" 
                  size="small" 
                  @click="handleAttendCourse(course)"
                  style="margin-left: 8px">
                  上课
                </el-button>
                <el-button 
                  v-if="course.status === 'completed'" 
                  type="danger" 
                  size="small" 
                  @click="handleCancelAttendCourse(course)"
                  style="margin-left: 8px">
                  取消上课
                </el-button>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无课程" />
        </el-card>
      </el-col>
      
      <el-col :xs="12" :sm="12" :md="12" :lg="12" :xl="12">
        <el-card>
          <template #header>
            <span>近期提醒</span>
          </template>
          <div v-if="recentReminders.length > 0" class="reminder-list">
            <div v-for="reminder in recentReminders" :key="reminder._id" class="reminder-item">
              <div class="reminder-info">
                <div class="reminder-title">{{ reminder.title }}</div>
                <div class="reminder-date">{{ formatDate(reminder.reminderDate) }}</div>
              </div>
              <div class="reminder-status">
                <el-tag :type="reminder.isCompleted ? 'success' : 'warning'" size="small">
                  {{ reminder.isCompleted ? '已完成' : '待处理' }}
                </el-tag>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无提醒" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :xs="12" :sm="12" :md="8" :lg="6" :xl="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #409eff">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.studentCount || 0 }}</div>
              <div class="stat-label">学生总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="12" :sm="12" :md="8" :lg="6" :xl="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #67c23a">
              <el-icon><Calendar /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.todayLessons || 0 }}</div>
              <div class="stat-label">今日课程</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="12" :sm="12" :md="8" :lg="6" :xl="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #e6a23c">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ statistics.monthlyPrepaidRevenue || 0 }}</div>
              <div class="stat-label">本月预收入</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="12" :sm="12" :md="8" :lg="6" :xl="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #9b59b6">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ statistics.monthlyActualRevenue || 0 }}</div>
              <div class="stat-label">本月实际收入</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="12" :sm="12" :md="8" :lg="6" :xl="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #f56c6c">
              <el-icon><Bell /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.pendingReminders || 0 }}</div>
              <div class="stat-label">待处理提醒</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="12" :sm="12" :md="8" :lg="6" :xl="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #909399">
              <el-icon><Reading /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.totalLessonsAttended || 0 }}</div>
              <div class="stat-label">总上课数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="12" :sm="12" :md="8" :lg="6" :xl="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #ff6b6b">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.prepaidLessonsConsumed || 0 }}</div>
              <div class="stat-label">预付费已消课时</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { User, Calendar, Money, Bell, Reading, Document } from '@element-plus/icons-vue'
import request from '../utils/request'
import { ElMessage } from 'element-plus'
import { useCourseStore } from '../store/course'

const courseStore = useCourseStore()

const statistics = ref({
  studentCount: 0,
  todayLessons: 0,
  monthlyPrepaidRevenue: 0,
  monthlyActualRevenue: 0,
  pendingReminders: 0,
  totalLessonsAttended: 0,
  prepaidLessonsConsumed: 0
})

const todayCourses = ref([])
const recentReminders = ref([])

const fetchStatistics = async () => {
  try {
    console.log('开始获取统计数据')
    const response = await request.get('/statistics')
    console.log('统计数据响应:', response)
    const data = response.data.data || response.data
    console.log('统计数据数据:', data)
    Object.assign(statistics.value, {
      studentCount: data.studentCount || 0,
      monthlyPrepaidRevenue: data.monthlyPrepaidRevenue || 0,
      monthlyActualRevenue: data.monthlyActualRevenue || 0,
      totalLessonsAttended: data.totalLessonsAttended || 0,
      prepaidLessonsConsumed: data.prepaidLessonsConsumed || 0
    })
    console.log('统计数据更新后:', statistics.value)
  } catch (error) {
    console.error('获取统计数据失败', error)
    ElMessage.error('获取统计数据失败')
  }
}

const fetchTodayCourses = async () => {
  try {
    const now = new Date()
    
    const year = now.getFullYear()
    const month = now.getMonth()
    const day = now.getDate()
    
    const startOfDay = new Date(year, month, day, 0, 0, 0)
    const endOfDay = new Date(year, month, day, 23, 59, 59)
    
    console.log('查询今日课程时间范围:', startOfDay.toISOString(), '至', endOfDay.toISOString())
    console.log('当前日期:', now.toISOString())
    
    const response = await request.get('/courses', {
      params: {
        startTime: startOfDay.toISOString(),
        endTime: endOfDay.toISOString()
      }
    })
    console.log('今日课程响应:', response)
    todayCourses.value = response.data || []
    console.log('今日课程数量:', todayCourses.value.length)
    console.log('今日课程详情:', todayCourses.value.map(c => ({
      id: c._id,
      startTime: c.startTime,
      endTime: c.endTime,
      startHour: new Date(c.startTime).getHours(),
      startMinute: new Date(c.startTime).getMinutes()
    })))
    statistics.value.todayLessons = todayCourses.value.length
    console.log('今日课程数量更新后:', statistics.value.todayLessons)
  } catch (error) {
    console.error('获取今日课程失败', error)
    ElMessage.error('获取今日课程失败')
  }
}

const fetchRecentReminders = async () => {
  try {
    const response = await request.get('/reminders', {
      params: {
        isCompleted: false,
        limit: 5
      }
    })
    recentReminders.value = response.data || []
    statistics.value.pendingReminders = response.data?.length || 0
  } catch (error) {
    console.error('获取近期提醒失败', error)
    ElMessage.error('获取近期提醒失败')
  }
}

const formatTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN')
}

const getCourseStatusType = (status) => {
  switch (status) {
    case 'normal':
      return 'primary'
    case 'completed':
      return 'success'
    case 'cancelled':
      return 'danger'
    case 'rescheduled':
      return 'warning'
    default:
      return 'info'
  }
}

const getCourseStatusText = (status) => {
  switch (status) {
    case 'normal':
      return '待上课'
    case 'completed':
      return '已上课'
    case 'cancelled':
      return '已取消'
    case 'rescheduled':
      return '已改期'
    default:
      return '未知'
  }
}

const handleAttendCourse = async (course) => {
  try {
    await request.put(`/courses/${course._id}`, { status: 'completed' })
    await request.post('/lesson-records', {
      studentId: course.studentId._id,
      courseId: course._id,
      courseStartTime: course.startTime,
      lessonsConsumed: 1,
      lessonContent: '',
      isDeducted: true,
      notes: '从主页直接上课'
    })
    ElMessage.success('上课成功')
    await courseStore.fetchCourses()
    await fetchTodayCourses()
    await fetchStatistics()
  } catch (error) {
    console.error('上课失败', error)
    ElMessage.error('上课失败')
  }
}

const handleCancelAttendCourse = async (course) => {
  try {
    await request.put(`/courses/${course._id}`, { status: 'normal' })
    const lessonRecords = await request.get('/lesson-records', {
      params: {
        courseId: course._id,
        studentId: course.studentId._id
      }
    })
    if (lessonRecords.data && lessonRecords.data.length > 0) {
      const latestRecord = lessonRecords.data[0]
      await request.delete(`/lesson-records/${latestRecord._id}`)
    }
    ElMessage.success('取消上课成功')
    await courseStore.fetchCourses()
    await fetchTodayCourses()
    await fetchStatistics()
  } catch (error) {
    console.error('取消上课失败', error)
    ElMessage.error('取消上课失败')
  }
}

watch(() => courseStore.lastUpdate, async () => {
  console.log('检测到课程更新，刷新今日课程')
  await fetchTodayCourses()
})

onMounted(() => {
  fetchStatistics()
  fetchRecentReminders()
  fetchTodayCourses()
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

@media (max-width: 768px) {
  .dashboard {
    padding: 12px;
  }
}

.stat-card {
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .stat-card {
    margin-bottom: 12px;
  }
}

.stat-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@media (max-width: 768px) {
  .stat-content {
    justify-content: center;
    gap: 12px;
  }
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .stat-icon {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }
}

.stat-info {
  text-align: right;
  flex: 1;
}

@media (max-width: 768px) {
  .stat-info {
    text-align: center;
  }
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

@media (max-width: 768px) {
  .stat-value {
    font-size: 18px;
  }
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
}

@media (max-width: 768px) {
  .stat-label {
    font-size: 12px;
  }
}

.course-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.course-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .course-item {
    flex-direction: row;
    align-items: flex-start;
    gap: 12px;
  }
  
  .course-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .course-status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    flex-shrink: 0;
  }
  
  .reminder-item {
    flex-direction: row;
    align-items: center;
  }
  
  .reminder-status {
    margin-top: 0;
    margin-left: auto;
    width: auto;
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
  }
  
  .reminder-info {
    flex: 1;
  }
}

.reminder-info {
  flex: 1;
}

.reminder-title {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.reminder-date {
  font-size: 12px;
  color: #666;
}

.reminder-status {
  flex-shrink: 0;
}
</style>
