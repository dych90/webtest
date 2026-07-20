<template>
  <view class="mall-container">
    <view class="tabs">
      <view class="tab-item" :class="{ active: activeTab === 'redeem' }" @click="switchTab('redeem')">兑换</view>
      <view class="tab-item" :class="{ active: activeTab === 'catalog' }" @click="switchTab('catalog')">商品</view>
      <view class="tab-item" :class="{ active: activeTab === 'records' }" @click="switchTab('records')">记录</view>
    </view>

    <view v-if="activeTab === 'redeem'">
      <view class="student-panel">
        <view class="student-picker-row">
          <text class="panel-label">兑换学生</text>
          <picker :value="studentIndex" :range="students" range-key="name" @change="onStudentChange">
            <view class="student-picker">
              <text>{{ selectedStudent?.name || '请选择学生' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="summary-grid" v-if="studentRewardState">
          <view class="summary-item">
            <text class="summary-value">{{ formatGrowthLevel(studentRewardState.growthOverview) }}</text>
            <text class="summary-label">成长等级</text>
          </view>
          <view class="summary-item">
            <text class="summary-value">{{ studentRewardState.pointBalance?.availablePoints || 0 }}</text>
            <text class="summary-label">可用积分</text>
          </view>
        </view>
      </view>

      <view v-if="loading" class="empty-tip">加载中...</view>
      <view v-else-if="rewardItems.length === 0" class="empty-tip">暂无可兑换礼物</view>

      <view v-else class="reward-list">
        <view v-for="item in rewardItems" :key="item.rewardCode" class="reward-item">
          <view class="reward-cover">
            <image v-if="item.coverImage" class="reward-image" :src="item.coverImage" mode="aspectFill"></image>
            <text v-else class="reward-placeholder">礼</text>
          </view>
          <view class="reward-info">
            <view class="reward-title-row">
              <text class="reward-name">{{ item.rewardName }}</text>
              <text class="reward-type" :class="item.rewardType">{{ item.rewardType === 'advanced' ? '高级' : '普通' }}</text>
            </view>
            <text v-if="item.description" class="reward-desc">{{ item.description }}</text>
            <view class="reward-meta">
              <text class="point-cost">{{ item.costPoints || 0 }}积分</text>
              <text class="gate-text">{{ getGateText(item) }}</text>
              <text class="stock-text">{{ getStockText(item) }}</text>
            </view>
            <view class="blocked-reasons" v-if="selectedStudentId && !item.canRedeem">
              <text v-for="reason in getBlockedReasons(item)" :key="reason" class="blocked-reason">{{ reason }}</text>
            </view>
          </view>
          <button
            class="redeem-btn"
            :class="{ disabled: !item.canRedeem }"
            :disabled="!selectedStudentId || !item.canRedeem || redeemingCode === item.rewardCode"
            :loading="redeemingCode === item.rewardCode"
            @click="confirmRedeem(item)"
          >
            兑换
          </button>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'catalog'">
      <view class="manage-header">
        <text class="manage-title">商品维护</text>
        <button class="add-catalog-btn" @click="openCatalogDialog()">新增</button>
      </view>

      <view v-if="catalogItems.length === 0" class="empty-tip">暂无商品</view>
      <view v-else class="catalog-list">
        <view v-for="item in catalogItems" :key="item._id" class="catalog-item">
          <view class="catalog-main">
            <view class="reward-title-row">
              <text class="reward-name">{{ item.rewardName }}</text>
              <text class="status-chip" :class="{ disabled: !item.enabled }">{{ item.enabled ? '上架' : '下架' }}</text>
            </view>
            <view class="reward-meta">
              <text class="point-cost">{{ item.costPoints || 0 }}积分</text>
              <text class="gate-text">{{ getGateText(item) }}</text>
              <text class="stock-text">{{ getStockText(item) }}</text>
            </view>
            <text v-if="item.actualCost !== undefined && item.actualCost !== null" class="cost-text">成本 ¥{{ item.actualCost }}</text>
          </view>
          <view class="catalog-actions">
            <button class="mini-btn" @click="openCatalogDialog(item)">编辑</button>
            <button class="mini-btn ghost" @click="toggleCatalogEnabled(item)">{{ item.enabled ? '下架' : '上架' }}</button>
          </view>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'records'">
      <view class="record-filter">
        <picker :value="redemptionStatusIndex" :range="redemptionStatusOptions" @change="onRedemptionStatusChange">
          <view class="student-picker">
            <text>{{ redemptionStatusOptions[redemptionStatusIndex] }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>

      <view v-if="redemptions.length === 0" class="empty-tip">暂无兑换记录</view>
      <view v-else class="redemption-list">
        <view v-for="item in redemptions" :key="item._id" class="redemption-item">
          <view class="catalog-main">
            <view class="reward-title-row">
              <text class="reward-name">{{ item.rewardSnapshot?.rewardName || item.rewardCode }}</text>
              <text class="status-chip" :class="item.status">{{ getStatusText(item.status) }}</text>
            </view>
            <text class="reward-desc">{{ item.studentName || '未知学生' }} · {{ item.costPoints || 0 }}积分</text>
            <text class="reward-desc">{{ formatDateTime(item.requestedAt || item.createdAt) }}</text>
          </view>
          <view class="catalog-actions">
            <button v-if="item.status === 'pending'" class="mini-btn" @click="handleRedemptionAction(item, 'approve')">通过</button>
            <button v-if="item.status === 'approved'" class="mini-btn" @click="handleRedemptionAction(item, 'deliver')">发放</button>
            <button v-if="['pending', 'approved'].includes(item.status)" class="mini-btn danger" @click="handleRedemptionAction(item, 'reject')">驳回</button>
          </view>
        </view>
      </view>
    </view>

    <view class="dialog-mask" v-if="catalogDialogVisible" @click="closeCatalogDialog">
      <view class="catalog-dialog" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">{{ editingCatalogId ? '编辑商品' : '新增商品' }}</text>
          <text class="dialog-close" @click="closeCatalogDialog">×</text>
        </view>
        <scroll-view scroll-y class="dialog-scroll">
          <view class="form-item">
            <text class="form-label">商品名称</text>
            <input class="form-input" v-model="catalogForm.rewardName" placeholder="例如 迷你节拍器" />
          </view>
          <view class="form-item">
            <text class="form-label">兑换积分</text>
            <input class="form-input" v-model="catalogForm.costPoints" type="number" />
          </view>
          <view class="form-item">
            <text class="form-label">商品类型</text>
            <picker :value="rewardTypeIndex" :range="rewardTypeOptions" @change="onRewardTypeChange">
              <view class="form-picker">
                <text>{{ rewardTypeOptions[rewardTypeIndex] }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">等级门槛</text>
            <picker :value="gateIndex" :range="gateOptions" @change="onGateChange">
              <view class="form-picker">
                <text>{{ gateOptions[gateIndex] }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-item" v-if="catalogForm.requiredGrowthGateType !== 'none'">
            <text class="form-label">门槛数量</text>
            <input class="form-input" v-model="catalogForm.requiredGrowthGateValue" type="number" />
          </view>
          <view class="form-item">
            <text class="form-label">库存</text>
            <input class="form-input" v-model="catalogForm.stockQty" placeholder="留空不限量" />
          </view>
          <view class="form-item">
            <text class="form-label">内部成本</text>
            <input class="form-input" v-model="catalogForm.actualCost" placeholder="可选" />
          </view>
          <view class="form-item">
            <text class="form-label">图片地址</text>
            <input class="form-input" v-model="catalogForm.coverImage" placeholder="可选" />
          </view>
          <view class="form-item">
            <text class="form-label">描述</text>
            <textarea class="form-textarea" v-model="catalogForm.description" />
          </view>
          <view class="form-item switch-row">
            <text class="form-label">上架</text>
            <switch :checked="catalogForm.enabled" @change="catalogForm.enabled = $event.detail.value" color="#5F724C" />
          </view>
        </scroll-view>
        <view class="dialog-footer">
          <button class="btn-cancel" :disabled="catalogSaving" @click="closeCatalogDialog">取消</button>
          <button class="btn-save" :loading="catalogSaving" :disabled="catalogSaving" @click="submitCatalog">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, post, put } from '@/utils/request'
import { formatGrowthLevel } from '@/utils/reward'

const activeTab = ref('redeem')
const students = ref([])
const studentIndex = ref(0)
const selectedStudentId = ref('')
const rewardItems = ref([])
const catalogItems = ref([])
const redemptions = ref([])
const studentRewardState = ref(null)
const loading = ref(false)
const redeemingCode = ref('')
const catalogDialogVisible = ref(false)
const catalogSaving = ref(false)
const editingCatalogId = ref('')
const redemptionStatusIndex = ref(0)

const rewardTypeOptions = ['普通', '高级']
const rewardTypeValues = ['normal', 'advanced']
const gateOptions = ['无门槛', '月亮', '太阳']
const gateValues = ['none', 'moon', 'sun']
const redemptionStatusOptions = ['全部', '待处理', '已通过', '已发放', '已驳回']
const redemptionStatusValues = ['', 'pending', 'approved', 'delivered', 'rejected']

const catalogForm = ref({
  rewardName: '',
  costPoints: '',
  rewardType: 'normal',
  requiredGrowthGateType: 'none',
  requiredGrowthGateValue: 0,
  stockQty: '',
  actualCost: '',
  coverImage: '',
  description: '',
  enabled: true
})

const rewardTypeIndex = computed(() => {
  const index = rewardTypeValues.indexOf(catalogForm.value.rewardType)
  return index >= 0 ? index : 0
})

const gateIndex = computed(() => {
  const index = gateValues.indexOf(catalogForm.value.requiredGrowthGateType)
  return index >= 0 ? index : 0
})

const selectedStudent = computed(() => {
  return students.value.find(item => item._id === selectedStudentId.value) || null
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  selectedStudentId.value = currentPage.options?.studentId || ''
  fetchStudents()
  fetchManageCatalogs()
})

onShow(() => {
  refreshActiveTab()
})

const switchTab = (tab) => {
  activeTab.value = tab
  refreshActiveTab()
}

const refreshActiveTab = () => {
  if (activeTab.value === 'redeem') {
    fetchRewardCatalogs()
  } else if (activeTab.value === 'catalog') {
    fetchManageCatalogs()
  } else if (activeTab.value === 'records') {
    fetchRedemptions()
  }
}

const fetchStudents = async () => {
  try {
    const res = await get('/students')
    students.value = res.data || []

    if (!selectedStudentId.value && students.value.length > 0) {
      selectedStudentId.value = students.value[0]._id
    }

    const index = students.value.findIndex(item => item._id === selectedStudentId.value)
    studentIndex.value = index >= 0 ? index : 0

    await fetchRewardCatalogs()
  } catch (error) {
    uni.showToast({ title: '获取学生失败', icon: 'none' })
  }
}

const fetchRewardCatalogs = async () => {
  loading.value = true
  try {
    const query = selectedStudentId.value ? { studentId: selectedStudentId.value } : {}
    const res = await get('/reward-catalogs', query)
    rewardItems.value = res.data?.items || []
    studentRewardState.value = res.data?.studentRewardState || null
  } catch (error) {
    uni.showToast({ title: error.message || '获取商城失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const fetchManageCatalogs = async () => {
  try {
    const res = await get('/reward-catalogs', { manage: 1 })
    catalogItems.value = res.data?.items || []
  } catch (error) {
    uni.showToast({ title: error.message || '获取商品失败', icon: 'none' })
  }
}

const fetchRedemptions = async () => {
  try {
    const status = redemptionStatusValues[redemptionStatusIndex.value]
    const query = status ? { status } : {}
    const res = await get('/reward-redemptions', query)
    redemptions.value = res.data || []
  } catch (error) {
    uni.showToast({ title: error.message || '获取记录失败', icon: 'none' })
  }
}

const onStudentChange = async (event) => {
  studentIndex.value = Number(event.detail.value) || 0
  selectedStudentId.value = students.value[studentIndex.value]?._id || ''
  await fetchRewardCatalogs()
}

const onRewardTypeChange = (event) => {
  catalogForm.value.rewardType = rewardTypeValues[Number(event.detail.value) || 0]
}

const onGateChange = (event) => {
  catalogForm.value.requiredGrowthGateType = gateValues[Number(event.detail.value) || 0]
}

const onRedemptionStatusChange = async (event) => {
  redemptionStatusIndex.value = Number(event.detail.value) || 0
  await fetchRedemptions()
}

const getGateText = (item) => {
  const gateType = item.requiredGrowthGateType
  const gateValue = Number(item.requiredGrowthGateValue) || 0

  if (!gateType || gateType === 'none' || gateValue <= 0) {
    return '无等级门槛'
  }

  if (gateType === 'sun') {
    return `需${gateValue}日`
  }

  if (gateType === 'moon') {
    return `需${gateValue}月`
  }

  return '有等级门槛'
}

const getStockText = (item) => {
  if (item.stockQty === undefined || item.stockQty === null) {
    return '不限库存'
  }

  return `库存${item.stockQty}`
}

const getBlockedReasons = (item) => {
  const reasons = []

  if (!item.stockAvailable) reasons.push('库存不足')
  if (!item.gateSatisfied) reasons.push('成长等级未达标')
  if (!item.pointBalanceEnough) reasons.push('积分不足')

  return reasons
}

const getStatusText = (status) => {
  const map = {
    pending: '待处理',
    approved: '已通过',
    delivered: '已发放',
    rejected: '已驳回',
    cancelled: '已取消'
  }
  return map[status] || status || ''
}

const formatDateTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const confirmRedeem = (item) => {
  if (!selectedStudentId.value) {
    uni.showToast({ title: '请先选择学生', icon: 'none' })
    return
  }

  uni.showModal({
    title: '确认兑换',
    content: `为${selectedStudent.value?.name || '学生'}兑换“${item.rewardName}”，消耗${item.costPoints || 0}积分。`,
    confirmColor: '#5F724C',
    success: async (res) => {
      if (!res.confirm) return
      await redeemReward(item)
    }
  })
}

const redeemReward = async (item) => {
  redeemingCode.value = item.rewardCode
  try {
    await post('/reward-redemptions', {
      studentId: selectedStudentId.value,
      rewardCode: item.rewardCode
    })
    uni.showToast({ title: '兑换成功', icon: 'success' })
    await Promise.all([fetchRewardCatalogs(), fetchRedemptions()])
  } catch (error) {
    uni.showToast({ title: error.message || '兑换失败', icon: 'none' })
  } finally {
    redeemingCode.value = ''
  }
}

const resetCatalogForm = () => {
  editingCatalogId.value = ''
  catalogForm.value = {
    rewardName: '',
    costPoints: '',
    rewardType: 'normal',
    requiredGrowthGateType: 'none',
    requiredGrowthGateValue: 0,
    stockQty: '',
    actualCost: '',
    coverImage: '',
    description: '',
    enabled: true
  }
}

const openCatalogDialog = (item = null) => {
  if (!item) {
    resetCatalogForm()
  } else {
    editingCatalogId.value = item._id
    catalogForm.value = {
      rewardName: item.rewardName || '',
      costPoints: item.costPoints ?? '',
      rewardType: item.rewardType || 'normal',
      requiredGrowthGateType: item.requiredGrowthGateType || 'none',
      requiredGrowthGateValue: item.requiredGrowthGateValue || 0,
      stockQty: item.stockQty ?? '',
      actualCost: item.actualCost ?? '',
      coverImage: item.coverImage || '',
      description: item.description || '',
      enabled: item.enabled !== false
    }
  }

  catalogDialogVisible.value = true
}

const closeCatalogDialog = () => {
  if (catalogSaving.value) return
  catalogDialogVisible.value = false
}

const buildCatalogPayload = () => ({
  rewardName: catalogForm.value.rewardName.trim(),
  costPoints: Number(catalogForm.value.costPoints),
  rewardType: catalogForm.value.rewardType,
  requiredGrowthGateType: catalogForm.value.requiredGrowthGateType,
  requiredGrowthGateValue: Number(catalogForm.value.requiredGrowthGateValue || 0),
  stockQty: catalogForm.value.stockQty === '' ? null : Number(catalogForm.value.stockQty),
  actualCost: catalogForm.value.actualCost === '' ? null : Number(catalogForm.value.actualCost),
  coverImage: catalogForm.value.coverImage.trim(),
  description: catalogForm.value.description.trim(),
  enabled: catalogForm.value.enabled
})

const submitCatalog = async () => {
  const payload = buildCatalogPayload()

  if (!payload.rewardName) {
    uni.showToast({ title: '请输入商品名称', icon: 'none' })
    return
  }

  if (!Number.isFinite(payload.costPoints) || payload.costPoints < 0) {
    uni.showToast({ title: '请输入兑换积分', icon: 'none' })
    return
  }

  catalogSaving.value = true
  try {
    if (editingCatalogId.value) {
      await put(`/reward-catalogs/${editingCatalogId.value}`, payload)
    } else {
      await post('/reward-catalogs', payload)
    }
    uni.showToast({ title: '保存成功', icon: 'success' })
    catalogDialogVisible.value = false
    await Promise.all([fetchManageCatalogs(), fetchRewardCatalogs()])
  } catch (error) {
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  } finally {
    catalogSaving.value = false
  }
}

const toggleCatalogEnabled = async (item) => {
  try {
    await put(`/reward-catalogs/${item._id}`, {
      enabled: !item.enabled
    })
    uni.showToast({ title: item.enabled ? '已下架' : '已上架', icon: 'success' })
    await Promise.all([fetchManageCatalogs(), fetchRewardCatalogs()])
  } catch (error) {
    uni.showToast({ title: error.message || '操作失败', icon: 'none' })
  }
}

const handleRedemptionAction = (item, action) => {
  const actionText = {
    approve: '通过',
    deliver: '发放',
    reject: '驳回'
  }[action]

  uni.showModal({
    title: `${actionText}兑换`,
    content: `${item.studentName || '学生'} · ${item.rewardSnapshot?.rewardName || item.rewardCode}`,
    confirmColor: action === 'reject' ? '#A0523E' : '#5F724C',
    success: async (res) => {
      if (!res.confirm) return
      await submitRedemptionAction(item, action)
    }
  })
}

const submitRedemptionAction = async (item, action) => {
  try {
    const payload = action === 'reject' ? { reason: '老师驳回兑换' } : {}
    await post(`/reward-redemptions/${item._id}/${action}`, payload)
    uni.showToast({ title: '处理成功', icon: 'success' })
    await Promise.all([fetchRedemptions(), fetchRewardCatalogs()])
  } catch (error) {
    uni.showToast({ title: error.message || '处理失败', icon: 'none' })
  }
}
</script>

<style scoped>
.mall-container {
  min-height: 100vh;
  padding: 20rpx;
  background-color: #F7EFE3;
  box-sizing: border-box;
}

.tabs {
  display: flex;
  margin-bottom: 20rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background-color: #FFFDF8;
}

.tab-item {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  text-align: center;
  font-size: 26rpx;
  color: #8B8176;
}

.tab-item.active {
  color: #5F724C;
  font-weight: bold;
  background-color: #E7EFE3;
}

.student-panel,
.manage-header,
.catalog-item,
.redemption-item,
.reward-item {
  background-color: #FFFDF8;
  border-radius: 16rpx;
}

.student-panel,
.manage-header {
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.student-picker-row {
  margin-bottom: 18rpx;
}

.panel-label,
.form-label {
  display: block;
  font-size: 24rpx;
  color: #8B8176;
  margin-bottom: 10rpx;
}

.student-picker,
.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 72rpx;
  padding: 0 20rpx;
  border: 2rpx solid #E7D8C7;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #3F352B;
  box-sizing: border-box;
}

.picker-arrow {
  font-size: 20rpx;
  color: #8B8176;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.summary-item {
  min-height: 108rpx;
  padding: 18rpx;
  border-radius: 12rpx;
  background-color: #FBF6EE;
  box-sizing: border-box;
}

.summary-value {
  display: block;
  font-size: 30rpx;
  line-height: 38rpx;
  font-weight: bold;
  color: #3F352B;
  margin-bottom: 6rpx;
}

.summary-label {
  font-size: 22rpx;
  color: #8B8176;
}

.empty-tip {
  padding: 100rpx 0;
  text-align: center;
  color: #8B8176;
  font-size: 28rpx;
}

.reward-list,
.catalog-list,
.redemption-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.reward-item,
.catalog-item,
.redemption-item {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 22rpx;
}

.reward-cover {
  width: 110rpx;
  height: 110rpx;
  border-radius: 14rpx;
  overflow: hidden;
  background-color: #E7EFE3;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.reward-image {
  width: 100%;
  height: 100%;
}

.reward-placeholder {
  font-size: 40rpx;
  color: #5F724C;
  font-weight: bold;
}

.reward-info,
.catalog-main {
  flex: 1;
  min-width: 0;
}

.reward-title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 6rpx;
}

.reward-name {
  font-size: 30rpx;
  line-height: 38rpx;
  font-weight: bold;
  color: #3F352B;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reward-type,
.status-chip {
  padding: 3rpx 10rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
  color: #5F724C;
  background-color: #E7EFE3;
  flex-shrink: 0;
}

.reward-type.advanced,
.status-chip.approved {
  color: #A26B39;
  background-color: #F5ECD9;
}

.status-chip.disabled,
.status-chip.rejected {
  color: #A0523E;
  background-color: #F8E4DD;
}

.status-chip.delivered {
  color: #5F724C;
  background-color: #E7EFE3;
}

.reward-desc,
.cost-text {
  display: block;
  font-size: 23rpx;
  line-height: 32rpx;
  color: #6F6254;
  margin-bottom: 8rpx;
}

.reward-meta,
.blocked-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.point-cost,
.gate-text,
.stock-text,
.blocked-reason {
  padding: 3rpx 10rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
  background-color: #FBF6EE;
  color: #8B8176;
}

.point-cost {
  color: #5F724C;
  font-weight: bold;
}

.blocked-reasons {
  margin-top: 8rpx;
}

.blocked-reason {
  color: #A0523E;
  background-color: #F8E4DD;
}

.redeem-btn {
  width: 108rpx;
  height: 64rpx;
  line-height: 64rpx;
  padding: 0;
  border-radius: 8rpx;
  background-color: #5F724C;
  color: #FFFDF8;
  border: none;
  font-size: 24rpx;
  flex-shrink: 0;
}

.redeem-btn.disabled {
  background-color: #C4AA84;
}

.manage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.manage-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #3F352B;
}

.add-catalog-btn {
  width: 120rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 8rpx;
  background-color: #5F724C;
  color: #FFFDF8;
  border: none;
  font-size: 24rpx;
}

.catalog-actions {
  width: 104rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  flex-shrink: 0;
}

.mini-btn {
  width: 104rpx;
  height: 54rpx;
  line-height: 54rpx;
  padding: 0;
  border-radius: 8rpx;
  background-color: #5F724C;
  color: #FFFDF8;
  border: none;
  font-size: 22rpx;
}

.mini-btn.ghost {
  background-color: #FFFDF8;
  color: #A26B39;
  border: 2rpx solid #A26B39;
}

.mini-btn.danger {
  background-color: #A0523E;
}

.record-filter {
  margin-bottom: 20rpx;
}

.dialog-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(63, 53, 43, 0.42);
}

.catalog-dialog {
  width: 88%;
  max-height: 90vh;
  background-color: #FFFDF8;
  border-radius: 18rpx;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 26rpx;
  border-bottom: 1rpx solid #E7D8C7;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #3F352B;
}

.dialog-close {
  font-size: 38rpx;
  color: #8B8176;
}

.dialog-scroll {
  max-height: 62vh;
  padding: 26rpx;
  box-sizing: border-box;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-input {
  width: 100%;
  height: 76rpx;
  padding: 0 18rpx;
  border: 2rpx solid #E7D8C7;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  height: 150rpx;
  padding: 18rpx;
  border: 2rpx solid #E7D8C7;
  border-radius: 8rpx;
  font-size: 26rpx;
  line-height: 38rpx;
  box-sizing: border-box;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.switch-row .form-label {
  margin-bottom: 0;
}

.dialog-footer {
  display: flex;
  gap: 18rpx;
  padding: 20rpx 26rpx 26rpx;
  border-top: 1rpx solid #E7D8C7;
}

.btn-cancel,
.btn-save {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.btn-cancel {
  background-color: #FFFDF8;
  color: #8B8176;
  border: 2rpx solid #E7D8C7;
}

.btn-save {
  background-color: #5F724C;
  color: #FFFDF8;
  border: none;
}
</style>
