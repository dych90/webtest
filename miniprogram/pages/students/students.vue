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
    
    <view v-if="isSortMode" class="sort-tip">
      <text>拖动学生卡片调整顺序</text>
      <text class="sort-done" @click="finishSort">完成</text>
    </view>
    
    <view v-if="filteredStudents.length === 0" class="empty-tip">
      暂无学生数据
    </view>
    
    <view v-else class="student-list">
      <movable-area class="move-area">
        <movable-view
          v-for="(student, index) in filteredStudents" 
          :key="student._id"
          class="student-item-wrapper"
          :x="0"
          :y="positions[index] || 0"
          direction="vertical"
          :damping="40"
          :friction="10"
          :disabled="!isSortMode"
          @change="(e) => onMoveChange(e, index)"
          @touchend="onTouchEnd"
        >
          <view 
            class="student-item"
            :class="{ 'sort-active': isSortMode }"
            @click="!isSortMode && goToDetail(student)"
            @longpress="startSortMode"
          >
            <view v-if="isSortMode" class="drag-handle">
              <text>⋮⋮</text>
            </view>
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
                <text class="detail-item price" v-if="student.currentPrice">
                  ¥{{ student.currentPrice }}/课时
                </text>
                <text class="detail-item" v-if="student.defaultCourseTypeId?.name">
                  {{ student.defaultCourseTypeId.name }}
                </text>
                <text class="detail-item" v-if="student.phone">{{ student.phone }}</text>
              </view>
            </view>
            <view v-if="!isSortMode" class="student-arrow">
              <text>›</text>
            </view>
          </view>
        </movable-view>
      </movable-area>
    </view>
    
    <view class="add-btn" @click="handleAdd">
      <text>+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { get, post } from '@/utils/request'

const userStore = useUserStore()

const students = ref([])
const searchText = ref('')
const isSortMode = ref(false)
const positions = ref([])
const itemHeight = 120
const hasChanged = ref(false)

const filteredStudents = computed(() => {
  if (!searchText.value) {
    return students.value
  }
  return students.value.filter(s => 
    s.name.toLowerCase().includes(searchText.value.toLowerCase())
  )
})

watch(filteredStudents, () => {
  nextTick(() => {
    initPositions()
  })
}, { immediate: true })

const initPositions = () => {
  positions.value = filteredStudents.value.map((_, index) => index * itemHeight)
}

const fetchStudents = async () => {
  try {
    const res = await get('/students')
    students.value = res.data || []
    initPositions()
  } catch (error) {
    console.error('获取学生列表失败', error)
  }
}

const handleSearch = () => {
  isSortMode.value = false
}

const startSortMode = () => {
  if (searchText.value) return
  isSortMode.value = true
  hasChanged.value = false
  initPositions()
  uni.vibrateShort()
}

const finishSort = async () => {
  isSortMode.value = false
  
  if (hasChanged.value) {
    try {
      const studentIds = filteredStudents.value.map(s => s._id)
      await post('/students/sort', { studentIds })
      uni.showToast({ title: '排序已保存', icon: 'success' })
    } catch (error) {
      uni.showToast({ title: '保存排序失败', icon: 'none' })
    }
  }
  
  initPositions()
}

const onMoveChange = (e, index) => {
  if (!isSortMode.value) return
  
  const newY = e.detail.y
  const targetIndex = Math.round(newY / itemHeight)
  const clampedIndex = Math.max(0, Math.min(targetIndex, filteredStudents.value.length - 1))
  
  if (clampedIndex !== index) {
    hasChanged.value = true
    
    const newStudents = [...filteredStudents.value]
    const [movedItem] = newStudents.splice(index, 1)
    newStudents.splice(clampedIndex, 0, movedItem)
    
    if (!searchText.value) {
      students.value = newStudents
    }
    
    nextTick(() => {
      initPositions()
    })
  }
}

const onTouchEnd = () => {
  if (isSortMode.value) {
    nextTick(() => {
      initPositions()
    })
  }
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

onShow(() => {
  if (!isSortMode.value) {
    fetchStudents()
  }
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

.sort-tip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  background-color: #ecf5ff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.sort-tip text {
  font-size: 26rpx;
  color: #409EFF;
}

.sort-done {
  font-weight: bold;
}

.empty-tip {
  text-align: center;
  padding: 100rpx 0;
  color: #909399;
  font-size: 28rpx;
}

.student-list {
  position: relative;
}

.move-area {
  width: 100%;
  height: calc(100vh - 280rpx);
}

.student-item-wrapper {
  width: 100%;
  height: 120rpx;
  margin-bottom: 16rpx;
}

.student-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
  width: calc(100% - 48rpx);
  height: 72rpx;
}

.student-item.sort-active {
  background-color: #f0f9eb;
  border: 2rpx solid #67C23A;
}

.drag-handle {
  width: 40rpx;
  color: #c0c4cc;
  font-size: 28rpx;
  margin-right: 10rpx;
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

.detail-item.price {
  color: #E6A23C;
  font-weight: bold;
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
