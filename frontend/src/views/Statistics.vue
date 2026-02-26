<template>
  <div class="statistics">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card>
          <template #header>
            <span>学生总数</span>
          </template>
          <div class="stat-value">{{ statistics.studentCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <template #header>
            <span>总收入</span>
          </template>
          <div class="stat-value">¥{{ statistics.totalRevenue }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <template #header>
            <span>总课程数</span>
          </template>
          <div class="stat-value">{{ statistics.totalCourses }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <template #header>
            <span>已售课时</span>
          </template>
          <div class="stat-value">{{ statistics.totalLessonsSold }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <template #header>
            <span>已消课时</span>
          </template>
          <div class="stat-value">{{ statistics.totalLessonsConsumed }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <template #header>
            <span>总上课数</span>
          </template>
          <div class="stat-value">{{ statistics.totalLessonsAttended }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <template #header>
            <span>预付费已消课时</span>
          </template>
          <div class="stat-value">{{ statistics.prepaidLessonsConsumed }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <template #header>
            <span>剩余课时</span>
          </template>
          <div class="stat-value">{{ statistics.totalRemainingLessons }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="6">
        <el-card>
          <template #header>
            <span>本月预收入</span>
          </template>
          <div class="stat-value revenue">¥{{ statistics.monthlyPrepaidRevenue }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <template #header>
            <span>本月实际收入</span>
          </template>
          <div class="stat-value actual-revenue">¥{{ statistics.monthlyActualRevenue }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <template #header>
            <span>本月消课</span>
          </template>
          <div class="stat-value">{{ statistics.monthlyLessonsConsumed }} 课时</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <template #header>
            <span>本月上课数</span>
          </template>
          <div class="stat-value">{{ statistics.monthlyLessonsAttended }} 节</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>收入统计</span>
          </template>
          <div ref="incomeChart" style="height: 400px"></div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>本月消课统计</span>
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

const fetchStatistics = async () => {
  try {
    const response = await request.get('/statistics')
    statistics.value = response.data
    
    updateIncomeChart()
    updateLessonChart()
  } catch (error) {
    console.error('获取统计数据失败', error)
  }
}

const updateIncomeChart = () => {
  if (!incomeChartInstance) return
  
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const prepaidRevenueData = Array(12).fill(0)
  const actualRevenueData = Array(12).fill(0)
  prepaidRevenueData[11] = statistics.value.monthlyPrepaidRevenue
  actualRevenueData[11] = statistics.value.monthlyActualRevenue
  
  incomeChartInstance.setOption({
    title: { text: '月度收入统计' },
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
      data: ['预收入', '实际收入']
    },
    xAxis: {
      type: 'category',
      data: months
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
      data: prepaidRevenueData,
      itemStyle: {
        color: '#409eff'
      }
    }, {
      name: '实际收入',
      type: 'bar',
      data: actualRevenueData,
      itemStyle: {
        color: '#67c23a'
      }
    }]
  })
}

const updateLessonChart = () => {
  if (!lessonChartInstance) return
  
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const lessonData = Array(12).fill(0)
  lessonData[11] = statistics.value.monthlyLessonsConsumed
  
  lessonChartInstance.setOption({
    title: { text: '月度消课统计' },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => `${params.value} 课时`
    },
    xAxis: {
      type: 'category',
      data: months
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value) => `${value} 课时`
      }
    },
    series: [{
      name: '消课',
      type: 'line',
      smooth: true,
      data: lessonData,
      itemStyle: {
        color: '#67c23a'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#67c23a' },
            { offset: 1, color: '#ffffff' }
          ]
        }
      }
    }]
  })
}

onMounted(() => {
  fetchStatistics()
  
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
.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
  text-align: center;
  padding: 20px 0;
}

.stat-value.revenue {
  color: #e6a23c;
}

.stat-value.actual-revenue {
  color: #67c23a;
}
</style>
