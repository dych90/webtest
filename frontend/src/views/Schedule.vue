<template>
  <div class="schedule">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>排课管理</span>
          <el-button type="primary" @click="handleAdd">添加课程</el-button>
        </div>
      </template>
      
      <div class="calendar-container">
        <FullCalendar :options="calendarOptions" />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="90%" :style="{ maxWidth: '600px' }">
      <el-form :model="form" label-width="100px">
        <el-form-item label="学生">
          <el-select v-model="form.studentId" placeholder="请选择学生" style="width: 100%" @change="handleStudentChange">
            <el-option
              v-for="student in students"
              :key="student._id"
              :label="student.name"
              :value="student._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="课程类型">
          <el-select v-model="form.courseTypeId" placeholder="请选择课程类型" style="width: 100%" @change="handleCourseTypeChange">
            <el-option
              v-for="type in courseTypes"
              :key="type._id"
              :label="type.name"
              :value="type._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="form.date"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-time-picker
            v-model="form.time"
            placeholder="选择开始时间"
            format="HH:mm"
            value-format="HH:mm"
            style="width: 100%"
            :popper-options="{
              placement: 'bottom-start',
              strategy: 'fixed',
              modifiers: [
                {
                  name: 'flip',
                  options: {
                    fallbackPlacements: ['bottom-start', 'top-start']
                  }
                }
              ]
            }"
          />
        </el-form-item>
        <el-form-item label="是否重复">
          <el-switch v-model="form.isRecurring" />
        </el-form-item>
        <el-form-item v-if="form.isRecurring" label="重复模式">
          <el-input v-model="form.recurringPattern" placeholder="例如：每周一、每周二" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="正常" value="normal" />
            <el-option label="已取消" value="cancelled" />
            <el-option label="已改期" value="rescheduled" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
        <el-button v-if="dialogTitle === '编辑课程'" type="danger" @click="handleDelete">删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import zhLocale from '@fullcalendar/core/locales/zh-cn'
import request from '@/utils/request'

const courses = ref([])
const students = ref([])
const courseTypes = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加课程')
const form = ref({
  _id: '',
  studentId: '',
  courseTypeId: '',
  date: '',
  time: '',
  isRecurring: false,
  recurringPattern: '',
  status: 'normal'
})

const calendarOptions = ref({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek',
  locale: zhLocale,
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: window.innerWidth < 768 ? 'dayGridMonth,timeGridDay' : 'dayGridMonth,timeGridWeek,timeGridDay'
  },
  editable: true,
  selectable: true,
  selectMirror: true,
  dayMaxEvents: true,
  weekends: true,
  slotMinTime: '08:00',
  slotMaxTime: '23:00',
  slotDuration: '00:15:00',
  height: 'auto',
  aspectRatio: 1.35,
  eventDrop: async (info) => {
    console.log('Event dropped:', info)
    console.log('Event start:', info.event.start)
    console.log('Event end:', info.event.end)
    const courseId = info.event.id
    const course = courses.value.find(c => c._id === courseId)
    if (course) {
      try {
        const courseType = courseTypes.value.find(t => t._id === course.courseTypeId?._id)
        const duration = courseType ? courseType.duration : 60
        
        let newStartTime = new Date(info.event.start)
        let newEndTime = new Date(info.event.end)
        
        console.log('原始开始时间:', newStartTime.toISOString())
        console.log('原始结束时间:', newEndTime.toISOString())
        
        const dataToSend = {
          studentId: course.studentId._id,
          courseTypeId: course.courseTypeId._id,
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
          isRecurring: course.isRecurring || false,
          recurringPattern: course.recurringPattern || '',
          status: course.status || 'normal'
        }
        
        console.log('发送的数据:', dataToSend)
        console.log('请求URL:', `/courses/${courseId}`)
        
        const response = await request.put(`/courses/${courseId}`, dataToSend)
        console.log('响应结果:', response)
        console.log('响应消息:', response?.message)
        console.log('响应数据:', response?.data)
        
        if (response && response.message === '更新成功') {
          ElMessage.success('课程时间更新成功')
          await fetchCourses()
        } else {
          throw new Error(response?.message || '更新课程时间失败')
        }
      } catch (error) {
        console.error('更新课程时间失败', error)
        console.error('错误详情:', error.response || error)
        console.error('错误消息:', error.message)
        console.error('错误状态码:', error.response?.status)
        ElMessage.error(error.response?.data?.message || error.message || '更新课程时间失败')
        info.revert()
      }
    }
  },
  eventResize: async (info) => {
    console.log('Event resized:', info)
    const courseId = info.event.id
    const course = courses.value.find(c => c._id === courseId)
    if (course) {
      try {
        const newStartTime = new Date(info.event.start)
        const newEndTime = new Date(info.event.end)
        
        const dataToSend = {
          studentId: course.studentId._id,
          courseTypeId: course.courseTypeId._id,
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
          isRecurring: course.isRecurring || false,
          recurringPattern: course.recurringPattern || '',
          status: course.status || 'normal'
        }
        
        await request.put(`/courses/${courseId}`, dataToSend)
        ElMessage.success('课程时长更新成功')
        await fetchCourses()
      } catch (error) {
        console.error('更新课程时长失败', error)
        ElMessage.error('更新课程时长失败')
        info.revert()
      }
    }
  },
  eventClick: (info) => {
    console.log('Event clicked:', info)
    const courseId = info.event.id
    const course = courses.value.find(c => c._id === courseId)
    if (course) {
      dialogTitle.value = '编辑课程'
      form.value = {
        _id: course._id,
        studentId: course.studentId?._id || '',
        courseTypeId: course.courseTypeId?._id || '',
        date: new Date(course.startTime).toISOString().split('T')[0],
        time: new Date(course.startTime).toTimeString().substring(0, 5),
        isRecurring: course.isRecurring || false,
        recurringPattern: course.recurringPattern || '',
        status: course.status || 'normal'
      }
      dialogVisible.value = true
    }
  },
  events: []
})

const fetchCourses = async () => {
  try {
    const response = await request.get('/courses')
    courses.value = response.data
    calendarOptions.value.events = response.data.map(course => {
      let backgroundColor = '#409eff'
      let title = `${course.studentId?.name || '未分配'} - ${course.courseTypeId?.name || '未分配'}`
      
      if (course.isGiftLesson) {
        title += ' [赠]'
        backgroundColor = '#9b59b6'
      }
      
      if (course.status === 'cancelled') {
        backgroundColor = '#f56c6c'
      } else if (course.status === 'completed') {
        backgroundColor = '#67c23a'
      }
      
      return {
        id: course._id,
        title,
        start: course.startTime,
        end: course.endTime,
        backgroundColor
      }
    })
  } catch (error) {
    console.error('获取课程列表失败', error)
  }
}

const fetchStudents = async () => {
  try {
    const response = await request.get('/students')
    students.value = response.data
  } catch (error) {
    console.error('获取学生列表失败', error)
  }
}

const fetchCourseTypes = async () => {
  try {
    const response = await request.get('/course-types')
    courseTypes.value = response.data
  } catch (error) {
    console.error('获取课程类型列表失败', error)
  }
}

const handleStudentChange = (studentId) => {
  const student = students.value.find(s => s._id === studentId)
  if (student && student.defaultCourseTypeId) {
    form.value.courseTypeId = student.defaultCourseTypeId._id
    handleCourseTypeChange(student.defaultCourseTypeId._id)
  }
}

const handleCourseTypeChange = (courseTypeId) => {
  const courseType = courseTypes.value.find(t => t._id === courseTypeId)
  if (courseType && form.value.date && form.value.time) {
    const date = new Date(form.value.date)
    const [hours, minutes] = form.value.time.split(':')
    const startTime = new Date(date)
    startTime.setHours(parseInt(hours))
    startTime.setMinutes(parseInt(minutes))
    const endTime = new Date(startTime.getTime() + courseType.duration * 60000)
    form.value.startTime = startTime.toISOString()
    form.value.endTime = endTime.toISOString()
  }
}

const handleAdd = () => {
  dialogTitle.value = '添加课程'
  form.value = {
    studentId: '',
    courseTypeId: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    isRecurring: false,
    recurringPattern: '',
    status: 'normal'
  }
  dialogVisible.value = true
}

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要删除这个课程吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await request.delete(`/courses/${form.value._id}`)
    ElMessage.success('删除成功')
    dialogVisible.value = false
    await fetchCourses()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除课程失败', error)
    }
  }
}

const handleSave = async () => {
  try {
    if (!form.value.date || !form.value.time || !form.value.courseTypeId) {
      ElMessage.error('请填写完整信息')
      return
    }
    
    const courseType = courseTypes.value.find(t => t._id === form.value.courseTypeId)
    if (courseType && form.value.date && form.value.time) {
      const date = new Date(form.value.date)
      const [hours, minutes] = form.value.time.split(':')
      const startTime = new Date(date)
      startTime.setHours(parseInt(hours))
      startTime.setMinutes(parseInt(minutes))
      const endTime = new Date(startTime.getTime() + courseType.duration * 60000)
      form.value.startTime = startTime.toISOString()
      form.value.endTime = endTime.toISOString()
    }
    
    const dataToSend = {
      studentId: form.value.studentId,
      courseTypeId: form.value.courseTypeId,
      startTime: form.value.startTime,
      endTime: form.value.endTime,
      isRecurring: form.value.isRecurring,
      recurringPattern: form.value.recurringPattern,
      status: form.value.status
    }
    
    if (dialogTitle.value === '添加课程') {
      await request.post('/courses', dataToSend)
      ElMessage.success('添加成功')
    } else {
      await request.put(`/courses/${form.value._id}`, dataToSend)
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    await fetchCourses()
  } catch (error) {
    console.error('保存课程失败', error)
  }
}

onMounted(() => {
  fetchCourses()
  fetchStudents()
  fetchCourseTypes()
  
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

const handleResize = () => {
  const isMobile = window.innerWidth < 768
  calendarOptions.value.initialView = isMobile ? 'timeGridDay' : 'timeGridWeek'
  calendarOptions.value.headerToolbar.right = isMobile ? 'dayGridMonth,timeGridDay' : 'dayGridMonth,timeGridWeek,timeGridDay'
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .card-header .el-button {
    width: 100%;
  }
}

.calendar-container {
  height: 600px;
}

@media (max-width: 768px) {
  .calendar-container {
    height: 500px;
  }
}

@media (max-width: 480px) {
  .calendar-container {
    height: 400px;
  }
}

:deep(.fc) {
  font-size: 14px;
}

@media (max-width: 768px) {
  :deep(.fc) {
    font-size: 12px;
  }
}

:deep(.fc-toolbar-title) {
  font-size: 16px;
}

@media (max-width: 768px) {
  :deep(.fc-toolbar-title) {
    font-size: 14px;
  }
}

:deep(.fc-button) {
  padding: 6px 12px;
  font-size: 13px;
}

@media (max-width: 768px) {
  :deep(.fc-button) {
    padding: 4px 8px;
    font-size: 12px;
  }
}

:deep(.fc-header-toolbar) {
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 768px) {
  :deep(.fc-header-toolbar) {
    flex-direction: column;
    gap: 8px;
  }
  
  :deep(.fc-toolbar-chunk) {
    display: flex;
    justify-content: center;
    width: 100%;
  }
}

:deep(.fc-col-header-cell) {
  padding: 8px 4px;
}

@media (max-width: 768px) {
  :deep(.fc-col-header-cell) {
    padding: 6px 2px;
    font-size: 11px;
  }
}

:deep(.fc-daygrid-day-number) {
  font-size: 14px;
}

@media (max-width: 768px) {
  :deep(.fc-daygrid-day-number) {
    font-size: 12px;
  }
}

:deep(.fc-timegrid-slot-label) {
  font-size: 11px;
}

@media (max-width: 768px) {
  :deep(.fc-timegrid-slot-label) {
    font-size: 10px;
  }
}

:deep(.fc-event-title) {
  font-size: 12px;
}

@media (max-width: 768px) {
  :deep(.fc-event-title) {
    font-size: 11px;
  }
}

:deep(.el-dialog) {
  border-radius: 8px;
}

@media (max-width: 768px) {
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 5vh auto !important;
  }
}

@media (max-width: 480px) {
  :deep(.el-dialog) {
    width: 100% !important;
    margin: 0 !important;
    height: 100vh !important;
    border-radius: 0;
  }
  
  :deep(.el-dialog__header) {
    padding: 16px;
  }
  
  :deep(.el-dialog__body) {
    padding: 16px;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
  }
  
  :deep(.el-dialog__footer) {
    padding: 16px;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    border-top: 1px solid #e6e6e6;
  }
}

:deep(.el-form-item__label) {
  font-size: 14px;
}

@media (max-width: 768px) {
  :deep(.el-form-item__label) {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  :deep(.el-form-item__label) {
    width: 80px !important;
    font-size: 12px;
  }
}

:deep(.el-dialog__footer) {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

@media (max-width: 480px) {
  :deep(.el-dialog__footer) {
    flex-wrap: wrap;
  }
  
  :deep(.el-dialog__footer .el-button) {
    flex: 1;
    min-width: 0;
  }
}
</style>
