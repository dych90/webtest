<template>
  <view class="edit-container">
    <view class="form-section">
      <view class="form-item">
        <text class="form-label">学生</text>
        <view class="search-picker-container">
          <input 
            class="search-input" 
            placeholder="搜索学生姓名" 
            v-model="studentSearchKeyword"
            @input="filterStudents"
          />
          <picker :value="studentIndex" :range="filteredStudents" range-key="name" @change="onStudentChange">
            <view class="form-picker">
              <text>{{ filteredStudents[studentIndex]?.name || '请选择学生' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>
      
      <view class="form-item">
        <text class="form-label">课程</text>
        <picker :value="courseIndex" :range="courseOptions" @change="onCourseChange">
          <view class="form-picker">
            <text>{{ courseOptions[courseIndex] || '请选择课程' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">课程类型</text>
        <picker :value="courseTypeIndex" :range="courseTypeOptions" @change="onCourseTypeChange">
          <view class="form-picker">
            <text>{{ courseTypeOptions[courseTypeIndex] || '请选择课程类型' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">上课日期</text>
        <picker mode="date" :value="form.courseDate" @change="onDateChange">
          <view class="form-picker">
            <text>{{ form.courseDate || '请选择日期' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">上课时间</text>
        <picker mode="time" :value="form.courseTime" start="08:00" end="23:00" @change="onTimeChange">
          <view class="form-picker">
            <text>{{ form.courseTime || '请选择时间' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">消课数量 *</text>
        <picker :value="lessonCountIndex" :range="lessonCountOptions" @change="onLessonChange">
          <view class="form-picker">
            <text>{{ lessonCountOptions[lessonCountIndex] }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">上课曲目</text>
        <textarea class="form-textarea" v-model="form.lessonContent" placeholder="请输入上课曲目" />
      </view>

      <view class="form-item">
        <view class="form-label-row">
          <text class="form-label">课堂照片</text>
          <text class="form-hint">{{ totalPhotoCount }}/6</text>
        </view>
        <view class="photo-grid">
          <view class="photo-item" v-for="(media, imageIndex) in savedImages" :key="media.id">
            <image class="photo-preview" :src="mediaCache[media.id]" mode="aspectFill" @click="previewPhoto(imageIndex)"></image>
            <text class="photo-remove" @click.stop="removeSavedMedia(media.id)">×</text>
          </view>
          <view class="photo-item" v-for="(photo, photoIndex) in newPhotoFiles" :key="photo.tempFilePath || photo.path">
            <image class="photo-preview" :src="photo.tempFilePath || photo.path" mode="aspectFill" @click="previewPhoto(savedImages.length + photoIndex)"></image>
            <text class="photo-remove" @click.stop="removeNewPhoto(photoIndex)">×</text>
          </view>
          <view v-if="totalPhotoCount < 6" class="photo-add" @click="choosePhotos">
            <text class="photo-add-icon">+</text>
            <text class="photo-add-text">添加</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <view class="form-label-row">
          <text class="form-label">语音记录</text>
          <text class="form-hint">{{ totalVoiceCount }}/6</text>
        </view>
        <view class="voice-box">
          <view
            v-for="media in savedAudios"
            :key="media.id"
            class="voice-result"
          >
            <text class="voice-info" @click="playVoice(mediaCache[media.id])">播放已保存语音 {{ formatDuration(media.duration || 0) }}</text>
            <text class="voice-remove" @click="removeSavedMedia(media.id)">删除</text>
          </view>
          <button v-if="!recording" class="voice-btn" @click="startRecord">
            {{ newVoiceFiles.length ? '继续录音' : '开始录音' }}
          </button>
          <button v-else class="voice-btn recording" @click="stopRecord">
            停止录音 {{ formatDuration(recordDuration) }}
          </button>
          <view v-for="(voice, voiceIndex) in newVoiceFiles" :key="voice.tempFilePath" class="voice-result">
            <text class="voice-info" @click="playVoice(voice.tempFilePath)">播放新录音{{ voiceIndex + 1 }} {{ formatDuration(voice.duration || 0) }}</text>
            <text class="voice-remove" @click="removeNewVoice(voiceIndex)">删除</text>
          </view>
        </view>
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
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { get, put, uploadFile, uploadFileData, downloadFile } from '@/utils/request'

const students = ref([])
const filteredStudents = ref([])
const studentSearchKeyword = ref('')
const studentIndex = ref(-1)
const courses = ref([])
const courseIndex = ref(-1)
const courseTypes = ref([])
const courseTypeIndex = ref(-1)
const loading = ref(false)
const recordId = ref('')
const lessonCountIndex = ref(1)
const lessonCountOptions = ['0.5节', '1节', '1.5节', '2节', '2.5节', '3节', '3.5节', '4节', '4.5节', '5节']
const lessonCountValues = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
const savedMediaItems = ref([])
const mediaCache = ref({})
const newPhotoFiles = ref([])
const newVoiceFiles = ref([])
const recording = ref(false)
const recordDuration = ref(0)
let recorderManager = null
let recordTimer = null

const form = reactive({
  studentId: '',
  courseId: '',
  courseTypeId: '',
  courseDate: '',
  courseTime: '',
  lessonsConsumed: '',
  lessonContent: '',
  isDeducted: true,
  notes: ''
})

const courseTypeOptions = computed(() => {
  return courseTypes.value.map(c => c.name)
})

const savedImages = computed(() => {
  return savedMediaItems.value.filter(item => item.type === 'image')
})

const savedAudios = computed(() => {
  return savedMediaItems.value.filter(item => item.type === 'audio')
})

const totalPhotoCount = computed(() => {
  return savedImages.value.length + newPhotoFiles.value.length
})

const totalVoiceCount = computed(() => {
  return savedAudios.value.length + newVoiceFiles.value.length
})

const courseOptions = computed(() => {
  const filtered = courses.value.filter(c => {
    const courseStudentId = c.studentId?._id || c.studentId
    return courseStudentId === form.studentId
  })
  return filtered.map(c => {
    const date = c.startTime ? new Date(c.startTime) : null
    const timeStr = date ? `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '未设置'
    return `${c.courseTypeId?.name || '未设置'} - ${timeStr}`
  })
})

onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  recordId.value = currentPage.options?.id || ''
  if (recordId.value) {
    await fetchRecord()
    await Promise.all([
      fetchStudents(),
      fetchCourses(),
      fetchCourseTypes()
    ])
  }

  if (uni.getRecorderManager) {
    recorderManager = uni.getRecorderManager()
    recorderManager.onStop((res) => {
      recording.value = false
      clearRecordTimer()
      if (totalVoiceCount.value >= 6) return
      newVoiceFiles.value = [...newVoiceFiles.value, {
        tempFilePath: res.tempFilePath,
        duration: res.duration || recordDuration.value,
        size: res.fileSize || 0
      }]
    })
    recorderManager.onError((error) => {
      recording.value = false
      clearRecordTimer()
      uni.showToast({ title: error.errMsg || '录音失败', icon: 'none' })
    })
  }
})

onUnmounted(() => {
  clearRecordTimer()
})

const fetchRecord = async () => {
  try {
    const res = await get(`/lesson-records/${recordId.value}`)
    const data = res.data || {}
    form.studentId = data.studentId?._id || data.studentId || ''
    form.courseId = data.courseId?._id || data.courseId || ''
    form.courseTypeId = data.courseTypeId?._id || data.courseTypeId || ''
    form.lessonsConsumed = data.lessonsConsumed || 1
    form.lessonContent = data.lessonContent || ''
    form.isDeducted = data.isDeducted !== false
    form.notes = data.notes || ''
    savedMediaItems.value = data.mediaItems || []
    mediaCache.value = {}
    loadRecordMedia()
    
    if (data.courseStartTime) {
      const date = new Date(data.courseStartTime)
      form.courseDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      form.courseTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }
    
    const idx = lessonCountValues.indexOf(data.lessonsConsumed)
    lessonCountIndex.value = idx >= 0 ? idx : 1
  } catch (error) {
    uni.showToast({ title: '获取消课记录失败', icon: 'none' })
  }
}

const fetchStudents = async () => {
  try {
    const res = await get('/students')
    students.value = res.data || []
    filteredStudents.value = students.value
    
    const idx = filteredStudents.value.findIndex(s => s._id === form.studentId)
    studentIndex.value = idx >= 0 ? idx : -1
  } catch (error) {
    console.error('获取学生列表失败', error)
  }
}

const fetchCourses = async () => {
  try {
    const res = await get('/courses')
    courses.value = (res.data || []).filter(c => {
      const courseId = c._id || c
      return c.status === 'normal' || courseId === form.courseId
    })
    
    const idx = courses.value.findIndex(c => (c._id || c) === form.courseId)
    courseIndex.value = idx >= 0 ? idx : -1
  } catch (error) {
    console.error('获取课程列表失败', error)
  }
}

const fetchCourseTypes = async () => {
  try {
    const res = await get('/course-types')
    courseTypes.value = res.data || []
    
    const idx = courseTypes.value.findIndex(c => (c._id || c) === form.courseTypeId)
    courseTypeIndex.value = idx >= 0 ? idx : -1
  } catch (error) {
    console.error('获取课程类型列表失败', error)
  }
}

const filterStudents = () => {
  if (!studentSearchKeyword.value.trim()) {
    filteredStudents.value = students.value
  } else {
    const keyword = studentSearchKeyword.value.trim().toLowerCase()
    filteredStudents.value = students.value.filter(s => 
      s.name && s.name.toLowerCase().includes(keyword)
    )
  }
  studentIndex.value = -1
}

const onStudentChange = (e) => {
  studentIndex.value = e.detail.value
  form.studentId = filteredStudents.value[e.detail.value]?._id || ''
  courseIndex.value = -1
  form.courseId = ''
}

const onCourseChange = (e) => {
  courseIndex.value = e.detail.value
  const filteredCourses = courses.value.filter(c => {
    const courseStudentId = c.studentId?._id || c.studentId
    return courseStudentId === form.studentId
  })
  form.courseId = filteredCourses[e.detail.value]?._id || ''
}

const onCourseTypeChange = (e) => {
  courseTypeIndex.value = e.detail.value
  form.courseTypeId = courseTypes.value[e.detail.value]?._id || ''
}

const onDateChange = (e) => {
  form.courseDate = e.detail.value
}

const onTimeChange = (e) => {
  form.courseTime = e.detail.value
}

const onDeductedChange = (e) => {
  form.isDeducted = e.detail.value
}

const onLessonChange = (e) => {
  lessonCountIndex.value = e.detail.value
  form.lessonsConsumed = lessonCountValues[e.detail.value]
}

const clearRecordTimer = () => {
  if (recordTimer) {
    clearInterval(recordTimer)
    recordTimer = null
  }
}

const formatDuration = (duration = 0) => {
  const totalSeconds = Math.max(0, Math.round(duration / 1000))
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

const loadRecordMedia = async () => {
  const mediaItems = savedMediaItems.value.filter(item => item.id && item.url && !mediaCache.value[item.id])

  for (const media of mediaItems) {
    try {
      const tempFilePath = await downloadFile(media.url)
      mediaCache.value = {
        ...mediaCache.value,
        [media.id]: tempFilePath
      }
    } catch (error) {
      console.warn('课后记录媒体下载失败', media.id, error?.message || error)
    }
  }
}

const choosePhotos = async () => {
  const remainCount = 6 - totalPhotoCount.value
  if (remainCount <= 0) return

  try {
    const result = uni.chooseMedia ? await new Promise((resolve, reject) => {
      uni.chooseMedia({
        count: remainCount,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        success: resolve,
        fail: reject
      })
    }) : await new Promise((resolve, reject) => {
      uni.chooseImage({
        count: remainCount,
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        success: resolve,
        fail: reject
      })
    })

    const sourceFiles = result.tempFiles || (result.tempFilePaths || []).map(path => ({ path }))
    const files = sourceFiles.map(file => ({
      tempFilePath: file.tempFilePath || file.path,
      size: file.size || 0
    })).filter(file => file.tempFilePath)

    newPhotoFiles.value = [...newPhotoFiles.value, ...files].slice(0, 6 - savedImages.value.length)
  } catch (error) {
    if (error?.errMsg?.includes('cancel')) return
    uni.showToast({ title: '选择照片失败', icon: 'none' })
  }
}

const previewPhoto = (index) => {
  const savedUrls = savedImages.value
    .map(media => mediaCache.value[media.id])
    .filter(Boolean)
  const newUrls = newPhotoFiles.value
    .map(photo => photo.tempFilePath || photo.path)
    .filter(Boolean)
  const urls = [...savedUrls, ...newUrls]
  if (urls.length === 0) return

  uni.previewImage({
    urls,
    current: urls[Math.min(index, urls.length - 1)]
  })
}

const removeSavedMedia = (mediaId) => {
  savedMediaItems.value = savedMediaItems.value.filter(item => item.id !== mediaId)
}

const removeNewPhoto = (index) => {
  newPhotoFiles.value.splice(index, 1)
}

const startRecord = () => {
  if (!recorderManager) {
    uni.showToast({ title: '当前环境不支持录音', icon: 'none' })
    return
  }
  if (totalVoiceCount.value >= 6) {
    uni.showToast({ title: '最多保留6段语音', icon: 'none' })
    return
  }

  recordDuration.value = 0
  recording.value = true
  clearRecordTimer()
  recordTimer = setInterval(() => {
    recordDuration.value += 1000
  }, 1000)

  try {
    recorderManager.start({
      duration: 10 * 60 * 1000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3'
    })
  } catch (error) {
    recording.value = false
    clearRecordTimer()
    uni.showToast({ title: '录音启动失败', icon: 'none' })
  }
}

const stopRecord = () => {
  if (!recorderManager || !recording.value) return

  recorderManager.stop()
  clearRecordTimer()
}

const playVoice = (src) => {
  if (!src) return

  const audioContext = uni.createInnerAudioContext()
  audioContext.src = src
  audioContext.play()
  audioContext.onEnded(() => {
    audioContext.destroy()
  })
  audioContext.onError(() => {
    audioContext.destroy()
    uni.showToast({ title: '播放失败', icon: 'none' })
  })
}

const removeNewVoice = (index) => {
  newVoiceFiles.value.splice(index, 1)
}

const uploadEditMedia = async () => {
  const mediaItems = []

  for (const photo of newPhotoFiles.value) {
    try {
      const formData = {
        mediaType: 'image'
      }
      let result
      try {
        result = await uploadFile('/lesson-records/media', photo.tempFilePath, formData)
      } catch (uploadError) {
        console.warn('照片uploadFile失败，尝试base64降级上传:', uploadError?.message || uploadError)
        result = await uploadFileData('/lesson-records/media-data', photo.tempFilePath, formData)
      }
      if (result.data) {
        mediaItems.push(result.data)
      }
    } catch (error) {
      throw new Error(`照片上传失败：${error.message || '请检查网络'}`)
    }
  }

  for (const voiceFile of newVoiceFiles.value) {
    if (!voiceFile?.tempFilePath) continue

    try {
      const formData = {
        mediaType: 'audio',
        duration: voiceFile.duration || 0
      }
      let result
      try {
        result = await uploadFile('/lesson-records/media', voiceFile.tempFilePath, formData)
      } catch (uploadError) {
        console.warn('语音uploadFile失败，尝试base64降级上传:', uploadError?.message || uploadError)
        result = await uploadFileData('/lesson-records/media-data', voiceFile.tempFilePath, formData)
      }
      if (result.data) {
        mediaItems.push(result.data)
      }
    } catch (error) {
      throw new Error(`语音上传失败：${error.message || '请检查网络'}`)
    }
  }

  return mediaItems
}

const handleCancel = () => {
  uni.navigateBack()
}

const handleSubmit = async () => {
  const lessonsConsumed = lessonCountValues[lessonCountIndex.value]
  if (!lessonsConsumed || lessonsConsumed <= 0) {
    uni.showToast({ title: '请选择有效的消课数量', icon: 'none' })
    return
  }
  if (recording.value) {
    uni.showToast({ title: '请先停止录音', icon: 'none' })
    return
  }
  
  loading.value = true
  
  try {
    const newMediaItems = await uploadEditMedia()
    const submitData = {
      studentId: form.studentId,
      courseId: form.courseId || undefined,
      courseTypeId: form.courseTypeId || undefined,
      lessonsConsumed: lessonsConsumed,
      lessonContent: form.lessonContent,
      mediaItems: [...savedMediaItems.value, ...newMediaItems],
      isDeducted: form.isDeducted,
      notes: form.notes
    }

    if (form.courseDate && form.courseTime) {
      submitData.courseStartTime = new Date(`${form.courseDate}T${form.courseTime}:00`).toISOString()
    }

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

.form-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.form-label-row .form-label {
  margin-bottom: 0;
}

.form-hint {
  font-size: 24rpx;
  color: #909399;
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

.search-input {
  margin-bottom: 16rpx;
}

.search-picker-container {
  display: flex;
  flex-direction: column;
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

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
}

.photo-item,
.photo-add {
  position: relative;
  height: 140rpx;
  border-radius: 10rpx;
  overflow: hidden;
  background-color: #f5f7fa;
}

.photo-preview {
  width: 100%;
  height: 100%;
}

.photo-remove {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 34rpx;
  height: 34rpx;
  line-height: 34rpx;
  text-align: center;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 28rpx;
}

.photo-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #c0c4cc;
}

.photo-add-icon {
  font-size: 42rpx;
  line-height: 42rpx;
  color: #909399;
}

.photo-add-text {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #909399;
}

.voice-box {
  padding: 18rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
}

.voice-btn {
  height: 68rpx;
  line-height: 68rpx;
  margin: 0;
  padding: 0 24rpx;
  border-radius: 8rpx;
  background-color: #ecf5ff;
  color: #409EFF;
  font-size: 26rpx;
}

.voice-btn.recording {
  background-color: #fef0f0;
  color: #F56C6C;
}

.voice-result {
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.voice-result:last-child {
  margin-bottom: 0;
}

.voice-info {
  font-size: 26rpx;
  color: #409EFF;
}

.voice-remove {
  font-size: 24rpx;
  color: #F56C6C;
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
