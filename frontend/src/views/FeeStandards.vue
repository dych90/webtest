<template>
  <div class="fee-standards">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>收费标准管理</span>
          <el-button type="primary" @click="handleAdd">添加收费标准</el-button>
        </div>
      </template>
      
      <el-table :data="feeStandards" style="width: 100%">
        <el-table-column prop="studentName" label="学生" />
        <el-table-column prop="courseTypeName" label="课程类型" />
        <el-table-column prop="price" label="单价">
          <template #default="{ row }">
            ¥{{ row.price }}
          </template>
        </el-table-column>
        <el-table-column prop="effectiveDate" label="生效日期" width="180">
          <template #default="{ row }">
            {{ formatDate(row.effectiveDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="expireDate" label="失效日期" width="180">
          <template #default="{ row }">
            {{ formatDate(row.expireDate) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
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
        <el-form-item label="课程类型">
          <el-select v-model="form.courseTypeId" placeholder="请选择课程类型" style="width: 100%">
            <el-option
              v-for="type in courseTypes"
              :key="type._id"
              :label="type.name"
              :value="type._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="单价">
          <el-input-number v-model="form.price" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="生效日期">
          <el-date-picker
            v-model="form.effectiveDate"
            type="date"
            placeholder="选择生效日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="失效日期">
          <el-date-picker
            v-model="form.expireDate"
            type="date"
            placeholder="选择失效日期"
            style="width: 100%"
          />
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

const feeStandards = ref([])
const students = ref([])
const courseTypes = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加收费标准')
const form = ref({
  studentId: '',
  courseTypeId: '',
  price: 0,
  effectiveDate: '',
  expireDate: ''
})

const fetchFeeStandards = async () => {
  try {
    const response = await request.get('/fee-standards')
    feeStandards.value = response.data.map(item => ({
      ...item,
      studentName: item.studentId?.name || '未分配',
      courseTypeName: item.courseTypeId?.name || '未分配'
    }))
  } catch (error) {
    console.error('获取收费标准列表失败', error)
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

const handleAdd = () => {
  dialogTitle.value = '添加收费标准'
  form.value = {
    studentId: '',
    courseTypeId: '',
    price: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
    expireDate: ''
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑收费标准'
  form.value = { ...row }
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await request.delete(`/fee-standards/${row._id}`)
    ElMessage.success('删除成功')
    await fetchFeeStandards()
  } catch (error) {
    console.error('删除收费标准失败', error)
  }
}

const handleSave = async () => {
  try {
    if (dialogTitle.value === '添加收费标准') {
      await request.post('/fee-standards', form.value)
      ElMessage.success('添加成功')
    } else {
      await request.put(`/fee-standards/${form.value._id}`, form.value)
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    await fetchFeeStandards()
  } catch (error) {
    console.error('保存收费标准失败', error)
  }
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN')
}

onMounted(() => {
  fetchFeeStandards()
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
</style>
