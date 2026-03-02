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
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card>
          <template #header>
            <span>本月预收入</span>
          </template>
          <div class="stat-value revenue">¥{{ statistics.monthlyPrepaidRevenue }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card>
          <template #header>
            <span>本月实际收入</span>
          </template>
          <div class="stat-value actual-revenue">¥{{ statistics.monthlyActualRevenue }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card>
          <template #header>
            <span>本月消课</span>
          </template>
          <div class="stat-value">{{ statistics.monthlyLessonsConsumed }} 课时</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card>
          <template #header>
            <span>本月上课数</span>
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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'

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
const selectedYear = ref(new Date().getFullYear().toString())
const chartData = ref({
  labels: [],
  prepaidRevenue: [],
  actualRevenue: [],
  lessonsConsumed: [],
  lessonsAttended: []
})

const fetchStatistics = async () => {
  try {
    const params = {}
    if (userStore.isAdmin() && selectedTeacherId.value) {
      params.teacherId = selectedTeacherId.value
    }
    const response = await request.get('/statistics', { params })
    statistics.value = response.data
    
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
      }
    }, {
      name: '实际收入',
      type: 'bar',
      data: data.actualRevenue,
      itemStyle: {
        color: '#67c23a'
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
      }
    }, {
      name: '上课数',
      type: 'line',
      smooth: true,
      data: data.lessonsAttended,
      itemStyle: {
        color: '#67c23a'
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
</style>
