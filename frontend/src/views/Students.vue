<template>
  <div class="students">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>学生管理</span>
          <div class="header-buttons">
            <el-select
              v-if="userStore.isAdmin()"
              v-model="selectedTeacherId"
              placeholder="筛选教师"
              clearable
              style="width: 150px; margin-right: 10px;"
              @change="fetchStudents"
            >
              <el-option
                v-for="teacher in teachers"
                :key="teacher._id"
                :label="teacher.name"
                :value="teacher._id"
              />
            </el-select>
            <el-upload
              v-if="!userStore.isAdmin()"
              ref="uploadRef"
              :show-file-list="false"
              :before-upload="beforeUpload"
              :http-request="handleImport"
              accept=".xlsx,.xls"
            >
              <el-button type="success">导入Excel</el-button>
            </el-upload>
            <el-button v-if="!userStore.isAdmin()" type="primary" @click="handleAdd">添加学生</el-button>
          </div>
        </div>
      </template>
      
      <div class="desktop-table">
        <el-table :data="students" style="width: 100%">
          <el-table-column prop="name" label="姓名" min-width="80" />
          <el-table-column prop="gender" label="性别" width="60" />
          <el-table-column prop="age" label="年龄" width="60" />
          <el-table-column prop="phone" label="联系电话" min-width="110" />
          <el-table-column prop="defaultCourseTypeName" label="课程类型" min-width="100" />
          <el-table-column prop="paymentType" label="付费类型" width="90">
            <template #default="{ row }">
              <el-tag :type="row.paymentType === 'prepaid' ? 'primary' : 'success'">
                {{ row.paymentType === 'prepaid' ? '预付费' : '单次付费' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="practiceTeacher" label="陪练老师" min-width="80" />
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button v-if="!userStore.isAdmin()" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button v-if="!userStore.isAdmin()" size="small" type="danger" @click="handleDelete(row)">删除</el-button>
              <span v-if="userStore.isAdmin()" style="color: #999;">仅查看</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div class="mobile-cards">
        <div v-for="student in students" :key="student._id" class="student-card">
          <div class="student-info">
            <div class="student-name">{{ student.name }}</div>
            <el-tag :type="student.paymentType === 'prepaid' ? 'primary' : 'success'" size="small">
              {{ student.paymentType === 'prepaid' ? '预付费' : '单次付费' }}
            </el-tag>
          </div>
          <div class="student-detail">
            <div class="detail-item">
              <span class="label">性别:</span>
              <span class="value">{{ student.gender || '未设置' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">年龄:</span>
              <span class="value">{{ student.age || '未设置' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">联系电话:</span>
              <span class="value">{{ student.phone || '未设置' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">课程类型:</span>
              <span class="value">{{ student.defaultCourseTypeName }}</span>
            </div>
            <div class="detail-item" v-if="student.practiceTeacher">
              <span class="label">陪练老师:</span>
              <span class="value">{{ student.practiceTeacher }}</span>
            </div>
          </div>
          <div class="student-actions">
            <el-button v-if="!userStore.isAdmin()" size="small" @click="handleEdit(student)">编辑</el-button>
            <el-button v-if="!userStore.isAdmin()" size="small" type="danger" @click="handleDelete(student)">删除</el-button>
            <span v-if="userStore.isAdmin()" style="color: #999; font-size: 12px;">仅查看</span>
          </div>
        </div>
        <div v-if="students.length === 0" class="empty-tip">
          暂无学生数据
        </div>
      </div>
    </el-card>

    <el-dialog 
      v-model="dialogVisible" 
      :title="dialogTitle" 
      :width="isMobile ? '95%' : '500px'" 
      :style="isMobile ? 'margin: 5vh auto;' : ''"
    >
      <el-form :model="form" :label-width="isMobile ? '80px' : '100px'">
        <el-form-item label="姓名">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="性别">
          <el-input v-model="form.gender" />
        </el-form-item>
        <el-form-item label="年龄">
          <el-input-number v-model="form.age" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="课程类型">
          <el-select v-model="form.defaultCourseTypeId" placeholder="请选择默认课程类型" style="width: 100%">
            <el-option
              v-for="type in courseTypes"
              :key="type._id"
              :label="type.name"
              :value="type._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="付费类型">
          <el-select v-model="form.paymentType" placeholder="请选择付费类型" style="width: 100%">
            <el-option label="预付费" value="prepaid" />
            <el-option label="单次付费" value="payPerLesson" />
          </el-select>
        </el-form-item>
        <el-form-item label="陪练老师">
          <el-input v-model="form.practiceTeacher" placeholder="请输入陪练老师姓名" />
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
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const students = ref([])
const courseTypes = ref([])
const teachers = ref([])
const selectedTeacherId = ref('')
const dialogVisible = ref(false)
const dialogTitle = ref('添加学生')
const uploadRef = ref(null)
const windowWidth = ref(window.innerWidth)

const isMobile = computed(() => windowWidth.value < 768)

const handleResize = () => {
  windowWidth.value = window.innerWidth
}

const form = ref({
  name: '',
  gender: '',
  age: 0,
  phone: '',
  defaultCourseTypeId: '',
  paymentType: 'prepaid',
  practiceTeacher: '',
  notes: ''
})

const beforeUpload = (file) => {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
  if (!isExcel) {
    ElMessage.error('只能上传 Excel 文件（.xlsx 或 .xls）')
    return false
  }
  return true
}

const handleImport = async (options) => {
  const formData = new FormData()
  formData.append('file', options.file)
  
  try {
    ElMessage.info('正在导入，请稍候...')
    const response = await request.post('/students/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    if (response.data) {
      const { successCount, failCount, errors } = response.data
      let message = `导入完成！成功：${successCount} 条`
      if (failCount > 0) {
        message += `，失败：${failCount} 条`
      }
      ElMessage.success(message)
      
      if (errors && errors.length > 0) {
        console.log('导入错误详情：', errors)
      }
      
      await fetchStudents()
    }
  } catch (error) {
    console.error('导入失败', error)
    ElMessage.error(error.response?.data?.message || '导入失败，请检查文件格式')
  }
}

const fetchStudents = async () => {
  try {
    const params = {}
    if (userStore.isAdmin() && selectedTeacherId.value) {
      params.teacherId = selectedTeacherId.value
    }
    const response = await request.get('/students', { params })
    students.value = response.data.map(student => ({
      ...student,
      defaultCourseTypeName: student.defaultCourseTypeId?.name || '未设置'
    }))
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

const fetchCourseTypes = async () => {
  try {
    const response = await request.get('/course-types')
    courseTypes.value = response.data
  } catch (error) {
    console.error('获取课程类型列表失败', error)
  }
}

const handleAdd = () => {
  dialogTitle.value = '添加学生'
  form.value = {
    name: '',
    gender: '',
    age: 0,
    phone: '',
    defaultCourseTypeId: '',
    paymentType: 'prepaid',
    practiceTeacher: '',
    notes: ''
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑学生'
  form.value = {
    ...row,
    defaultCourseTypeId: row.defaultCourseTypeId?._id || row.defaultCourseTypeId || ''
  }
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await request.delete(`/students/${row._id}`)
    ElMessage.success('删除成功')
    await fetchStudents()
  } catch (error) {
    console.error('删除学生失败', error)
  }
}

const handleSave = async () => {
  try {
    if (dialogTitle.value === '添加学生') {
      await request.post('/students', form.value)
      ElMessage.success('添加成功')
    } else {
      await request.put(`/students/${form.value._id}`, form.value)
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    await fetchStudents()
  } catch (error) {
    console.error('保存学生失败', error)
  }
}

onMounted(() => {
  fetchStudents()
  fetchCourseTypes()
  fetchTeachers()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.students {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-buttons {
  display: flex;
  gap: 10px;
}

.mobile-cards {
  display: none;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

@media (max-width: 768px) {
  .students {
    padding: 12px;
  }

  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .header-buttons {
    flex-direction: column;
    gap: 8px;
  }
  
  .header-buttons .el-button {
    width: 100%;
  }

  .desktop-table {
    display: none;
  }

  .mobile-cards {
    display: block;
  }

  .student-card {
    background: #f5f7fa;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .student-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e4e7ed;
  }

  .student-name {
    font-size: 16px;
    font-weight: bold;
    color: #303133;
  }

  .student-detail {
    margin-bottom: 12px;
  }

  .detail-item {
    display: flex;
    margin-bottom: 6px;
    font-size: 14px;
  }

  .detail-item .label {
    color: #909399;
    width: 70px;
    flex-shrink: 0;
  }

  .detail-item .value {
    color: #606266;
  }

  .student-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .student-actions .el-button {
    flex: 1;
  }
}
</style>
