<template>
  <div class="course-types">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>课程类型管理</span>
          <el-button type="primary" @click="handleAdd">添加课程类型</el-button>
        </div>
      </template>
      
      <el-table :data="courseTypes" style="width: 100%">
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="duration" label="时长（分钟）" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="时长（分钟）">
          <el-input-number v-model="form.duration" :min="1" />
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

const courseTypes = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加课程类型')
const form = ref({
  name: '',
  duration: 45
})

const fetchCourseTypes = async () => {
  try {
    const response = await request.get('/course-types')
    courseTypes.value = response.data
  } catch (error) {
    console.error('获取课程类型列表失败', error)
  }
}

const handleAdd = () => {
  dialogTitle.value = '添加课程类型'
  form.value = {
    name: '',
    duration: 45
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑课程类型'
  form.value = { ...row }
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await request.delete(`/course-types/${row._id}`)
    ElMessage.success('删除成功')
    await fetchCourseTypes()
  } catch (error) {
    console.error('删除课程类型失败', error)
  }
}

const handleSave = async () => {
  try {
    if (dialogTitle.value === '添加课程类型') {
      await request.post('/course-types', form.value)
      ElMessage.success('添加成功')
    } else {
      await request.put(`/course-types/${form.value._id}`, form.value)
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    await fetchCourseTypes()
  } catch (error) {
    console.error('保存课程类型失败', error)
  }
}

onMounted(() => {
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
