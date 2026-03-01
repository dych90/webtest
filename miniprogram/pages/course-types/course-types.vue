<template>
  <view class="course-types-container">
    <view v-if="courseTypes.length === 0" class="empty-tip">
      暂无课程类型
    </view>
    
    <view v-else class="type-list">
      <view v-for="type in courseTypes" :key="type._id" class="type-item">
        <view class="type-header">
          <text class="type-name">{{ type.name }}</text>
          <text class="type-duration">{{ type.duration }}分钟</text>
        </view>
        <view class="type-actions">
          <button class="btn-edit" @click="handleEdit(type)">编辑</button>
          <button class="btn-delete" @click="handleDelete(type)">删除</button>
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
            <text class="form-label">名称 *</text>
            <input class="form-input" v-model="form.name" placeholder="请输入课程类型名称" />
          </view>
          <view class="form-item">
            <text class="form-label">时长（分钟）*</text>
            <input class="form-input" v-model="form.duration" type="number" placeholder="请输入课程时长" />
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

const courseTypes = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加课程类型')
const editingId = ref('')

const form = reactive({
  name: '',
  duration: 45
})

const fetchCourseTypes = async () => {
  try {
    const res = await get('/course-types')
    courseTypes.value = res.data || []
  } catch (error) {
    console.error('获取课程类型失败', error)
  }
}

const handleAdd = () => {
  dialogTitle.value = '添加课程类型'
  editingId.value = ''
  form.name = ''
  form.duration = 45
  dialogVisible.value = true
}

const handleEdit = (type) => {
  dialogTitle.value = '编辑课程类型'
  editingId.value = type._id
  form.name = type.name
  form.duration = type.duration
  dialogVisible.value = true
}

const handleDelete = (type) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除课程类型"${type.name}"吗？`,
    confirmColor: '#F56C6C',
    success: async (res) => {
      if (res.confirm) {
        try {
          await del(`/course-types/${type._id}`)
          uni.showToast({ title: '删除成功', icon: 'success' })
          fetchCourseTypes()
        } catch (error) {
          uni.showToast({ title: error.message || '删除失败', icon: 'none' })
        }
      }
    }
  })
}

const handleSave = async () => {
  if (!form.name) {
    uni.showToast({ title: '请输入课程类型名称', icon: 'none' })
    return
  }
  if (!form.duration || form.duration <= 0) {
    uni.showToast({ title: '请输入有效的课程时长', icon: 'none' })
    return
  }
  
  try {
    const submitData = {
      name: form.name,
      duration: Number(form.duration)
    }
    
    if (editingId.value) {
      await put(`/course-types/${editingId.value}`, submitData)
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await post('/course-types', submitData)
      uni.showToast({ title: '添加成功', icon: 'success' })
    }
    
    dialogVisible.value = false
    fetchCourseTypes()
  } catch (error) {
    uni.showToast({ title: error.message || '操作失败', icon: 'none' })
  }
}

onMounted(() => {
  fetchCourseTypes()
})

onShow(() => {
  fetchCourseTypes()
})
</script>

<style scoped>
.course-types-container {
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

.type-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.type-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.type-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.type-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.type-duration {
  font-size: 26rpx;
  color: #409EFF;
  background-color: #ecf5ff;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.type-actions {
  display: flex;
  gap: 16rpx;
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
