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
      <text>点击上下箭头调整顺序</text>
      <text class="sort-done" @click="finishSort">完成</text>
    </view>
    
    <view v-if="displayStudents.length === 0" class="empty-tip">
      暂无学生数据
    </view>
    
    <view v-else class="student-list">
      <view 
        v-for="(student, index) in displayStudents" 
        :key="student._id"
        class="student-item"
        :class="{ 'sort-active': isSortMode }"
        @click="!isSortMode && goToDetail(student)"
        @longpress="startSortMode"
      >
        <view v-if="isSortMode" class="sort-buttons">
          <view class="sort-btn sort-btn-top" :class="{ disabled: index === 0 }" @click.stop="moveToTop(index)">
            <text>⬆</text>
          </view>
          <view class="sort-btn" :class="{ disabled: index === 0 }" @click.stop="moveUp(index)">
            <text>↑</text>
          </view>
          <view class="sort-btn" :class="{ disabled: index === displayStudents.length - 1 }" @click.stop="moveDown(index)">
            <text>↓</text>
          </view>
          <view class="sort-btn sort-btn-bottom" :class="{ disabled: index === displayStudents.length - 1 }" @click.stop="moveToBottom(index)">
            <text>⬇</text>
          </view>
        </view>
        <view class="student-index">
          <text>{{ index + 1 }}</text>
        </view>
        <view class="student-avatar-wrap">
          <view class="student-avatar">
            <text>{{ student.name.charAt(0) }}</text>
          </view>
          <view
            v-if="student.rewardRanking?.crownType"
            class="crown-badge"
            :class="student.rewardRanking?.crownType"
          >
            <view class="crown-icon">
              <view class="crown-peak crown-peak-left"></view>
              <view class="crown-peak crown-peak-center"></view>
              <view class="crown-peak crown-peak-right"></view>
              <view class="crown-base"></view>
              <view class="crown-jewel crown-jewel-left"></view>
              <view class="crown-jewel crown-jewel-center"></view>
              <view class="crown-jewel crown-jewel-right"></view>
            </view>
          </view>
        </view>
        <view class="student-info">
          <view class="student-name-row">
            <text class="student-name">{{ student.name }}</text>
            <text v-if="student.rewardRanking?.rank" class="rank-tag">
              第{{ student.rewardRanking.rank }}名
            </text>
            <text 
              class="payment-tag" 
              :class="student.paymentType || 'prepaid'"
            >
              {{ getPaymentTypeText(student.paymentType) }}
            </text>
            <text v-if="student.studentRelationType === 'practice'" class="relation-tag practice">
              陪练
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
            <view class="detail-item growth" v-if="student.rewardRanking">
              <text class="growth-label">成长</text>
              <text class="growth-star-mark">★</text>
              <text class="growth-star-count">×{{ formatGrowthStarCount(student.rewardRanking) }}</text>
              <text class="growth-level">· {{ formatGrowthLevel(student.rewardRanking) }}</text>
            </view>
          </view>
        </view>
        <view v-if="!isSortMode" class="student-arrow">
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
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { get, post } from '@/utils/request'
import { getPaymentTypeText } from '@/utils/paymentType'
import { formatGrowthLevel, formatGrowthStarCount } from '@/utils/reward'

const userStore = useUserStore()

const students = ref([])
const searchText = ref('')
const isSortMode = ref(false)
const hasChanged = ref(false)
const sortList = ref([])

const displayStudents = computed(() => {
  if (isSortMode.value) {
    return sortList.value
  }
  if (searchText.value) {
    return students.value.filter(s => 
      s.name.toLowerCase().includes(searchText.value.toLowerCase())
    )
  }
  return students.value
})

const fetchStudents = async () => {
  try {
    const [studentRes, rankingRes] = await Promise.all([
      get('/students'),
      get('/reward-rankings', { limit: 200 })
    ])
    const rankingMap = new Map(
      (rankingRes.data?.items || []).map(item => [String(item.studentId), item])
    )
    const studentList = (studentRes.data || []).map(student => ({
      ...student,
      rewardRanking: rankingMap.get(String(student._id)) || null
    }))

    students.value = studentList.sort((a, b) => {
      const aRank = a.rewardRanking?.rank || Number.MAX_SAFE_INTEGER
      const bRank = b.rewardRanking?.rank || Number.MAX_SAFE_INTEGER
      if (aRank !== bRank) return aRank - bRank
      return (a.sortOrder || 0) - (b.sortOrder || 0)
    })
  } catch (error) {
    console.error('获取学生列表失败', error)
  }
}

const handleSearch = () => {
  isSortMode.value = false
}

const startSortMode = () => {
  if (searchText.value) return
  sortList.value = [...students.value]
  isSortMode.value = true
  hasChanged.value = false
  uni.vibrateShort()
}

const finishSort = async () => {
  isSortMode.value = false
  
  if (hasChanged.value) {
    try {
      const studentIds = sortList.value.map(s => s._id)
      await post('/students/sort', { studentIds })
      students.value = [...sortList.value]
      uni.showToast({ title: '排序已保存', icon: 'success' })
    } catch (error) {
      uni.showToast({ title: '保存排序失败', icon: 'none' })
    }
  }
  
  sortList.value = []
}

const moveUp = (index) => {
  if (index === 0) return
  hasChanged.value = true
  
  const newList = [...sortList.value]
  const temp = newList[index]
  newList[index] = newList[index - 1]
  newList[index - 1] = temp
  
  sortList.value = newList
}

const moveDown = (index) => {
  if (index === sortList.value.length - 1) return
  hasChanged.value = true
  
  const newList = [...sortList.value]
  const temp = newList[index]
  newList[index] = newList[index + 1]
  newList[index + 1] = temp
  
  sortList.value = newList
}

const moveToTop = (index) => {
  if (index === 0) return
  hasChanged.value = true
  
  const newList = [...sortList.value]
  const item = newList.splice(index, 1)[0]
  newList.unshift(item)
  
  sortList.value = newList
}

const moveToBottom = (index) => {
  if (index === sortList.value.length - 1) return
  hasChanged.value = true
  
  const newList = [...sortList.value]
  const item = newList.splice(index, 1)[0]
  newList.push(item)
  
  sortList.value = newList
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
  background-color: #F7EFE3;
  min-height: 100vh;
}

.search-bar {
  margin-bottom: 20rpx;
}

.search-input {
  width: 100%;
  height: 80rpx;
  padding: 0 30rpx;
  background-color: #FFFDF8;
  border-radius: 40rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.sort-tip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  background-color: #E7EFE3;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.sort-tip text {
  font-size: 26rpx;
  color: #5F724C;
}

.sort-done {
  font-weight: bold;
}

.empty-tip {
  text-align: center;
  padding: 100rpx 0;
  color: #8B8176;
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
  background-color: #FFFDF8;
  border-radius: 16rpx;
}

.student-item.sort-active {
  background-color: #EAF1E3;
  border: 2rpx solid #5F724C;
}

.sort-buttons {
  display: flex;
  flex-direction: column;
  margin-right: 12rpx;
  gap: 4rpx;
}

.sort-btn {
  width: 40rpx;
  height: 40rpx;
  background-color: #5F724C;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sort-btn text {
  color: #FFFDF8;
  font-size: 20rpx;
  font-weight: bold;
}

.sort-btn.disabled {
  background-color: #C4AA84;
}

.sort-btn-top text,
.sort-btn-bottom text {
  font-size: 18rpx;
}

.student-index {
  width: 48rpx;
  height: 48rpx;
  background-color: #FBF6EE;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.student-index text {
  font-size: 24rpx;
  color: #8B8176;
  font-weight: bold;
}

.student-avatar-wrap {
  position: relative;
  margin-right: 20rpx;
}

.student-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: #5F724C;
  display: flex;
  align-items: center;
  justify-content: center;
}

.student-avatar text {
  color: #FFFDF8;
  font-size: 32rpx;
  font-weight: bold;
}

.crown-badge {
  position: absolute;
  top: -18rpx;
  right: -14rpx;
  width: 46rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx 8rpx 12rpx 12rpx;
  border: 2rpx solid rgba(63, 53, 43, 0.18);
  box-shadow: 0 4rpx 10rpx rgba(63, 53, 43, 0.12);
  overflow: hidden;
}

.crown-badge.gold {
  background-color: #E2B84B;
  color: #FFF7D9;
}

.crown-badge.silver {
  background-color: #C7CDD3;
  color: #F7FAFC;
}

.crown-badge.bronze {
  background-color: #B8793E;
  color: #FFF0DD;
}

.crown-icon {
  position: relative;
  width: 28rpx;
  height: 22rpx;
}

.crown-peak,
.crown-base,
.crown-jewel {
  position: absolute;
}

.crown-peak {
  bottom: 6rpx;
  width: 0;
  height: 0;
  border-left: 5rpx solid transparent;
  border-right: 5rpx solid transparent;
  border-bottom: 11rpx solid currentColor;
}

.crown-peak-left {
  left: 1rpx;
  transform: rotate(-8deg);
}

.crown-peak-center {
  left: 9rpx;
  border-left-width: 6rpx;
  border-right-width: 6rpx;
  border-bottom-width: 14rpx;
}

.crown-peak-right {
  right: 1rpx;
  transform: rotate(8deg);
}

.crown-base {
  left: 2rpx;
  right: 2rpx;
  bottom: 0;
  height: 6rpx;
  border-radius: 4rpx;
  background-color: currentColor;
}

.crown-jewel {
  bottom: 10rpx;
  width: 3rpx;
  height: 3rpx;
  border-radius: 50%;
  background-color: #FFFDF8;
  opacity: 0.95;
}

.crown-jewel-left {
  left: 4rpx;
}

.crown-jewel-center {
  left: 12rpx;
}

.crown-jewel-right {
  right: 4rpx;
}

.student-info {
  flex: 1;
  min-width: 0;
}

.student-name-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.student-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #3F352B;
  margin-right: 16rpx;
}

.rank-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  background-color: #F5ECD9;
  color: #A26B39;
  margin-right: 8rpx;
}

.payment-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.payment-tag.prepaid {
  background-color: #E7EFE3;
  color: #5F724C;
}

.payment-tag.single,
.payment-tag.payPerLesson {
  background-color: #EAF1E3;
  color: #5F724C;
}

.payment-tag.free {
  background-color: #F3EBDD;
  color: #8B8176;
}

.relation-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  margin-left: 8rpx;
}

.relation-tag.practice {
  background-color: #F8E4DD;
  color: #A0523E;
}

.student-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.detail-item {
  font-size: 24rpx;
  color: #8B8176;
}

.detail-item.price {
  color: #A26B39;
  font-weight: bold;
}

.detail-item.growth {
  color: #5F724C;
  font-weight: bold;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4rpx;
}

.growth-label,
.growth-level {
  color: #5F724C;
}

.growth-star-mark {
  color: #D59A24;
  font-size: 26rpx;
  line-height: 1;
}

.growth-star-count {
  color: #5F724C;
}

.student-arrow {
  width: 40rpx;
  text-align: right;
}

.student-arrow text {
  font-size: 36rpx;
  color: #C4AA84;
}

.add-btn {
  position: fixed;
  right: 40rpx;
  bottom: 120rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: #5F724C;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(64, 158, 255, 0.4);
}

.add-btn text {
  color: #FFFDF8;
  font-size: 48rpx;
  font-weight: 300;
}
</style>
