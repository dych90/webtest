<template>
  <div class="fee-standards">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>收费标准管理</span>
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
            <el-button type="primary" @click="handleAdd">添加收费标准</el-button>
          </div>
        </div>
      </template>
      
      <div class="desktop-table">
        <el-table :data="feeStandards" style="width: 100%">
          <el-table-column prop="studentName" label="学生" min-width="100" />
          <el-table-column prop="courseTypeName" label="课程类型" min-width="120" />
          <el-table-column prop="price" label="单价" min-width="80">
            <template #default="{ row }">
              ¥{{ row.price }}
            </template>
          </el-table-column>
          <el-table-column prop="effectiveDate" label="生效日期" min-width="110">
            <template #default="{ row }">
              {{ formatDate(row.effectiveDate) }}
            </template>
          </el-table-column>
          <el-table-column prop="expireDate" label="失效日期" min-width="110">
            <template #default="{ row }">
              {{ row.expireDate ? formatDate(row.expireDate) : '永久' }}
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
        <div v-for="standard in feeStandards" :key="standard._id" class="standard-card">
          <div class="standard-info">
            <div class="standard-name">{{ standard.studentName }}</div>
          </div>
          <div class="standard-detail">
            <div class="detail-item">
              <span class="label">课程类型:</span>
              <span class="value">{{ standard.courseTypeName }}</span>
            </div>
            <div class="detail-item">
              <span class="label">单价:</span>
              <span class="value price">¥{{ standard.price }}</span>
            </div>
            <div class="detail-item">
              <span class="label">生效日期:</span>
              <span class="value">{{ formatDate(standard.effectiveDate) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">失效日期:</span>
              <span class="value">{{ standard.expireDate ? formatDate(standard.expireDate) : '永久' }}</span>
            </div>
          </div>
          <div class="standard-actions">
            <el-button size="small" @click="handleEdit(standard)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(standard)">删除</el-button>
          </div>
        </div>
        <div v-if="feeStandards.length === 0" class="empty-tip">
          暂无收费标准数据
        </div>
      </div>
    </el-card>

    <el-dialog 
      v-model="dialogVisible" 
      :title="dialogTitle" 
      :width="isMobile ? '95%' : '600px'" 
      :style="isMobile ? 'margin: 5vh auto;' : ''"
    >
      <el-form :model="form" :label-width="isMobile ? '80px' : '100px'">
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
          <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 100%" />
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
            placeholder="选择失效日期（可选）"
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
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const feeStandards = ref([])
const students = ref([])
const courseTypes = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加收费标准')
const uploadRef = ref(null)
const windowWidth = ref(window.innerWidth)

const isMobile = computed(() => windowWidth.value < 768)

const handleResize = () => {
  windowWidth.value = window.innerWidth
}

const form = ref({
  studentId: '',
  courseTypeId: '',
  price: 0,
  effectiveDate: '',
  expireDate: ''
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
    const response = await request.post('/fee-standards/import', formData, {
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
      
      await fetchFeeStandards()
    }
  } catch (error) {
    console.error('导入失败', error)
    ElMessage.error(error.response?.data?.message || '导入失败，请检查文件格式')
  }
}

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
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.fee-standards {
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
  .fee-standards {
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

  .standard-card {
    background: #f5f7fa;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .standard-info {
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e4e7ed;
  }

  .standard-name {
    font-size: 16px;
    font-weight: bold;
    color: #303133;
  }

  .standard-detail {
    margin-bottom: 12px;
  }

  .detail-item {
    display: flex;
    margin-bottom: 6px;
    font-size: 14px;
  }

  .detail-item .label {
    color: #909399;
    width: 80px;
    flex-shrink: 0;
  }

  .detail-item .value {
    color: #606266;
  }

  .detail-item .value.price {
    color: #f56c6c;
    font-weight: bold;
    font-size: 16px;
  }

  .standard-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .standard-actions .el-button {
    flex: 1;
  }
}
</style>
