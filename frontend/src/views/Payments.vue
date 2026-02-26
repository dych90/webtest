<template>
  <div class="payments">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>缴费管理</span>
          <el-button type="primary" @click="handleAdd">添加缴费</el-button>
        </div>
      </template>
      
      <el-table :data="payments" style="width: 100%">
        <el-table-column prop="studentName" label="学生" />
        <el-table-column prop="paymentType" label="缴费类型" />
        <el-table-column prop="amount" label="缴费金额">
          <template #default="{ row }">
            ¥{{ row.amount }}
          </template>
        </el-table-column>
        <el-table-column prop="totalLessons" label="预交课时" />
        <el-table-column prop="bonusLessons" label="赠送课时" />
        <el-table-column prop="paymentDate" label="缴费日期" width="180">
          <template #default="{ row }">
            {{ formatDate(row.paymentDate) }}
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
        <el-form-item label="缴费类型">
          <el-select v-model="form.paymentType" placeholder="请选择缴费类型" style="width: 100%">
            <el-option label="现金" value="现金" />
            <el-option label="微信" value="微信" />
            <el-option label="支付宝" value="支付宝" />
            <el-option label="银行转账" value="银行转账" />
          </el-select>
        </el-form-item>
        <el-form-item label="缴费金额">
          <el-input-number v-model="form.amount" :min="0" :precision="2" />
        </el-form-item>
        <template v-if="selectedStudentPaymentType === 'prepaid'">
          <el-form-item label="预交课时">
            <el-input-number v-model="form.totalLessons" :min="1" />
          </el-form-item>
          <el-form-item label="赠送课时">
            <el-input-number v-model="form.bonusLessons" :min="0" />
          </el-form-item>
        </template>
        <el-form-item label="缴费日期">
          <el-date-picker
            v-model="form.paymentDate"
            type="date"
            placeholder="选择缴费日期"
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
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const payments = ref([])
const students = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加缴费')
const selectedStudentPaymentType = ref('prepaid')
const form = ref({
  studentId: '',
  paymentType: '现金',
  amount: 0,
  totalLessons: 0,
  bonusLessons: 0,
  paymentDate: '',
  notes: ''
})

watch(() => form.value.studentId, (newStudentId) => {
  const student = students.value.find(s => s._id === newStudentId)
  if (student) {
    selectedStudentPaymentType.value = student.paymentType || 'prepaid'
    if (student.paymentType === 'payPerLesson') {
      form.value.totalLessons = 0
      form.value.bonusLessons = 0
    }
  }
})

const fetchPayments = async () => {
  try {
    const response = await request.get('/payments')
    payments.value = response.data.map(item => ({
      ...item,
      studentName: item.studentId?.name || '未分配'
    }))
  } catch (error) {
    console.error('获取缴费列表失败', error)
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
  dialogTitle.value = '添加缴费'
  form.value = {
    studentId: '',
    paymentType: '现金',
    amount: 0,
    totalLessons: 0,
    bonusLessons: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑缴费'
  form.value = { ...row }
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await request.delete(`/payments/${row._id}`)
    ElMessage.success('删除成功')
    await fetchPayments()
  } catch (error) {
    console.error('删除缴费记录失败', error)
  }
}

const handleSave = async () => {
  try {
    if (dialogTitle.value === '添加缴费') {
      await request.post('/payments', form.value)
      ElMessage.success('添加成功')
    } else {
      await request.put(`/payments/${form.value._id}`, form.value)
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    await fetchPayments()
  } catch (error) {
    console.error('保存缴费记录失败', error)
  }
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN')
}

onMounted(() => {
  fetchPayments()
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
