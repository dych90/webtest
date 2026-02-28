<template>
  <view class="edit-container">
    <view class="form-section">
      <view class="form-item">
        <text class="form-label">学生</text>
        <picker :value="studentIndex" :range="students" range-key="name" @change="onStudentChange">
          <view class="form-picker">
            <text>{{ students[studentIndex]?.name || '请选择学生' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">消课数量 *</text>
        <input class="form-input" v-model="form.lessonsConsumed" type="number" placeholder="请输入消课数量" />
      </view>
      
      <view class="form-item">
        <text class="form-label">上课曲目</text>
        <textarea class="form-textarea" v-model="form.lessonContent" placeholder="请输入上课曲目" />
      </view>
      
      <view class="form-item switch-item">
        <text class="form-label">是否扣费</text>
        <switch :checked="form.isDeducted" @change="onDeductedChange" color="#409EFF" />
      </view>
      
      <view class="form-item">
        <text class="form-label">备注</text>
        <textarea class="form-textarea" v-model="form.notes" placeholder="请输入备注信息" />
      </view>
    </view>
    
    <view class="form-actions">
      <button class="btn-cancel" @click="handleCancel">取消</button>
      <button class="btn-submit" @click="handleSubmit" :loading="loading">保存</button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { get, put } from '@/utils/request'

const students = ref([])
const studentIndex = ref(-1)
const loading = ref(false)
const recordId = ref('')

const form = reactive({
  studentId: '',
  lessonsConsumed: '',
  lessonContent: '',
  isDeducted: true,
  notes: ''
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  recordId.value = currentPage.options?.id || ''
  if (recordId.value) {
    fetchRecord()
    fetchStudents()
  }
})

const fetchRecord = async () => {
  try {
    const res = await get(`/lesson-records/${recordId.value}`)
    const data = res.data || {}
    form.studentId = data.studentId?._id || data.studentId || ''
    form.lessonsConsumed = data.lessonsConsumed || ''
    form.lessonContent = data.lessonContent || ''
    form.isDeducted = data.isDeducted !== false
    form.notes = data.notes || ''
  } catch (error) {
    uni.showToast({ title: '获取消课记录失败', icon: 'none' })
  }
}

const fetchStudents = async () => {
  try {
    const res = await get('/students')
    students.value = res.data || []
    
    const idx = students.value.findIndex(s => s._id === form.studentId)
    studentIndex.value = idx >= 0 ? idx : -1
  } catch (error) {
    console.error('获取学生列表失败', error)
  }
}

const onStudentChange = (e) => {
  studentIndex.value = e.detail.value
  form.studentId = students.value[e.detail.value]?._id || ''
}

const onDeductedChange = (e) => {
  form.isDeducted = e.detail.value
}

const handleCancel = () => {
  uni.navigateBack()
}

const handleSubmit = async () => {
  if (!form.lessonsConsumed || form.lessonsConsumed <= 0) {
    uni.showToast({ title: '请输入有效的消课数量', icon: 'none' })
    return
  }
  
  loading.value = true
  
  const submitData = {
    studentId: form.studentId,
    lessonsConsumed: Number(form.lessonsConsumed),
    lessonContent: form.lessonContent,
    isDeducted: form.isDeducted,
    notes: form.notes
  }
  
  try {
    await put(`/lesson-records/${recordId.value}`, submitData)
    uni.showToast({ title: '更新成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  } catch (error) {
    uni.showToast({ title: error.message || '更新失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.edit-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.form-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 80rpx;
  padding: 0 20rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.picker-arrow {
  font-size: 20rpx;
  color: #909399;
}

.form-textarea {
  width: 100%;
  height: 160rpx;
  padding: 20rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.switch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.switch-item .form-label {
  margin-bottom: 0;
}

.form-actions {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 0;
}

.btn-cancel {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #fff;
  color: #606266;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-submit {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #409EFF;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}
</style>
