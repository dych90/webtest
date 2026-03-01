<template>
  <view class="fee-standards-container">
    <view v-if="feeStandards.length === 0" class="empty-tip">
      暂无收费标准
    </view>
    
    <view v-else class="standard-list">
      <view v-for="standard in feeStandards" :key="standard._id" class="standard-item">
        <view class="standard-header">
          <text class="student-name">{{ standard.studentId?.name || '未分配' }}</text>
          <text class="price">¥{{ standard.price }}</text>
        </view>
        <view class="standard-body">
          <view class="standard-info">
            <text class="info-label">课程类型：</text>
            <text class="info-value">{{ standard.courseTypeId?.name || '未设置' }}</text>
          </view>
          <view class="standard-info">
            <text class="info-label">生效日期：</text>
            <text class="info-value">{{ formatDate(standard.effectiveDate) }}</text>
          </view>
          <view class="standard-info">
            <text class="info-label">失效日期：</text>
            <text class="info-value">{{ standard.expireDate ? formatDate(standard.expireDate) : '永久' }}</text>
          </view>
        </view>
        <view class="standard-actions">
          <button class="btn-edit" @click="handleEdit(standard)">编辑</button>
          <button class="btn-delete" @click="handleDelete(standard)">删除</button>
        </view>
      </view>
    </view>
    
    <view class="add-btn" @click="handleAdd">
      <text>+</text>
    </view>
    
    <view class="dialog-mask" v-if="dialogVisible" @click="dialogVisible = false">
      <view class="dialog-content" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">{{ dialogTitle }}</text>
          <text class="dialog-close" @click="dialogVisible = false">×</text>
        </view>
        <view class="dialog-body">
          <view class="form-item">
            <text class="form-label">学生 *</text>
            <picker :value="studentIndex" :range="students" range-key="name" @change="onStudentChange">
              <view class="form-picker">
                <text>{{ students[studentIndex]?.name || '请选择学生' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">课程类型 *</text>
            <picker :value="courseTypeIndex" :range="courseTypes" range-key="name" @change="onCourseTypeChange">
              <view class="form-picker">
                <text>{{ courseTypes[courseTypeIndex]?.name || '请选择课程类型' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">单价 *</text>
            <input class="form-input" v-model="form.price" type="digit" placeholder="请输入单价" />
          </view>
          <view class="form-item">
            <text class="form-label">生效日期 *</text>
            <picker mode="date" :value="form.effectiveDate" @change="onEffectiveDateChange">
              <view class="form-picker">
                <text>{{ form.effectiveDate || '请选择日期' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">失效日期</text>
            <picker mode="date" :value="form.expireDate" @change="onExpireDateChange">
              <view class="form-picker">
                <text>{{ form.expireDate || '永久有效' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
        </view>
        <view class="dialog-footer">
          <button class="btn-cancel" @click="dialogVisible = false">取消</button>
          <button class="btn-save" @click="handleSave">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, post, put, del } from '@/utils/request'

const feeStandards = ref([])
const students = ref([])
const courseTypes = ref([])
const studentIndex = ref(-1)
const courseTypeIndex = ref(-1)
const dialogVisible = ref(false)
const dialogTitle = ref('添加收费标准')
const editingId = ref('')

const form = reactive({
  studentId: '',
  courseTypeId: '',
  price: '',
  effectiveDate: '',
  expireDate: ''
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const fetchFeeStandards = async () => {
  try {
    const res = await get('/fee-standards')
    feeStandards.value = res.data || []
  } catch (error) {
    console.error('获取收费标准失败', error)
  }
}

const fetchStudents = async () => {
  try {
    const res = await get('/students')
    students.value = res.data || []
  } catch (error) {
    console.error('获取学生列表失败', error)
  }
}

const fetchCourseTypes = async () => {
  try {
    const res = await get('/course-types')
    courseTypes.value = res.data || []
  } catch (error) {
    console.error('获取课程类型失败', error)
  }
}

const handleAdd = () => {
  dialogTitle.value = '添加收费标准'
  editingId.value = ''
  form.studentId = ''
  form.courseTypeId = ''
  form.price = ''
  const today = new Date()
  form.effectiveDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  form.expireDate = ''
  studentIndex.value = -1
  courseTypeIndex.value = -1
  dialogVisible.value = true
}

const handleEdit = (standard) => {
  dialogTitle.value = '编辑收费标准'
  editingId.value = standard._id
  form.studentId = standard.studentId?._id || standard.studentId || ''
  form.courseTypeId = standard.courseTypeId?._id || standard.courseTypeId || ''
  form.price = String(standard.price)
  form.effectiveDate = standard.effectiveDate ? formatDate(standard.effectiveDate) : ''
  form.expireDate = standard.expireDate ? formatDate(standard.expireDate) : ''
  
  studentIndex.value = students.value.findIndex(s => s._id === form.studentId)
  courseTypeIndex.value = courseTypes.value.findIndex(t => t._id === form.courseTypeId)
  
  dialogVisible.value = true
}

const handleDelete = (standard) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条收费标准吗？',
    confirmColor: '#F56C6C',
    success: async (res) => {
      if (res.confirm) {
        try {
          await del(`/fee-standards/${standard._id}`)
          uni.showToast({ title: '删除成功', icon: 'success' })
          fetchFeeStandards()
        } catch (error) {
          uni.showToast({ title: error.message || '删除失败', icon: 'none' })
        }
      }
    }
  })
}

const onStudentChange = (e) => {
  studentIndex.value = e.detail.value
  form.studentId = students.value[e.detail.value]?._id || ''
}

const onCourseTypeChange = (e) => {
  courseTypeIndex.value = e.detail.value
  form.courseTypeId = courseTypes.value[e.detail.value]?._id || ''
}

const onEffectiveDateChange = (e) => {
  form.effectiveDate = e.detail.value
}

const onExpireDateChange = (e) => {
  form.expireDate = e.detail.value
}

const handleSave = async () => {
  if (!form.studentId) {
    uni.showToast({ title: '请选择学生', icon: 'none' })
    return
  }
  if (!form.courseTypeId) {
    uni.showToast({ title: '请选择课程类型', icon: 'none' })
    return
  }
  if (!form.price || form.price <= 0) {
    uni.showToast({ title: '请输入有效的单价', icon: 'none' })
    return
  }
  
  try {
    const submitData = {
      studentId: form.studentId,
      courseTypeId: form.courseTypeId,
      price: Number(form.price),
      effectiveDate: form.effectiveDate,
      expireDate: form.expireDate || undefined
    }
    
    if (editingId.value) {
      await put(`/fee-standards/${editingId.value}`, submitData)
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await post('/fee-standards', submitData)
      uni.showToast({ title: '添加成功', icon: 'success' })
    }
    
    dialogVisible.value = false
    fetchFeeStandards()
  } catch (error) {
    uni.showToast({ title: error.message || '操作失败', icon: 'none' })
  }
}

onMounted(() => {
  fetchFeeStandards()
  fetchStudents()
  fetchCourseTypes()
})

onShow(() => {
  fetchFeeStandards()
})
</script>

<style scoped>
.fee-standards-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
  padding-bottom: 140rpx;
}

.empty-tip {
  text-align: center;
  padding: 100rpx 0;
  color: #909399;
  font-size: 28rpx;
}

.standard-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.standard-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.standard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.student-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.price {
  font-size: 36rpx;
  font-weight: bold;
  color: #F56C6C;
}

.standard-body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.standard-info {
  display: flex;
  font-size: 26rpx;
}

.info-label {
  color: #909399;
}

.info-value {
  color: #333;
}

.standard-actions {
  display: flex;
  gap: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.btn-edit {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  background-color: #409EFF;
  color: #fff;
  font-size: 24rpx;
  border: none;
  border-radius: 8rpx;
}

.btn-delete {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  background-color: #fff;
  color: #F56C6C;
  font-size: 24rpx;
  border: 2rpx solid #F56C6C;
  border-radius: 8rpx;
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

.dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.dialog-content {
  width: 90%;
  max-width: 600rpx;
  max-height: 80vh;
  background-color: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.dialog-close {
  font-size: 40rpx;
  color: #909399;
}

.dialog-body {
  padding: 30rpx;
  max-height: 60vh;
  overflow-y: auto;
}

.form-item {
  margin-bottom: 24rpx;
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

.dialog-footer {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx 30rpx;
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

.btn-save {
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
