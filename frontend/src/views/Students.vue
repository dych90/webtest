<template>
  <div class="students">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>学生管理</span>
          <div class="header-buttons">
            <el-upload
              ref="uploadRef"
              :show-file-list="false"
              :before-upload="beforeUpload"
              :http-request="handleImport"
              accept=".xlsx,.xls"
            >
              <el-button type="success">导入Excel</el-button>
            </el-upload>
            <el-button type="primary" @click="handleAdd">添加学生</el-button>
          </div>
        </div>
      </template>
      
      <el-table :data="students" style="width: 100%">
        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="gender" label="性别" />
        <el-table-column prop="age" label="年龄" />
        <el-table-column prop="phone" label="联系电话" />
        <el-table-column prop="parentName" label="家长姓名" />
        <el-table-column prop="parentPhone" label="家长电话" />
        <el-table-column prop="defaultCourseTypeName" label="默认课程类型" />
        <el-table-column prop="paymentType" label="付费类型">
          <template #default="{ row }">
            <el-tag :type="row.paymentType === 'prepaid' ? 'primary' : 'success'">
              {{ row.paymentType === 'prepaid' ? '预付费' : '单次付费' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="practiceTeacher" label="陪练老师" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" :width="isMobile ? '95%' : '500px'" :style="isMobile ? 'margin: 5vh auto;' : ''">
      <el-form :model="form" label-width="100px">
        <el-form-item label="姓名">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="性别">
          <el-input v-model="form.gender" />
        </el-form-item>
        <el-form-item label="年龄">
          <el-input-number v-model="form.age" :min="0" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="家长姓名">
          <el-input v-model="form.parentName" />
        </el-form-item>
        <el-form-item label="家长电话">
          <el-input v-model="form.parentPhone" />
        </el-form-item>
        <el-form-item label="默认课程类型">
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
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const students = ref([])
const courseTypes = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加学生')
const uploadRef = ref(null)

const isMobile = computed(() => window.innerWidth < 768)

const form = ref({
  name: '',
  gender: '',
  age: 0,
  phone: '',
  parentName: '',
  parentPhone: '',
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
    const response = await request.get('/students')
    students.value = response.data.map(student => ({
      ...student,
      defaultCourseTypeName: student.defaultCourseTypeId?.name || '未设置'
    }))
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

const handleAdd = () => {
  dialogTitle.value = '添加学生'
  form.value = {
    name: '',
    gender: '',
    age: 0,
    phone: '',
    parentName: '',
    parentPhone: '',
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
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-buttons {
  display: flex;
  gap: 10px;
}

@media (max-width: 768px) {
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
}
</style>
