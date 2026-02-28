<template>
  <div class="balance">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>剩余课费管理</span>
        </div>
      </template>
      
      <el-table :data="balances" style="width: 100%">
        <el-table-column prop="studentName" label="学生" />
        <el-table-column prop="remainingLessons" label="剩余课时" width="100">
          <template #default="{ row }">
            <template v-if="row.paymentType === 'prepaid'">
              <el-tag :type="row.remainingLessons > 10 ? 'success' : row.remainingLessons > 5 ? 'warning' : 'danger'">
                {{ row.remainingLessons }} 课时
              </el-tag>
            </template>
            <template v-else>
              <el-tag type="info">单次付费</el-tag>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="lastUpdated" label="最后更新" width="120">
          <template #default="{ row }">
            {{ formatDate(row.lastUpdated) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="handleGenerateReportDialog(row)">生成上课情况</el-button>
            <el-button size="small" @click="handleUpdate(row)" :disabled="row.paymentType !== 'prepaid'">更新余额</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="更新课费余额" :width="isMobile ? '95%' : '500px'" :style="isMobile ? 'margin: 5vh auto;' : ''">
      <el-form :model="form" label-width="100px">
        <el-form-item label="学生">
          <span>{{ form.studentName }}</span>
        </el-form-item>
        <el-form-item label="当前余额">
          <span>{{ form.currentRemainingLessons }} 课时</span>
        </el-form-item>
        <el-form-item label="新余额">
          <el-input-number v-model="form.remainingLessons" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="reportDialogVisible" title="上课情况报告" :width="isMobile ? '95%' : '80%'" :close-on-click-modal="false" :style="isMobile ? 'margin: 5vh auto;' : ''">
      <el-form :model="reportForm" label-width="100px">
        <el-form-item label="学生">
          <span>{{ reportForm.studentName }}</span>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="reportForm.startDate"
            type="date"
            placeholder="选择开始日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="reportForm.endDate"
            type="date"
            placeholder="选择结束日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reportDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleGenerateReport">生成报告</el-button>
        <el-button type="success" @click="handleDownloadReport" :disabled="!reportImage">下载图片</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="reportImageDialogVisible" title="上课情况报告" :width="isMobile ? '95%' : '90%'" :close-on-click-modal="false" :style="isMobile ? 'margin: 5vh auto;' : ''">
      <div ref="reportContainer" class="report-container">
        <div class="logo-container">
          <img src="/xianjingartlogo.png" alt="Logo" class="logo-image" />
        </div>
        <h3 class="report-title">「{{ reportForm.studentName }}」· 上课情况报告</h3>
        <p class="report-subtitle">时间范围：{{ formatDate(reportForm.startDate) }} 至 {{ formatDate(reportForm.endDate) }}</p>
        <div class="report-summary">
          <div :class="['summary-grid', reportData.paymentType !== 'prepaid' ? 'single-item' : '']">
            <div class="summary-item summary-item-attended">
              <div class="summary-icon">♪</div>
              <div class="summary-content">
                <div class="summary-label">已上课</div>
                <div class="summary-value">{{ reportData.attendedLessons }}</div>
              </div>
            </div>
            <div v-if="reportData.paymentType === 'prepaid'" class="summary-item summary-item-remaining">
              <div class="summary-icon">🎹</div>
              <div class="summary-content">
                <div class="summary-label">剩余课时</div>
                <div class="summary-value">{{ reportData.remainingLessons }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="report-details">
          <h4>上课明细</h4>
          <div class="lesson-list">
            <div v-for="(lesson, index) in reportData.lessonDetails" :key="index" class="lesson-item">
              <div class="lesson-info">
                <div class="lesson-date-time">
                  <span class="lesson-date-text">{{ formatDate(lesson.date) }}</span>
                  <span class="lesson-time">{{ formatTime(lesson.startTime) }}</span>
                </div>
              </div>
              <div class="lesson-status">
                <span v-if="lesson.isGiftLesson" class="lesson-tag lesson-tag-gift">赠课</span>
                <span v-else :class="['lesson-tag', lesson.status === 'attended' ? 'lesson-tag-attended' : 'lesson-tag-absent']">
                  {{ lesson.status === 'attended' ? '已上课' : '缺席' }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="piano-keys">
          <div class="piano-key white-key"></div>
          <div class="piano-key black-key"></div>
          <div class="piano-key white-key"></div>
          <div class="piano-key black-key"></div>
          <div class="piano-key white-key"></div>
          <div class="piano-key black-key"></div>
          <div class="piano-key white-key"></div>
          <div class="piano-key black-key"></div>
          <div class="piano-key white-key"></div>
          <div class="piano-key black-key"></div>
          <div class="piano-key white-key"></div>
          <div class="piano-key black-key"></div>
          <div class="piano-key white-key"></div>
          <div class="piano-key black-key"></div>
          <div class="piano-key white-key"></div>
        </div>
      </div>
      <template #footer>
        <el-button @click="reportImageDialogVisible = false">关闭</el-button>
        <el-button type="success" @click="handleDownloadReport" :disabled="!reportImage">下载图片</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import html2canvas from 'html2canvas'
import * as echarts from 'echarts'

const balances = ref([])
const dialogVisible = ref(false)
const reportDialogVisible = ref(false)
const reportImageDialogVisible = ref(false)
const reportImage = ref(null)
const reportChartInstance = ref(null)

const isMobile = computed(() => window.innerWidth < 768)

const form = ref({
  studentId: '',
  studentName: '',
  currentRemainingLessons: 0,
  remainingLessons: 0
})
const reportForm = ref({
  studentId: '',
  studentName: '',
  startDate: '',
  endDate: '',
  remainingLessons: 0,
  paymentType: 'prepaid'
})
const reportData = ref({
  totalLessons: 0,
  attendedLessons: 0,
  missedLessons: 0,
  remainingLessons: 0,
  paymentType: 'prepaid',
  lessonDetails: []
})

const fetchBalances = async () => {
  try {
    const response = await request.get('/lesson-balances')
    balances.value = response.data.map(item => ({
      ...item,
      studentName: item.studentId?.name || '未分配',
      paymentType: item.studentId?.paymentType || 'prepaid'
    }))
  } catch (error) {
    console.error('获取课费余额列表失败', error)
  }
}

const handleUpdate = (row) => {
  form.value = {
    studentId: row.studentId._id,
    studentName: row.studentName,
    currentRemainingLessons: row.remainingLessons,
    remainingLessons: row.remainingLessons
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  try {
    await request.put('/lesson-balances', {
      studentId: form.value.studentId,
      remainingLessons: form.value.remainingLessons
    })
    ElMessage.success('更新成功')
    dialogVisible.value = false
    await fetchBalances()
  } catch (error) {
    console.error('更新课费余额失败', error)
  }
}

const handleGenerateReportDialog = async (row) => {
  try {
    const now = new Date()
    
    const paymentsResponse = await request.get('/payments', {
      params: {
        studentId: row.studentId._id
      }
    })
    
    const payments = paymentsResponse.data
    let startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    
    if (payments && payments.length > 0) {
      const lastPayment = payments[0]
      startDate = new Date(lastPayment.paymentDate)
      startDate.setHours(0, 0, 0, 0)
    }
    
    reportForm.value = {
      studentId: row.studentId._id,
      studentName: row.studentName,
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      remainingLessons: row.remainingLessons,
      paymentType: row.paymentType
    }
    reportDialogVisible.value = true
  } catch (error) {
    console.error('获取缴费记录失败', error)
    ElMessage.error('获取缴费记录失败')
  }
}

const handleGenerateReport = async () => {
  try {
    console.log('开始生成报告，学生ID:', reportForm.value.studentId)
    console.log('时间范围:', reportForm.value.startDate, '至', reportForm.value.endDate)
    
    const response = await request.get('/lesson-records', {
      params: {
        studentId: reportForm.value.studentId
      }
    })
    
    console.log('获取到的消课记录数量:', response.data.length)
    
    const startDate = new Date(reportForm.value.startDate)
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(reportForm.value.endDate)
    endDate.setHours(23, 59, 59, 999)
    
    const records = response.data.filter(record => {
      const recordDate = new Date(record.recordDate)
      recordDate.setHours(0, 0, 0, 0)
      return recordDate >= startDate && recordDate <= endDate
    })
    
    console.log('过滤后的消课记录数量:', records.length)
    
    const lessonDetails = []
    for (const record of records) {
      if (record.courseStartTime) {
        lessonDetails.push({
          date: record.recordDate,
          startTime: record.courseStartTime,
          courseName: '课程',
          status: record.isDeducted ? 'attended' : 'missed',
          isGiftLesson: record.isGiftLesson || false
        })
      } else {
        lessonDetails.push({
          date: record.recordDate,
          startTime: record.recordDate,
          courseName: '未分配',
          status: record.isDeducted ? 'attended' : 'missed',
          isGiftLesson: record.isGiftLesson || false
        })
      }
    }
    
    console.log('课程明细数量:', lessonDetails.length)
    
    reportData.value = {
      totalLessons: records.length,
      attendedLessons: records.filter(r => r.isDeducted).length,
      missedLessons: records.filter(r => !r.isDeducted).length,
      lessonDetails: lessonDetails,
      remainingLessons: reportForm.value.remainingLessons,
      paymentType: reportForm.value.paymentType
    }
    
    reportImage.value = true
    
    reportImageDialogVisible.value = true
  } catch (error) {
    console.error('生成报告失败', error)
    ElMessage.error(`生成报告失败：${error.response?.data?.message || error.message || '未知错误'}`)
  }
}

const updateReportChart = (records) => {
  if (!reportChartInstance.value) {
    const chartDom = document.querySelector('#reportChart')
    if (chartDom) {
      reportChartInstance.value = echarts.init(chartDom)
    }
  }
  
  if (reportChartInstance.value) {
    const months = []
    const attendedData = []
    const missedData = []
    
    records.forEach(record => {
      const date = new Date(record.recordDate)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!months.includes(monthKey)) {
        months.push(monthKey)
        attendedData.push(0)
        missedData.push(0)
      }
      
      const index = months.indexOf(monthKey)
      if (record.isDeducted) {
        attendedData[index]++
      } else {
        missedData[index]++
      }
    })
    
    reportChartInstance.value.setOption({
      title: { text: '上课情况统计' },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['已上课', '缺席']
      },
      xAxis: {
        type: 'category',
        data: months
      },
      yAxis: {
        type: 'value',
        name: '课时数'
      },
      series: [
        {
          name: '已上课',
          type: 'bar',
          data: attendedData,
          itemStyle: { color: '#67c23a' }
        },
        {
          name: '缺席',
          type: 'bar',
          data: missedData,
          itemStyle: { color: '#f56c6c' }
        }
      ]
    })
  }
}

const handleDownloadReport = async () => {
  try {
    const container = document.querySelector('.report-container')
    if (!container) {
      ElMessage.error('找不到报告容器')
      return
    }
    
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    })
    
    reportImage.value = canvas.toDataURL('image/png')
    
    const link = document.createElement('a')
    link.download = `${reportForm.value.studentName}_上课情况报告.png`
    link.href = reportImage.value
    link.click()
    
    ElMessage.success('下载成功')
  } catch (error) {
    console.error('下载报告失败', error)
    ElMessage.error('下载报告失败')
  }
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN')
}

const formatTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

onMounted(() => {
  fetchBalances()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.report-container {
  padding: 20px;
  background: #F9F7F2;
  max-width: 600px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
}

.report-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 19px,
    rgba(0, 0, 0, 0.05) 20px
  );
  pointer-events: none;
  z-index: 0;
}

.logo-container {
  text-align: center;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.logo-image {
  max-width: 120px;
  height: auto;
  display: inline-block;
  filter: drop-shadow(0 2px 8px rgba(44, 62, 80, 0.1));
}

.report-title {
  text-align: center;
  margin-bottom: 15px;
  color: #2C3E50;
  font-size: 22px;
  font-weight: 500;
  position: relative;
  z-index: 1;
}

.report-subtitle {
  text-align: center;
  color: #5A6A7A;
  margin-bottom: 30px;
  font-size: 14px;
  position: relative;
  z-index: 1;
}

.report-summary {
  margin-bottom: 30px;
  padding: 25px;
  background: linear-gradient(135deg, #2C3E50 0%, #1A252F 100%);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(44, 62, 80, 0.15);
  position: relative;
  z-index: 1;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.summary-grid.single-item {
  grid-template-columns: 1fr;
  max-width: 300px;
  margin: 0 auto;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: rgba(249, 247, 242, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(249, 247, 242, 0.2);
}

.summary-icon {
  font-size: 28px;
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #B89B72 0%, #D4AF37 100%);
  color: #2C3E50;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(184, 155, 114, 0.3);
}

.summary-item-attended .summary-icon {
  background: linear-gradient(135deg, #5A7A6A 0%, #7A9A8A 100%);
}

.summary-item-remaining .summary-icon {
  background: linear-gradient(135deg, #B89B72 0%, #D4AF37 100%);
}

.summary-content {
  flex: 1;
}

.summary-label {
  font-size: 13px;
  color: #F9F7F2;
  margin-bottom: 8px;
  font-weight: 400;
  letter-spacing: 0.5px;
}

.summary-value {
  font-size: 36px;
  font-weight: 600;
  color: #F9F7F2;
  font-family: 'Georgia', 'Times New Roman', serif;
  line-height: 1;
}

.report-details {
  margin-bottom: 30px;
  position: relative;
  z-index: 1;
}

.report-details h4 {
  margin-bottom: 20px;
  color: #2C3E50;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.lesson-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lesson-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
  border-left: 4px solid #B89B72;
  transition: all 0.3s ease;
}

.lesson-item:hover {
  box-shadow: 0 4px 12px rgba(44, 62, 80, 0.12);
  transform: translateY(-2px);
}

.lesson-info {
  flex: 1;
}

.lesson-date-time {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lesson-date-text {
  font-size: 15px;
  color: #2C3E50;
  font-weight: 500;
}

.lesson-time {
  font-size: 13px;
  color: #5A6A7A;
  font-weight: 400;
}

.lesson-status {
  flex-shrink: 0;
}

.lesson-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #F9F7F2;
}

.lesson-tag-attended {
  background: linear-gradient(135deg, #5A7A6A 0%, #7A9A8A 100%);
}

.lesson-tag-absent {
  background: linear-gradient(135deg, #E57373 0%, #C62828 100%);
}

.lesson-tag-gift {
  background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
}

.piano-keys {
  display: flex;
  justify-content: center;
  gap: 2px;
  padding: 20px;
  background: rgba(44, 62, 80, 0.03);
  border-radius: 8px;
  margin-top: 20px;
  position: relative;
  z-index: 1;
}

.piano-key {
  flex: 1;
  height: 40px;
  border-radius: 0 0 4px 4px;
  transition: all 0.3s ease;
}

.white-key {
  background: linear-gradient(180deg, #FFFFFF 0%, #F5F5F5 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.black-key {
  background: linear-gradient(180deg, #2C3E50 0%, #1A252F 100%);
  height: 25px;
  margin-top: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.piano-key:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
</style>
