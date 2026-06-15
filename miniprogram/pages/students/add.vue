<template>
  <view class="add-container">
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
        <text class="form-label">生日</text>
        <picker mode="date" :value="form.birthday" @change="onBirthdayChange">
          <view class="form-picker">
            <text>{{ form.birthday || '请选择生日' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">身份证号</text>
        <input class="form-input" v-model="form.idCard" placeholder="请输入身份证号" />
      </view>

      <view class="form-item">
        <text class="form-label">联系人姓名</text>
        <input class="form-input" v-model="form.parentName" placeholder="请输入联系人姓名" />
      </view>
      
      <view class="form-item">
        <text class="form-label">联系电话</text>
        <input class="form-input" v-model="form.phone" placeholder="请输入联系电话" type="tel" />
      </view>
      
      <view class="form-item">
        <text class="form-label">联系人电话</text>
        <input class="form-input" v-model="form.parentPhone" placeholder="请输入联系人电话" type="tel" />
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
      
      <view class="form-item" v-if="form.paymentType !== 'free'">
        <text class="form-label">课时单价</text>
        <view class="price-input-wrapper">
          <text class="price-unit">¥</text>
          <input class="form-input price-input" v-model="form.currentPrice" type="digit" placeholder="请输入单价" />
          <text class="price-unit">/课时</text>
        </view>
      </view>
      
      <view class="form-item">
        <text class="form-label">学琴起始日期</text>
        <picker mode="date" :value="form.pianoStartDate" @change="onPianoStartDateChange">
          <view class="form-picker">
            <text>{{ form.pianoStartDate || '请选择日期' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">学习进度</text>
        <textarea class="form-textarea" v-model="form.learningProgress" placeholder="请输入学习进度" />
      </view>
      
      <view class="form-item">
        <text class="form-label">学习计划</text>
        <textarea class="form-textarea" v-model="form.learningPlan" placeholder="请输入学习计划" />
      </view>
      
      <view class="form-item">
        <text class="form-label">系统内陪练老师</text>
        <picker :value="practiceTeacherIndex" :range="practiceTeacherOptions" @change="onPracticeTeacherChange">
          <view class="form-picker">
            <text>{{ practiceTeacherOptions[practiceTeacherIndex] }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="form-label">陪练老师姓名</text>
        <input class="form-input" v-model="form.practiceTeacher" placeholder="系统外陪练只填写姓名" />
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
import { computed, ref, reactive, onMounted } from 'vue'
import { get, post } from '@/utils/request'
import { PAYMENT_TYPE_OPTIONS, getPaymentTypeValue } from '@/utils/paymentType'

const genders = ['未设置', '男', '女']
const genderIndex = ref(0)
const paymentTypes = PAYMENT_TYPE_OPTIONS.map(item => item.label)
const paymentTypeIndex = ref(0)
const courseTypes = ref([{ name: '请选择课程类型', _id: '' }])
const courseTypeIndex = ref(0)
const teachers = ref([])
const practiceTeacherIndex = ref(0)
const loading = ref(false)
const practiceTeacherOptions = computed(() => ['不关联系统内老师', ...teachers.value.map(teacher => teacher.name || teacher.username || '未命名老师')])

const form = reactive({
  name: '',
  gender: '',
  birthday: '',
  idCard: '',
  parentName: '',
  phone: '',
  parentPhone: '',
  defaultCourseTypeId: '',
  paymentType: 'prepaid',
  currentPrice: '',
  pianoStartDate: '',
  learningProgress: '',
  learningPlan: '',
  practiceTeacher: '',
  practiceTeacherId: '',
  notes: ''
})

onMounted(() => {
  fetchCourseTypes()
  fetchTeachers()
})

const fetchCourseTypes = async () => {
  try {
    const res = await get('/course-types')
    if (res.data && res.data.length > 0) {
      courseTypes.value = [{ name: '请选择课程类型', _id: '' }, ...res.data]
      
      const defaultType = res.data.find(t => t.isDefault)
      if (defaultType && !form.defaultCourseTypeId) {
        const idx = courseTypes.value.findIndex(t => t._id === defaultType._id)
        if (idx >= 0) {
          courseTypeIndex.value = idx
          form.defaultCourseTypeId = defaultType._id
        }
      }
    }
  } catch (error) {
    console.error('获取课程类型失败', error)
  }
}

const onGenderChange = (e) => {
  genderIndex.value = e.detail.value
  form.gender = e.detail.value === 0 ? '' : genders[e.detail.value]
}

const onBirthdayChange = (e) => {
  form.birthday = e.detail.value
}

const onCourseTypeChange = (e) => {
  courseTypeIndex.value = e.detail.value
  form.defaultCourseTypeId = courseTypes.value[e.detail.value]?._id || ''
}

const onPaymentTypeChange = (e) => {
  const index = Number(e.detail.value)
  paymentTypeIndex.value = index
  form.paymentType = getPaymentTypeValue(index)
  if (form.paymentType === 'free') {
    form.currentPrice = ''
  }
}

const fetchTeachers = async () => {
  try {
    const res = await get('/teachers')
    teachers.value = res.data || []
  } catch (error) {
    console.error('获取老师列表失败', error)
  }
}

const onPianoStartDateChange = (e) => {
  form.pianoStartDate = e.detail.value
}

const onPracticeTeacherChange = (e) => {
  const index = Number(e.detail.value)
  practiceTeacherIndex.value = index

  if (index <= 0) {
    form.practiceTeacherId = ''
    return
  }

  const teacher = teachers.value[index - 1]
  form.practiceTeacherId = teacher?._id || ''
  form.practiceTeacher = teacher?.name || teacher?.username || form.practiceTeacher
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
  if (submitData.currentPrice) {
    submitData.currentPrice = Number(submitData.currentPrice)
  }
  if (submitData.birthday) {
    submitData.birthday = new Date(submitData.birthday)
  }
  if (submitData.pianoStartDate) {
    submitData.pianoStartDate = new Date(submitData.pianoStartDate)
  }
  
  try {
    await post('/students', submitData)
    uni.showToast({ title: '添加成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  } catch (error) {
    uni.showToast({ title: error.message || '添加失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.add-container {
  padding: 20rpx;
  background-color: #F7EFE3;
  min-height: 100vh;
}

.form-section {
  background-color: #FFFDF8;
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
  color: #3F352B;
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
  color: #8B8176;
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

.price-input-wrapper {
  display: flex;
  align-items: center;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  padding-right: 20rpx;
}

.price-input {
  border: none;
  flex: 1;
}

.price-unit {
  font-size: 28rpx;
  color: #8B8176;
  padding: 0 10rpx;
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
  background-color: #FFFDF8;
  color: #6F6254;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn-submit {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #5F724C;
  color: #FFFDF8;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
}
</style>
