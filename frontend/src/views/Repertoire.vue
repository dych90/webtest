<template>
  <div class="repertoire">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>曲目管理</span>
          <el-button type="primary" @click="handleAdd">添加曲目</el-button>
        </div>
      </template>
      
      <el-table :data="repertoire" style="width: 100%">
        <el-table-column prop="studentName" label="学生" />
        <el-table-column prop="pieceName" label="曲目名称" />
        <el-table-column prop="recordDate" label="录入日期" />
        <el-table-column prop="notes" label="备注" />
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
        <el-form-item label="曲目名称">
          <el-input v-model="form.pieceName" />
        </el-form-item>
        <el-form-item label="录入日期">
          <el-date-picker
            v-model="form.recordDate"
            type="date"
            placeholder="选择录入日期"
            style="width: 100%"
          />
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

const repertoire = ref([])
const students = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加曲目')
const form = ref({
  studentId: '',
  pieceName: '',
  recordDate: '',
  notes: ''
})

const fetchRepertoire = async () => {
  try {
    const response = await request.get('/repertoires')
    repertoire.value = response.data.map(item => ({
      ...item,
      studentName: item.studentId?.name || '未分配'
    }))
  } catch (error) {
    console.error('获取曲目列表失败', error)
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

const handleAdd = () => {
  dialogTitle.value = '添加曲目'
  form.value = {
    studentId: '',
    pieceName: '',
    recordDate: '',
    notes: ''
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑曲目'
  form.value = { ...row }
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await request.delete(`/repertoires/${row._id}`)
    ElMessage.success('删除成功')
    await fetchRepertoire()
  } catch (error) {
    console.error('删除曲目失败', error)
  }
}

const handleSave = async () => {
  try {
    if (dialogTitle.value === '添加曲目') {
      await request.post('/repertoires', form.value)
      ElMessage.success('添加成功')
    } else {
      await request.put(`/repertoires/${form.value._id}`, form.value)
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    await fetchRepertoire()
  } catch (error) {
    console.error('保存曲目失败', error)
  }
}

onMounted(() => {
  fetchRepertoire()
  fetchStudents()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
