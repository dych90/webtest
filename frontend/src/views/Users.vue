<template>
  <div class="users">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>教师管理</span>
          <el-button type="primary" @click="handleAdd">添加教师</el-button>
        </div>
      </template>
      
      <div class="desktop-table">
        <el-table :data="teachers" style="width: 100%">
          <el-table-column prop="username" label="用户名" min-width="100" />
          <el-table-column prop="name" label="姓名" min-width="80" />
          <el-table-column prop="phone" label="联系电话" min-width="120" />
          <el-table-column prop="role" label="角色" width="100">
            <template #default="{ row }">
              <el-tag :type="row.role === 'admin' ? 'danger' : 'success'">
                {{ row.role === 'admin' ? '管理员' : '教师' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" min-width="160">
            <template #default="{ row }">
              {{ new Date(row.createdAt).toLocaleString() }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div class="mobile-cards">
        <div v-for="teacher in teachers" :key="teacher._id" class="teacher-card">
          <div class="teacher-info">
            <div class="teacher-name">{{ teacher.name || teacher.username }}</div>
            <el-tag :type="teacher.role === 'admin' ? 'danger' : 'success'" size="small">
              {{ teacher.role === 'admin' ? '管理员' : '教师' }}
            </el-tag>
          </div>
          <div class="teacher-detail">
            <div class="detail-item">
              <span class="label">用户名:</span>
              <span class="value">{{ teacher.username }}</span>
            </div>
            <div class="detail-item">
              <span class="label">联系电话:</span>
              <span class="value">{{ teacher.phone || '未设置' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">创建时间:</span>
              <span class="value">{{ new Date(teacher.createdAt).toLocaleDateString() }}</span>
            </div>
          </div>
          <div class="teacher-actions">
            <el-button size="small" @click="handleEdit(teacher)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(teacher)">删除</el-button>
          </div>
        </div>
        <div v-if="teachers.length === 0" class="empty-tip">
          暂无教师数据
        </div>
      </div>
    </el-card>
    
    <el-dialog 
      v-model="dialogVisible" 
      :title="dialogTitle" 
      :width="isMobile ? '95%' : '500px'"
      :style="isMobile ? 'margin: 5vh auto;' : ''"
    >
      <el-form :model="form" :label-width="isMobile ? '80px' : '80px'">
        <el-form-item label="用户名">
          <el-input v-model="form.username" :disabled="!!form._id" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" :placeholder="form._id ? '留空表示不修改' : ''" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="教师" value="teacher" />
            <el-option label="管理员" value="admin" />
          </el-select>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const teachers = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加教师')
const windowWidth = ref(window.innerWidth)

const isMobile = computed(() => windowWidth.value < 768)

const handleResize = () => {
  windowWidth.value = window.innerWidth
}

const form = ref({
  _id: '',
  username: '',
  password: '',
  name: '',
  phone: '',
  role: 'teacher'
})

const fetchTeachers = async () => {
  try {
    const response = await request.get('/users')
    teachers.value = response.data || []
  } catch (error) {
    console.error('获取教师列表错误', error)
    ElMessage.error('获取教师列表失败')
  }
}

const handleAdd = () => {
  dialogTitle.value = '添加教师'
  form.value = {
    _id: '',
    username: '',
    password: '',
    name: '',
    phone: '',
    role: 'teacher'
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑教师'
  form.value = {
    _id: row._id,
    username: row.username,
    password: '',
    name: row.name,
    phone: row.phone,
    role: row.role
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  try {
    if (!form.value._id && !form.value.password) {
      ElMessage.error('请输入密码')
      return
    }
    
    if (form.value._id) {
      const updateData = {
        name: form.value.name,
        phone: form.value.phone,
        role: form.value.role
      }
      
      if (form.value.password) {
        updateData.password = form.value.password
      }
      
      await request.put(`/users/${form.value._id}`, updateData)
      ElMessage.success('更新成功')
    } else {
      await request.post('/users', form.value)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    await fetchTeachers()
  } catch (error) {
    console.error('保存教师错误', error)
    ElMessage.error(error.response?.data?.message || '保存失败')
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这个教师吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await request.delete(`/users/${row._id}`)
    ElMessage.success('删除成功')
    await fetchTeachers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除教师错误', error)
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

onMounted(() => {
  fetchTeachers()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.users {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  .users {
    padding: 12px;
  }

  .desktop-table {
    display: none;
  }

  .mobile-cards {
    display: block;
  }

  .teacher-card {
    background: #f5f7fa;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .teacher-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e4e7ed;
  }

  .teacher-name {
    font-size: 16px;
    font-weight: bold;
    color: #303133;
  }

  .teacher-detail {
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

  .teacher-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .teacher-actions .el-button {
    flex: 1;
  }
}
</style>
