<template>
  <div class="lessons">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>消课管理</span>
          <el-button type="primary" @click="handleAdd">添加消课</el-button>
        </div>
      </template>
      
      <el-tabs v-model="activeTab">
        <el-tab-pane label="消课记录" name="records">
          <el-table :data="lessons" style="width: 100%">
            <el-table-column prop="studentName" label="学生" />
            <el-table-column prop="recordDate" label="记录日期">
              <template #default="{ row }">
                {{ formatDateTime(row.recordDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="lessonsConsumed" label="消课数量" />
            <el-table-column prop="lessonContent" label="上课曲目" />
            <el-table-column prop="isDeducted" label="是否扣费">
              <template #default="{ row }">
                <el-tag :type="row.isDeducted ? 'success' : 'info'">
                  {{ row.isDeducted ? '已扣费' : '未扣费' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="notes" label="备注" />
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button size="small" @click="handleEdit(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="待上课课程" name="courses">
          <el-table :data="pendingCourses" style="width: 100%">
            <el-table-column prop="studentName" label="学生" />
            <el-table-column prop="courseTypeName" label="课程类型" />
            <el-table-column prop="startTime" label="开始时间" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.startTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="endTime" label="结束时间" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.endTime) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="handleAttend(row)">上课</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="学生">
          <el-select v-model="form.studentId" placeholder="请选择学生" style="width: 100%">
            <el-option
              v-for="student in students"
              :key="student._id"
              :label="student.name"
              :value="student._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="课程">
          <el-select v-model="form.courseId" placeholder="请选择课程" style="width: 100%">
            <el-option
              v-for="course in courses"
              :key="course._id"
              :label="`${course.studentId?.name || '未分配'} - ${course.courseTypeId?.name || '未分配'}`"
              :value="course._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="消课数量">
          <el-input-number v-model="form.lessonsConsumed" :min="1" />
        </el-form-item>
        <el-form-item label="上课曲目">
          <el-input v-model="form.lessonContent" type="textarea" />
        </el-form-item>
        <el-form-item label="是否扣费">
          <el-switch v-model="form.isDeducted" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const lessons = ref([])
const pendingCourses = ref([])
const students = ref([])
const courses = ref([])
const activeTab = ref('records')
const dialogVisible = ref(false)
const dialogTitle = ref('添加消课')
const form = ref({
  studentId: '',
  courseId: '',
  lessonsConsumed: 1,
  lessonContent: '',
  isDeducted: false,
  notes: ''
})

const fetchLessons = async () => {
  try {
    const response = await request.get('/lesson-records')
    lessons.value = response.data.map(record => ({
      ...record,
      studentName: record.studentId?.name || '未分配',
      courseName: `${record.courseId?.studentId?.name || '未分配'} - ${record.courseId?.courseTypeId?.name || '未分配'}`
    }))
  } catch (error) {
    console.error('获取消课记录失败', error)
  }
}

const fetchPendingCourses = async () => {
  try {
    const response = await request.get('/courses')
    pendingCourses.value = response.data
      .filter(course => course.status === 'normal')
      .map(course => ({
        ...course,
        studentName: course.studentId?.name || '未分配',
        courseTypeName: course.courseTypeId?.name || '未分配'
      }))
  } catch (error) {
    console.error('获取待上课课程失败', error)
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

const fetchCourses = async () => {
  try {
    const response = await request.get('/courses')
    courses.value = response.data
  } catch (error) {
    console.error('获取课程列表失败', error)
  }
}

const handleAdd = () => {
  dialogTitle.value = '添加消课'
  form.value = {
    studentId: '',
    courseId: '',
    lessonsConsumed: 1,
    lessonContent: '',
    isDeducted: false,
    notes: ''
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑消课'
  form.value = { ...row }
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await request.delete(`/lesson-records/${row._id}`)
    ElMessage.success('删除成功')
    await fetchLessons()
  } catch (error) {
    console.error('删除消课记录失败', error)
  }
}

const handleAttend = async (course) => {
  try {
    await request.put(`/courses/${course._id}`, { status: 'completed' })
    await request.post('/lesson-records', {
      studentId: course.studentId._id,
      courseId: course._id,
      courseStartTime: course.startTime,
      lessonsConsumed: 1,
      lessonContent: '',
      isDeducted: true,
      notes: '从排课直接上课'
    })
    ElMessage.success('上课成功')
    await fetchLessons()
    await fetchPendingCourses()
  } catch (error) {
    console.error('上课失败', error)
    ElMessage.error('上课失败')
  }
}

const handleSave = async () => {
  try {
    if (dialogTitle.value === '添加消课') {
      await request.post('/lesson-records', form.value)
      ElMessage.success('添加成功')
    } else {
      await request.put(`/lesson-records/${form.value._id}`, form.value)
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    await fetchLessons()
  } catch (error) {
    console.error('保存消课记录失败', error)
  }
}

const formatDateTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

onMounted(() => {
  fetchLessons()
  fetchPendingCourses()
  fetchStudents()
  fetchCourses()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
