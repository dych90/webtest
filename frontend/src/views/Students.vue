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
          <el-table-column label="课时单价" width="100">
            <template #default="{ row }">
              <span v-if="row.currentPrice" class="price-text">¥{{ row.currentPrice }}</span>
              <span v-else class="no-price">未设置</span>
            </template>
          </el-table-column>
          <el-table-column prop="paymentType" label="付费类型" width="90">
            <template #default="{ row }">
              <el-tag :type="row.paymentType === 'prepaid' ? 'primary' : 'success'">
                {{ row.paymentType === 'prepaid' ? '预付费' : '单次付费' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="practiceTeacher" label="陪练老师" min-width="80" />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="handleViewDetail(row)">详情</el-button>
              <el-button v-if="!userStore.isAdmin()" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button v-if="!userStore.isAdmin()" size="small" type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div class="mobile-cards">
        <div v-for="student in students" :key="student._id" class="student-card" @click="handleViewDetail(student)">
          <div class="student-info">
            <div class="student-name">{{ student.name }}</div>
            <el-tag :type="student.paymentType === 'prepaid' ? 'primary' : 'success'" size="small">
              {{ student.paymentType === 'prepaid' ? '预付费' : '单次付费' }}
            </el-tag>
          </div>
          <div class="student-detail">
            <div class="detail-item">
              <span class="label">课时单价:</span>
              <span class="value price-text" v-if="student.currentPrice">¥{{ student.currentPrice }}</span>
              <span class="value no-price" v-else>未设置</span>
            </div>
            <div class="detail-item">
              <span class="label">课程类型:</span>
              <span class="value">{{ student.defaultCourseTypeName }}</span>
            </div>
            <div class="detail-item" v-if="student.phone">
              <span class="label">联系电话:</span>
              <span class="value">{{ student.phone }}</span>
            </div>
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
        <el-form-item label="课时单价">
          <el-input-number 
            v-model="form.currentPrice" 
            :min="0" 
            :precision="0"
            :step="10"
            style="width: 100%" 
          />
          <div v-if="dialogTitle === '编辑学生' && originalPrice && form.currentPrice !== originalPrice" class="price-hint">
            原单价：¥{{ originalPrice }}，修改后将记录价格变更历史
          </div>
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

    <el-dialog 
      v-model="detailDialogVisible" 
      title="学生详情" 
      :width="isMobile ? '95%' : '600px'" 
      :style="isMobile ? 'margin: 5vh auto;' : ''"
    >
      <div class="detail-content" v-if="currentStudent">
        <div class="detail-header">
          <div class="detail-avatar">{{ currentStudent.name?.charAt(0) || '学' }}</div>
          <div class="detail-info">
            <div class="detail-name">{{ currentStudent.name }}</div>
            <el-tag :type="currentStudent.paymentType === 'prepaid' ? 'primary' : 'success'">
              {{ currentStudent.paymentType === 'prepaid' ? '预付费' : '单次付费' }}
            </el-tag>
          </div>
        </div>
        
        <el-descriptions :column="isMobile ? 1 : 2" border>
          <el-descriptions-item label="性别">{{ currentStudent.gender || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="年龄">{{ currentStudent.age || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentStudent.phone || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="课程类型">{{ currentStudent.defaultCourseTypeId?.name || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="课时单价">
            <span class="price-text">¥{{ currentStudent.currentPrice || 0 }}/课时</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentStudent.paymentType === 'prepaid'" label="剩余课时">
            <span class="remaining-lessons">{{ currentStudent.remainingLessons || 0 }} 课时</span>
          </el-descriptions-item>
          <el-descriptions-item label="陪练老师">{{ currentStudent.practiceTeacher || '未设置' }}</el-descriptions-item>
          <el-descriptions-item v-if="currentStudent.notes" label="备注" :span="2">{{ currentStudent.notes }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="priceHistory.length > 0" class="price-history">
          <h4>价格变更历史</h4>
          <el-timeline>
            <el-timeline-item
              v-for="(item, index) in priceHistory"
              :key="item._id"
              :type="index === 0 ? 'primary' : 'info'"
              :hollow="index !== 0"
            >
              <div class="timeline-content">
                <div class="timeline-price">
                  <span class="price-value">¥{{ item.price }}</span>
                  <span class="price-unit">/课时</span>
                  <el-tag v-if="index === 0" type="success" size="small">当前</el-tag>
                </div>
                <div class="timeline-date">
                  {{ formatDate(item.effectiveDate) }}
                  <span v-if="item.expireDate"> - {{ formatDate(item.expireDate) }}</span>
                </div>
                <div v-if="item.courseTypeId?.name" class="timeline-course">
                  {{ item.courseTypeId.name }}
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button v-if="!userStore.isAdmin()" type="primary" @click="handleEditFromDetail">编辑</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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
const detailDialogVisible = ref(false)
const currentStudent = ref(null)
const priceHistory = ref([])
const originalPrice = ref('')

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
  currentPrice: 0,
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

const fetchPriceHistory = async (studentId) => {
  try {
    const response = await request.get(`/students/${studentId}/price-history`)
    priceHistory.value = response.data || []
  } catch (error) {
    console.error('获取价格历史失败', error)
    priceHistory.value = []
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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
    currentPrice: 0,
    practiceTeacher: '',
    notes: ''
  }
  originalPrice.value = ''
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑学生'
  form.value = {
    ...row,
    defaultCourseTypeId: row.defaultCourseTypeId?._id || row.defaultCourseTypeId || ''
  }
  originalPrice.value = row.currentPrice || ''
  dialogVisible.value = true
}

const handleViewDetail = async (row) => {
  try {
    const response = await request.get(`/students/${row._id}`)
    currentStudent.value = response.data
    detailDialogVisible.value = true
    await fetchPriceHistory(row._id)
  } catch (error) {
    console.error('获取学生详情失败', error)
  }
}

const handleEditFromDetail = () => {
  detailDialogVisible.value = false
  handleEdit(currentStudent.value)
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除学生"${row.name}"吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await request.delete(`/students/${row._id}`)
    ElMessage.success('删除成功')
    await fetchStudents()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除学生失败', error)
    }
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

.price-text {
  color: #E6A23C;
  font-weight: bold;
}

.no-price {
  color: #c0c4cc;
}

.mobile-cards {
  display: none;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

.price-hint {
  font-size: 12px;
  color: #E6A23C;
  margin-top: 5px;
}

.detail-content {
  padding: 10px 0;
}

.detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.detail-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
  font-weight: bold;
  margin-right: 16px;
}

.detail-name {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.remaining-lessons {
  color: #409EFF;
  font-weight: bold;
}

.price-history {
  margin-top: 24px;
}

.price-history h4 {
  margin-bottom: 16px;
  color: #303133;
}

.timeline-content {
  padding: 5px 0;
}

.timeline-price {
  display: flex;
  align-items: center;
  gap: 8px;
}

.price-value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.price-unit {
  font-size: 14px;
  color: #909399;
}

.timeline-date {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.timeline-course {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 2px;
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
    cursor: pointer;
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
    margin-bottom: 0;
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
}
</style>
