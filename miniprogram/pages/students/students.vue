<template>
  <view class="students-container">
    <view class="search-bar">
      <input 
        class="search-input" 
        v-model="searchText" 
        placeholder="搜索学生姓名"
        @input="handleSearch"
      />
    </view>
    
    <view v-if="filteredStudents.length === 0" class="empty-tip">
      暂无学生数据
    </view>
    
    <view v-else class="student-list">
      <view 
        v-for="student in filteredStudents" 
        :key="student._id" 
        class="student-item"
        @click="goToDetail(student)"
      >
        <view class="student-avatar">
          <text>{{ student.name.charAt(0) }}</text>
        </view>
        <view class="student-info">
          <view class="student-name-row">
            <text class="student-name">{{ student.name }}</text>
            <text 
              class="payment-tag" 
              :class="student.paymentType === 'prepaid' ? 'prepaid' : 'single'"
            >
              {{ student.paymentType === 'prepaid' ? '预付费' : '单次付费' }}
            </text>
          </view>
          <view class="student-detail">
            <text class="detail-item" v-if="student.phone">{{ student.phone }}</text>
            <text class="detail-item" v-if="student.defaultCourseTypeId?.name">
              {{ student.defaultCourseTypeId.name }}
            </text>
          </view>
        </view>
        <view class="student-arrow">
          <text>›</text>
        </view>
      </view>
    </view>
    
    <view class="add-btn" @click="handleAdd">
      <text>+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { get } from '@/utils/request'

const userStore = useUserStore()

const students = ref([])
const searchText = ref('')

const filteredStudents = computed(() => {
  if (!searchText.value) {
    return students.value
  }
  return students.value.filter(s => 
    s.name.toLowerCase().includes(searchText.value.toLowerCase())
  )
})

const fetchStudents = async () => {
  try {
    const res = await get('/students')
    students.value = res.data || []
  } catch (error) {
    console.error('获取学生列表失败', error)
  }
}

const handleSearch = () => {
  // 搜索已通过 computed 自动处理
}

const goToDetail = (student) => {
  uni.navigateTo({
    url: `/pages/students/detail?id=${student._id}`
  })
}

const handleAdd = () => {
  uni.navigateTo({
    url: '/pages/students/add'
  })
}

onMounted(() => {
  fetchStudents()
})
</script>

<style scoped>
.students-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.search-bar {
  margin-bottom: 20rpx;
}

.search-input {
  width: 100%;
  height: 80rpx;
  padding: 0 30rpx;
  background-color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.empty-tip {
  text-align: center;
  padding: 100rpx 0;
  color: #909399;
  font-size: 28rpx;
}

.student-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.student-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
}

.student-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.student-avatar text {
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
}

.student-info {
  flex: 1;
}

.student-name-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.student-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-right: 16rpx;
}

.payment-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.payment-tag.prepaid {
  background-color: #ecf5ff;
  color: #409EFF;
}

.payment-tag.single {
  background-color: #f0f9eb;
  color: #67C23A;
}

.student-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.detail-item {
  font-size: 24rpx;
  color: #909399;
}

.student-arrow {
  width: 40rpx;
  text-align: right;
}

.student-arrow text {
  font-size: 36rpx;
  color: #c0c4cc;
}

.add-btn {
  position: fixed;
  right: 40rpx;
  bottom: 120rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(64, 158, 255, 0.4);
}

.add-btn text {
  color: #fff;
  font-size: 48rpx;
  font-weight: 300;
}
</style>
