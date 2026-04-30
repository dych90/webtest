<template>
  <div class="statistics">
    <div v-if="userStore.isAdmin()" style="margin-bottom: 20px;">
      <el-select
        v-model="selectedTeacherId"
        placeholder="筛选教师"
        clearable
        style="width: 200px;"
        @change="fetchStatistics"
      >
        <el-option
          v-for="teacher in teachers"
          :key="teacher._id"
          :label="teacher.name"
          :value="teacher._id"
        />
      </el-select>
    </div>
    
    <el-row :gutter="20">
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card>
          <template #header>
            <span>学生总数</span>
          </template>
          <div class="stat-value">{{ statistics.studentCount }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card>
          <template #header>
            <span>总收入</span>
          </template>
          <div class="stat-value">¥{{ statistics.totalRevenue }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card>
          <template #header>
            <span>总课程数</span>
          </template>
          <div class="stat-value">{{ statistics.totalCourses }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card>
          <template #header>
            <span>已售课时</span>
          </template>
          <div class="stat-value">{{ statistics.totalLessonsSold }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card>
          <template #header>
            <span>已消课时</span>
          </template>
          <div class="stat-value">{{ statistics.totalLessonsConsumed }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card>
          <template #header>
            <span>总上课数</span>
          </template>
          <div class="stat-value">{{ statistics.totalLessonsAttended }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card>
          <template #header>
            <span>预付费已消课时</span>
          </template>
          <div class="stat-value">{{ statistics.prepaidLessonsConsumed }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card>
          <template #header>
            <span>剩余课时</span>
          </template>
          <div class="stat-value">{{ statistics.totalRemainingLessons }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24" style="margin-bottom: 10px">
        <div class="month-selector">
          <span class="selector-label">月度统计</span>
          <div class="month-nav">
            <el-button circle size="small" @click="prevMonth">
              <el-icon><ArrowLeft /></el-icon>
            </el-button>
            <span class="month-text">{{ monthDisplayText }}</span>
            <el-button circle size="small" @click="nextMonth" :disabled="isCurrentMonth">
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card>
          <template #header>
            <span>{{ selectedMonthLabel }}预收入</span>
          </template>
          <div class="stat-value revenue">¥{{ statistics.monthlyPrepaidRevenue }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card>
          <template #header>
            <span>{{ selectedMonthLabel }}实际收入</span>
          </template>
          <div class="stat-value actual-revenue">¥{{ statistics.monthlyActualRevenue }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card>
          <template #header>
            <span>{{ selectedMonthLabel }}应上课时</span>
          </template>
          <div class="stat-value">{{ statistics.monthlyLessonsConsumed }} 课时</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card>
          <template #header>
            <span>{{ selectedMonthLabel }}上课数</span>
          </template>
          <div class="stat-value">{{ statistics.monthlyLessonsAttended }} 节</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <el-card>
          <template #header>
            <div class="chart-header">
              <span>收入统计</span>
              <div class="chart-controls">
                <el-radio-group v-model="chartType" size="small" @change="fetchChartStatistics">
                  <el-radio-button label="month">按月</el-radio-button>
                  <el-radio-button label="year">按年</el-radio-button>
                </el-radio-group>
                <el-date-picker
                  v-if="chartType === 'month'"
                  v-model="selectedYear"
                  type="year"
                  placeholder="选择年份"
                  size="small"
                  value-format="YYYY"
                  @change="fetchChartStatistics"
                />
              </div>
            </div>
          </template>
          <div ref="incomeChart" style="height: 400px"></div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <el-card>
          <template #header>
            <div class="chart-header">
              <span>消课统计</span>
            </div>
          </template>
          <div ref="lessonChart" style="height: 400px"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import * as echarts from 'echarts'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

const userStore = useUserStore()
const teachers = ref([])
const selectedTeacherId = ref('')
const statistics = ref({
  studentCount: 0,
  totalRevenue: 0,
  totalCourses: 0,
  totalLessonsSold: 0,
  totalLessonsConsumed: 0,
  totalLessonsAttended: 0,
  totalRemainingLessons: 0,
  prepaidLessonsConsumed: 0,
  monthlyPrepaidRevenue: 0,
  monthlyActualRevenue: 0,
  monthlyLessonsConsumed: 0,
  monthlyLessonsAttended: 0,
  paymentCount: 0,
  lessonRecordCount: 0
})

const incomeChart = ref(null)
const lessonChart = ref(null)
let incomeChartInstance = null
let lessonChartInstance = null

const chartType = ref('month')
const chartYear = ref(new Date().getFullYear().toString())

const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonthIndex = ref(now.getMonth())

const monthDisplayText = computed(() => {
  return `${selectedYear.value}年${selectedMonthIndex.value + 1}月`
})

const isCurrentMonth = computed(() => {
  const current = new Date()
  return selectedYear.value === current.getFullYear() && selectedMonthIndex.value === current.getMonth()
})

const selectedMonthLabel = computed(() => {
  if (isCurrentMonth.value) return '本月'
  return `${selectedMonthIndex.value + 1}月`
})

const prevMonth = () => {
  if (selectedMonthIndex.value === 0) {
    selectedYear.value--
    selectedMonthIndex.value = 11
  } else {
    selectedMonthIndex.value--
  }
  fetchStatistics()
}

const nextMonth = () => {
  if (isCurrentMonth.value) return
  
  if (selectedMonthIndex.value === 11) {
    selectedYear.value++
    selectedMonthIndex.value = 0
  } else {
    selectedMonthIndex.value++
  }
  fetchStatistics()
}

const chartData = ref({
  labels: [],
  prepaidRevenue: [],
  actualRevenue: [],
  lessonsConsumed: [],
  lessonsAttended: []
})

const fetchStatistics = async () => {
  try {
    const monthStr = `${selectedYear.value}-${String(selectedMonthIndex.value + 1).padStart(2, '0')}`
    const params = { month: monthStr }
    if (userStore.isAdmin() && selectedTeacherId.value) {
      params.teacherId = selectedTeacherId.value
    }
    console.log('获取统计数据，参数:', params)
    const response = await request.get('/statistics', { params })
    console.log('统计数据响应:', response)
    
    const data = response.data || response
    console.log('统计数据详情:', data)
    
    Object.assign(statistics.value, {
      studentCount: data.studentCount || 0,
      totalRevenue: data.totalRevenue || 0,
      totalCourses: data.totalCourses || 0,
      totalLessonsSold: data.totalLessonsSold || 0,
      totalLessonsConsumed: data.totalLessonsConsumed || 0,
      totalLessonsAttended: data.totalLessonsAttended || 0,
      totalRemainingLessons: data.totalRemainingLessons || 0,
      prepaidLessonsConsumed: data.prepaidLessonsConsumed || 0,
      monthlyPrepaidRevenue: data.monthlyPrepaidRevenue || 0,
      monthlyActualRevenue: data.monthlyActualRevenue || 0,
      monthlyLessonsConsumed: data.monthlyLessonsConsumed || 0,
      monthlyLessonsAttended: data.monthlyLessonsAttended || 0,
      paymentCount: data.paymentCount || 0,
      lessonRecordCount: data.lessonRecordCount || 0
    })
    
    console.log('更新后的统计数据:', statistics.value)
    
    await fetchChartStatistics()
  } catch (error) {
    console.error('获取统计数据失败', error)
  }
}

const fetchChartStatistics = async () => {
  try {
    const params = {
      type: chartType.value,
      year: selectedYear.value
    }
    if (userStore.isAdmin() && selectedTeacherId.value) {
      params.teacherId = selectedTeacherId.value
    }
    const response = await request.get('/statistics/chart', { params })
    chartData.value = response.data
    
    updateIncomeChart()
    updateLessonChart()
  } catch (error) {
    console.error('获取图表数据失败', error)
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

const updateIncomeChart = () => {
  if (!incomeChartInstance) return
  
  const data = chartData.value
  
  incomeChartInstance.setOption({
    title: { 
      text: chartType.value === 'month' ? `${selectedYear.value}年收入统计` : '近5年收入统计',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        let result = params[0].name + '<br/>'
        params.forEach(item => {
          result += `${item.marker}${item.seriesName}: ¥${item.value}<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['预收入', '实际收入'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.labels
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value) => `¥${value}`
      }
    },
    series: [{
      name: '预收入',
      type: 'bar',
      data: data.prepaidRevenue,
      itemStyle: {
        color: '#409eff'
      },
      label: {
        show: true,
        position: 'top',
        color: '#333',
        fontSize: 11,
        formatter: (params) => params.value > 0 ? params.value : ''
      }
    }, {
      name: '实际收入',
      type: 'bar',
      data: data.actualRevenue,
      itemStyle: {
        color: '#67c23a'
      },
      label: {
        show: true,
        position: function(params) {
          const prepaidVal = data.prepaidRevenue[params.dataIndex]
          const actualVal = params.value
          if (prepaidVal > 0 && actualVal > 0 && Math.abs(prepaidVal - actualVal) < prepaidVal * 0.3) {
            return actualVal > prepaidVal ? 'top' : 'insideBottom'
          }
          return 'top'
        },
        color: function(params) {
          const prepaidVal = data.prepaidRevenue[params.dataIndex]
          return (params.value > 0 && prepaidVal > 0 && Math.abs(prepaidVal - params.value) < prepaidVal * 0.3 && params.value <= prepaidVal) ? '#fff' : '#333'
        },
        fontSize: 11,
        formatter: (params) => params.value > 0 ? params.value : ''
      }
    }]
  })
}

const updateLessonChart = () => {
  if (!lessonChartInstance) return
  
  const data = chartData.value
  
  lessonChartInstance.setOption({
    title: { 
      text: chartType.value === 'month' ? `${selectedYear.value}年消课统计` : '近5年消课统计',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['消课数', '上课数'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.labels
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      name: '消课数',
      type: 'line',
      smooth: true,
      data: data.lessonsConsumed,
      itemStyle: {
        color: '#e6a23c'
      },
      label: {
        show: true,
        position: 'top',
        color: '#333',
        fontSize: 11,
        formatter: (params) => params.value > 0 ? params.value : ''
      }
    }, {
      name: '上课数',
      type: 'line',
      smooth: true,
      data: data.lessonsAttended,
      itemStyle: {
        color: '#67c23a'
      },
      label: {
        show: true,
        position: 'bottom',
        color: '#67c23a',
        fontSize: 11,
        formatter: (params) => params.value > 0 ? params.value : ''
      }
    }]
  })
}

onMounted(() => {
  fetchStatistics()
  fetchTeachers()
  
  setTimeout(() => {
    if (incomeChart.value) {
      incomeChartInstance = echarts.init(incomeChart.value)
      updateIncomeChart()
    }
    
    if (lessonChart.value) {
      lessonChartInstance = echarts.init(lessonChart.value)
      updateLessonChart()
    }
  }, 100)
  
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  if (incomeChartInstance) {
    incomeChartInstance.dispose()
    incomeChartInstance = null
  }
  
  if (lessonChartInstance) {
    lessonChartInstance.dispose()
    lessonChartInstance = null
  }
  
  window.removeEventListener('resize', handleResize)
})

const handleResize = () => {
  if (incomeChartInstance) {
    incomeChartInstance.resize()
  }
  
  if (lessonChartInstance) {
    lessonChartInstance.resize()
  }
}
</script>

<style scoped>
.statistics {
  padding: 20px;
}

@media (max-width: 768px) {
  .statistics {
    padding: 12px;
  }
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  text-align: center;
  padding: 12px 0;
}

@media (max-width: 768px) {
  .stat-value {
    font-size: 18px;
    padding: 8px 0;
  }
}

.stat-value.revenue {
  color: #e6a23c;
}

.stat-value.actual-revenue {
  color: #67c23a;
}

:deep(.el-card__header) {
  padding: 12px 16px;
}

@media (max-width: 768px) {
  :deep(.el-card__header) {
    padding: 10px 12px;
  }
}

:deep(.el-card__body) {
  padding: 12px;
}

@media (max-width: 768px) {
  :deep(.el-card__body) {
    padding: 8px;
  }
}

.el-col {
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .el-col {
    margin-bottom: 12px;
  }
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.chart-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.month-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background-color: #fff;
  border-radius: 8px;
}

.selector-label {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.month-text {
  font-size: 16px;
  font-weight: bold;
  color: #409eff;
  min-width: 100px;
  text-align: center;
}
</style>
