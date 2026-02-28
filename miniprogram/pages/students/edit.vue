<template>
  <view class="edit-container">
    <view class="form-section">
      <view class="form-item">
        <text class="form-label">学生姓名 *</text>
        <input class="form-input" v-model="form.name" placeholder="请输入学生姓名" />
      </view>
      
      <view class="form-item">
        <text class="form-label">性别</text>
        <picker :value="genderIndex" :range="genders" @change="onGenderChange">
          <view class="form-picker">
            <text>{{ genders[genderIndex] }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">年龄</text>
        <input class="form-input" v-model="form.age" type="number" placeholder="请输入年龄" />
      </view>
      
      <view class="form-item">
        <text class="form-label">联系电话</text>
        <input class="form-input" v-model="form.phone" placeholder="请输入联系电话" type="tel" />
      </view>
      
      <view class="form-item">
        <text class="form-label">默认课程类型</text>
        <picker :value="courseTypeIndex" :range="courseTypes" range-key="name" @change="onCourseTypeChange">
          <view class="form-picker">
            <text>{{ courseTypes[courseTypeIndex]?.name || '请选择课程类型' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">付费方式 *</text>
        <picker :value="paymentTypeIndex" :range="paymentTypes" @change="onPaymentTypeChange">
          <view class="form-picker">
            <text>{{ paymentTypes[paymentTypeIndex] }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">陪练老师</text>
        <input class="form-input" v-model="form.practiceTeacher" placeholder="请输入陪练老师姓名" />
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

const genders = ['未设置', '男', '女']
const genderIndex = ref(0)
const paymentTypes = ['预付费', '单次付费']
const paymentTypeIndex = ref(0)
const courseTypes = ref([{ name: '请选择课程类型', _id: '' }])
const courseTypeIndex = ref(0)
const loading = ref(false)
const studentId = ref('')

const form = reactive({
  name: '',
  gender: '',
  age: '',
  phone: '',
  defaultCourseTypeId: '',
  paymentType: 'prepaid',
  practiceTeacher: '',
  notes: ''
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  studentId.value = currentPage.options?.id || ''
  if (studentId.value) {
    fetchStudent()
    fetchCourseTypes()
  }
})

const fetchStudent = async () => {
  try {
    const res = await get(`/students/${studentId.value}`)
    const data = res.data || {}
    form.name = data.name || ''
    form.gender = data.gender || ''
    form.age = data.age || ''
    form.phone = data.phone || ''
    form.defaultCourseTypeId = data.defaultCourseTypeId?._id || data.defaultCourseTypeId || ''
    form.paymentType = data.paymentType || 'prepaid'
    form.practiceTeacher = data.practiceTeacher || ''
    form.notes = data.notes || ''
    
    genderIndex.value = data.gender === '男' ? 1 : (data.gender === '女' ? 2 : 0)
    paymentTypeIndex.value = data.paymentType === 'payPerLesson' ? 1 : 0
  } catch (error) {
    uni.showToast({ title: '获取学生信息失败', icon: 'none' })
  }
}

const fetchCourseTypes = async () => {
  try {
    const res = await get('/course-types')
    if (res.data && res.data.length > 0) {
      courseTypes.value = [{ name: '请选择课程类型', _id: '' }, ...res.data]
      
      const idx = courseTypes.value.findIndex(t => t._id === form.defaultCourseTypeId)
      courseTypeIndex.value = idx >= 0 ? idx : 0
    }
  } catch (error) {
    console.error('获取课程类型失败', error)
  }
}

const onGenderChange = (e) => {
  genderIndex.value = e.detail.value
  form.gender = e.detail.value === 0 ? '' : genders[e.detail.value]
}

const onCourseTypeChange = (e) => {
  courseTypeIndex.value = e.detail.value
  form.defaultCourseTypeId = courseTypes.value[e.detail.value]?._id || ''
}

const onPaymentTypeChange = (e) => {
  paymentTypeIndex.value = e.detail.value
  form.paymentType = e.detail.value === 0 ? 'prepaid' : 'payPerLesson'
}

const handleCancel = () => {
  uni.navigateBack()
}

const handleSubmit = async () => {
  if (!form.name) {
    uni.showToast({ title: '请输入学生姓名', icon: 'none' })
    return
  }
  
  loading.value = true
  
  const submitData = { ...form }
  if (!submitData.defaultCourseTypeId) {
    delete submitData.defaultCourseTypeId
  }
  if (submitData.age) {
    submitData.age = Number(submitData.age)
  }
  
  try {
    await put(`/students/${studentId.value}`, submitData)
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
