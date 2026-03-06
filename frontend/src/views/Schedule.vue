<template>
  <div class="schedule">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>排课管理</span>
          <div class="header-buttons">
            <el-select
              v-if="userStore.isAdmin()"
              v-model="selectedTeacherId"
              placeholder="筛选教师"
              clearable
              style="width: 150px; margin-right: 10px;"
              @change="handleTeacherChange"
            >
              <el-option
                v-for="teacher in teachers"
                :key="teacher._id"
                :label="teacher.name"
                :value="teacher._id"
              />
            </el-select>
            <el-button v-if="!userStore.isAdmin()" type="primary" @click="handleAdd">添加课程</el-button>
          </div>
        </div>
      </template>
      
      <div class="calendar-container">
        <FullCalendar :options="calendarOptions">
          <template #eventContent="arg">
            <div class="event-content" :style="{ backgroundColor: arg.event.backgroundColor }">
              <div class="event-time">{{ formatTime(arg.event.start) }}</div>
              <div class="event-student">{{ arg.event.title.split('<br>')[0].substring(0, 3) }}{{ arg.event.title.split('<br>')[0].length > 3 ? '..' : '' }}</div>
            </div>
          </template>
        </FullCalendar>
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="90%" :style="{ maxWidth: '600px' }">
      <el-form :model="form" label-width="100px">
        <el-form-item label="学生">
          <el-select v-model="form.studentId" placeholder="请选择学生" style="width: 100%" clearable @change="handleStudentChange">
            <el-option
              v-for="student in students"
              :key="student._id"
              :label="student.name"
              :value="student._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="课程类型">
          <el-select v-model="form.courseTypeId" placeholder="请选择课程类型" style="width: 100%" clearable @change="handleCourseTypeChange">
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
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-time-select
            v-model="form.startTime"
            start="06:00"
            step="00:15"
            end="23:00"
            placeholder="选择时间"
            style="width: 100%"
            :readonly="isMobile"
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
        <el-form-item label="课程时长">
          <el-select v-model="form.duration" placeholder="选择时长" style="width: 100%">
            <el-option label="30分钟" :value="30" />
            <el-option label="45分钟" :value="45" />
            <el-option label="50分钟" :value="50" />
            <el-option label="60分钟" :value="60" />
            <el-option label="70分钟" :value="70" />
            <el-option label="90分钟" :value="90" />
            <el-option label="120分钟" :value="120" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否重复">
          <el-switch v-model="form.isRecurring" />
        </el-form-item>
        <el-form-item v-if="form.isRecurring" label="重复开始">
          <el-date-picker
            v-model="form.recurringStartDate"
            type="date"
            placeholder="选择开始日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item v-if="form.isRecurring" label="重复结束">
          <el-date-picker
            v-model="form.recurringEndDate"
            type="date"
            placeholder="选择结束日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="正常" value="normal" />
            <el-option label="已取消" value="cancelled" />
            <el-option label="已改期" value="rescheduled" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
        <el-form-item v-if="form.groupId && dialogTitle === '编辑课程'" label="批量操作">
          <el-checkbox v-model="form.applyToGroup">应用到同组课程（{{ form.groupCourseCount - form.courseIndex }}节）</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
        <el-button v-if="dialogTitle === '编辑课程'" type="danger" @click="handleDelete">删除</el-button>
        <el-button v-if="dialogTitle === '编辑课程' && form.groupId" type="warning" @click="handleDeleteGroup">批量删除同组</el-button>
        <el-button v-if="dialogTitle === '编辑课程' && form.groupId" type="info" @click="openRescheduleDialog">重新排课</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rescheduleDialogVisible" title="重新排课" width="90%" :style="{ maxWidth: '500px' }">
      <el-form :model="rescheduleForm" label-width="100px">
        <el-form-item label="当前课程">
          <el-alert type="info" :closable="false">
            从第 {{ form.courseIndex + 1 }} 节课程开始修改，前面的 {{ form.courseIndex }} 节课程保持不变
          </el-alert>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="rescheduleForm.newStartDate"
            type="date"
            placeholder="选择开始日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="rescheduleForm.newEndDate"
            type="date"
            placeholder="选择结束日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-time-select
            v-model="rescheduleForm.newStartTime"
            start="06:00"
            step="00:15"
            end="23:00"
            placeholder="选择开始时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="课程时长">
          <el-select v-model="rescheduleForm.duration" placeholder="选择时长" style="width: 100%">
            <el-option label="30分钟" :value="30" />
            <el-option label="45分钟" :value="45" />
            <el-option label="50分钟" :value="50" />
            <el-option label="60分钟" :value="60" />
            <el-option label="70分钟" :value="70" />
            <el-option label="90分钟" :value="90" />
            <el-option label="120分钟" :value="120" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="rescheduleForm.newStartDate" label="排课星期">
          <el-tag type="primary">{{ getDayOfWeekName(rescheduleForm.newStartDate) }}</el-tag>
          <span style="margin-left: 10px; color: #909399; font-size: 12px;">由开始日期自动确定</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rescheduleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleReschedule">确认重新排课</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import zhLocale from '@fullcalendar/core/locales/zh-cn'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const courses = ref([])
const students = ref([])
const courseTypes = ref([])
const teachers = ref([])
const selectedTeacherId = ref('')
const dialogVisible = ref(false)
const dialogTitle = ref('添加课程')
const rescheduleDialogVisible = ref(false)
const form = ref({
  _id: '',
  studentId: '',
  courseTypeId: '',
  date: '',
  startTime: '',
  duration: 60,
  isRecurring: false,
  recurringStartDate: '',
  recurringEndDate: '',
  status: 'normal',
  notes: '',
  groupId: '',
  groupCourseCount: 0,
  courseIndex: 0,
  applyToGroup: false
})

const rescheduleForm = ref({
  newStartDate: '',
  newEndDate: '',
  newStartTime: '',
  duration: 60
})

const isMobile = computed(() => window.innerWidth < 768)

const formatTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

const getDayOfWeekName = (dateStr) => {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const d = new Date(dateStr)
  return days[d.getDay()]
}

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
  eventLongPressDelay: 200,
  longPressDelay: 200,
  eventDragMinDistance: 10,
  eventStartEditable: true,
  eventDurationEditable: true,
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
          studentId: course.studentId?._id || null,
          courseTypeId: course.courseTypeId?._id || null,
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
          studentId: course.studentId?._id || null,
          courseTypeId: course.courseTypeId?._id || null,
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
      const startTime = new Date(course.startTime)
      const endTime = new Date(course.endTime)
      const duration = Math.round((endTime - startTime) / 60000)
      const hours = startTime.getHours().toString().padStart(2, '0')
      const minutes = startTime.getMinutes().toString().padStart(2, '0')
      const dateStr = `${startTime.getFullYear()}-${String(startTime.getMonth() + 1).padStart(2, '0')}-${String(startTime.getDate()).padStart(2, '0')}`
      
      let groupCourseCount = 0
      let courseIndex = 0
      if (course.groupId) {
        const groupCourses = courses.value.filter(c => c.groupId === course.groupId)
        groupCourseCount = groupCourses.length
        courseIndex = groupCourses.findIndex(c => c._id === course._id)
      }
      
      form.value = {
        _id: course._id,
        studentId: course.studentId?._id || '',
        courseTypeId: course.courseTypeId?._id || '',
        date: dateStr,
        startTime: `${hours}:${minutes}`,
        duration: duration,
        isRecurring: false,
        recurringStartDate: dateStr,
        recurringEndDate: '',
        status: course.status || 'normal',
        notes: course.notes || '',
        groupId: course.groupId || '',
        groupCourseCount: groupCourseCount,
        courseIndex: courseIndex,
        applyToGroup: false
      }
      
      rescheduleForm.value = {
        newStartDate: dateStr,
        newEndDate: dateStr,
        newStartTime: `${hours}:${minutes}`,
        duration: duration
      }
      
      dialogVisible.value = true
    }
  },
  events: []
})

const fetchCourses = async () => {
  try {
    const params = {}
    if (userStore.isAdmin() && selectedTeacherId.value) {
      params.teacherId = selectedTeacherId.value
    }
    const response = await request.get('/courses', { params })
    courses.value = response.data
    
    console.log('获取到的课程数据:', response.data)
    console.log('第一个课程的 groupId:', response.data[0]?.groupId)
    
    calendarOptions.value.events = response.data.map(course => {
      let backgroundColor = '#3a8ee6'
      let title = `${course.studentId?.name || '未分配'}<br>${formatTime(course.startTime)}`
      
      if (course.isGiftLesson) {
        title += ' [赠]'
        backgroundColor = '#8e44ad'
      }
      
      if (course.status === 'cancelled') {
        backgroundColor = '#e74c3c'
      } else if (course.status === 'completed') {
        backgroundColor = '#27ae60'
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
    const params = {}
    if (userStore.isAdmin() && selectedTeacherId.value) {
      params.teacherId = selectedTeacherId.value
    }
    const response = await request.get('/students', { params })
    students.value = response.data
  } catch (error) {
    console.error('获取学生列表失败', error)
  }
}

const fetchTeachers = async () => {
  if (!userStore.isAdmin()) return
  try {
    const response = await request.get('/teachers')
    teachers.value = response.data
  } catch (error) {
    console.error('获取教师列表失败', error)
  }
}

const handleTeacherChange = () => {
  fetchCourses()
  fetchStudents()
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
  }
}

const handleCourseTypeChange = (courseTypeId) => {
  // 课程时长现在是独立选择的，不需要自动计算
}

const handleAdd = () => {
  dialogTitle.value = '添加课程'
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  form.value = {
    _id: '',
    studentId: '',
    courseTypeId: '',
    date: dateStr,
    startTime: '',
    duration: 60,
    isRecurring: false,
    recurringStartDate: dateStr,
    recurringEndDate: '',
    status: 'normal',
    notes: '',
    groupId: '',
    groupCourseCount: 0,
    courseIndex: 0,
    applyToGroup: false
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

const handleDeleteGroup = async () => {
  try {
    await ElMessageBox.confirm(`确定要删除同组的${form.value.groupCourseCount}节课程吗？此操作不可恢复！`, '批量删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await request.delete(`/courses/group/${form.value.groupId}`)
    ElMessage.success(`成功删除${form.value.groupCourseCount}节课程`)
    dialogVisible.value = false
    await fetchCourses()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除课程失败', error)
    }
  }
}

const openRescheduleDialog = () => {
  rescheduleForm.value = {
    newStartDate: form.value.date,
    newEndDate: form.value.date,
    newStartTime: form.value.startTime,
    duration: form.value.duration
  }
  rescheduleDialogVisible.value = true
}

const handleReschedule = async () => {
  try {
    if (!rescheduleForm.value.newStartDate || !rescheduleForm.value.newEndDate || !rescheduleForm.value.newStartTime) {
      ElMessage.error('请填写完整的重新排课信息')
      return
    }
    
    const response = await request.post(`/courses/group/${form.value.groupId}/reschedule`, {
      fromCourseId: form.value._id,
      newStartDate: rescheduleForm.value.newStartDate,
      newEndDate: rescheduleForm.value.newEndDate,
      newStartTime: rescheduleForm.value.newStartTime,
      duration: rescheduleForm.value.duration
    })
    
    ElMessage.success(response.message)
    rescheduleDialogVisible.value = false
    dialogVisible.value = false
    await fetchCourses()
  } catch (error) {
    console.error('重新排课失败', error)
    ElMessage.error(error.response?.data?.message || '重新排课失败')
  }
}

const handleSave = async () => {
  try {
    if (!form.value.date || !form.value.startTime) {
      ElMessage.error('请填写完整信息')
      return
    }
    
    const date = new Date(form.value.date)
    const [hours, minutes] = form.value.startTime.split(':')
    const startTime = new Date(date)
    startTime.setHours(parseInt(hours))
    startTime.setMinutes(parseInt(minutes))
    const endTime = new Date(startTime.getTime() + form.value.duration * 60000)
    
    const dataToSend = {
      studentId: form.value.studentId || null,
      courseTypeId: form.value.courseTypeId || null,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      status: form.value.status,
      notes: form.value.notes
    }
    
    if (dialogTitle.value === '添加课程') {
      if (form.value.isRecurring && form.value.recurringStartDate && form.value.recurringEndDate) {
        const startDate = new Date(form.value.recurringStartDate)
        const endDate = new Date(form.value.recurringEndDate)
        const targetDayOfWeek = startTime.getDay()
        
        const dates = []
        let currentDate = new Date(startDate)
        while (currentDate <= endDate) {
          if (currentDate.getDay() === targetDayOfWeek) {
            dates.push(new Date(currentDate))
          }
          currentDate.setDate(currentDate.getDate() + 1)
        }
        
        const groupId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
        
        const promises = dates.map(date => {
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          const courseStartTime = new Date(`${dateStr}T${form.value.startTime}:00`)
          const courseEndTime = new Date(courseStartTime.getTime() + form.value.duration * 60000)
          
          return request.post('/courses', {
            studentId: form.value.studentId || undefined,
            courseTypeId: form.value.courseTypeId || undefined,
            startTime: courseStartTime.toISOString(),
            endTime: courseEndTime.toISOString(),
            status: 'normal',
            notes: form.value.notes,
            groupId: groupId
          })
        })
        
        await Promise.all(promises)
        ElMessage.success(`成功创建${dates.length}节课程`)
      } else {
        await request.post('/courses', dataToSend)
        ElMessage.success('添加成功')
      }
    } else {
      if (form.value.applyToGroup && form.value.groupId) {
        const groupCourses = courses.value.filter(c => c.groupId === form.value.groupId)
        const [hours, minutes] = form.value.startTime.split(':')
        
        const currentIndex = groupCourses.findIndex(c => c._id === form.value._id)
        const coursesToUpdate = groupCourses.slice(currentIndex)
        
        const updatePromises = coursesToUpdate.map(course => {
          const originalDate = new Date(course.startTime)
          const newStartTime = new Date(originalDate)
          newStartTime.setHours(parseInt(hours))
          newStartTime.setMinutes(parseInt(minutes))
          const newEndTime = new Date(newStartTime.getTime() + form.value.duration * 60000)
          
          return request.put(`/courses/${course._id}`, {
            studentId: form.value.studentId || null,
            courseTypeId: form.value.courseTypeId || null,
            startTime: newStartTime.toISOString(),
            endTime: newEndTime.toISOString(),
            status: form.value.status,
            notes: form.value.notes
          })
        })
        
        await Promise.all(updatePromises)
        ElMessage.success(`成功更新${coursesToUpdate.length}节课程`)
      } else {
        await request.put(`/courses/${form.value._id}`, dataToSend)
        ElMessage.success('更新成功')
        
        if (form.value.isRecurring && form.value.recurringStartDate && form.value.recurringEndDate) {
          const startDate = new Date(form.value.recurringStartDate)
          const endDate = new Date(form.value.recurringEndDate)
          const targetDayOfWeek = startTime.getDay()
          
          const dates = []
          let currentDate = new Date(startDate)
          while (currentDate <= endDate) {
            if (currentDate.getDay() === targetDayOfWeek) {
              const dateStr = formatDate(currentDate)
              if (dateStr !== form.value.date) {
                dates.push(new Date(currentDate))
              }
            }
            currentDate.setDate(currentDate.getDate() + 1)
          }
          
          const promises = dates.map(date => {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            const courseStartTime = new Date(`${dateStr}T${form.value.startTime}:00`)
            const courseEndTime = new Date(courseStartTime.getTime() + form.value.duration * 60000)
            
            return request.post('/courses', {
              studentId: form.value.studentId || undefined,
              courseTypeId: form.value.courseTypeId || undefined,
              startTime: courseStartTime.toISOString(),
              endTime: courseEndTime.toISOString(),
              status: 'normal',
              notes: form.value.notes
            })
          })
          
          await Promise.all(promises)
          ElMessage.success(`保存成功，新增${dates.length}节课程`)
        } else {
          ElMessage.success('更新成功')
        }
      }
    }
    
    dialogVisible.value = false
    await fetchCourses()
  } catch (error) {
    console.error('保存课程失败', error)
  }
}

const formatDate = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

onMounted(() => {
  fetchCourses()
  fetchStudents()
  fetchCourseTypes()
  fetchTeachers()
  
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

:deep(.fc-event-title) {
  white-space: normal;
}

:deep(.fc-event-main-frame) {
  flex-direction: column;
}

@media (max-width: 768px) {
  :deep(.fc) {
    font-size: 12px;
  }
  
  :deep(.fc-event-title) {
    white-space: normal;
    overflow-wrap: break-word;
    word-break: break-all;
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

.event-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
  min-height: 40px;
}

.event-time {
  font-size: 13px;
  color: #fff;
  font-weight: 500;
}

.event-student {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.fc-event) {
  border: none !important;
  cursor: pointer;
}

:deep(.fc-event-main) {
  padding: 0 !important;
}

@media (max-width: 768px) {
  :deep(.fc-event) {
    min-height: 44px !important;
  }
  
  :deep(.fc-timegrid-event) {
    min-height: 50px !important;
  }
  
  :deep(.fc-event-main) {
    padding: 8px !important;
  }
}

:deep(.fc-daygrid-event) {
  margin: 1px 2px !important;
}

:deep(.fc-daygrid-event .event-content) {
  font-size: 12px;
  padding: 2px 4px;
  min-height: auto;
}

:deep(.fc-daygrid-event .event-time) {
  font-size: 11px;
}

:deep(.fc-daygrid-event .event-student) {
  font-size: 12px;
}

@media (max-width: 768px) {
  :deep(.fc-daygrid-event .event-content) {
    font-size: 10px;
    padding: 1px 3px;
  }
  
  :deep(.fc-daygrid-event .event-time) {
    font-size: 9px;
  }
  
  :deep(.fc-daygrid-event .event-student) {
    font-size: 10px;
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
