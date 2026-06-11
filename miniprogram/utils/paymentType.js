export const PAYMENT_TYPE_OPTIONS = [
  { label: '预付费', value: 'prepaid' },
  { label: '单次付费', value: 'payPerLesson' },
  { label: '免费', value: 'free' }
]

export const getPaymentTypeText = (paymentType) => {
  const option = PAYMENT_TYPE_OPTIONS.find(item => item.value === paymentType)
  return option?.label || '预付费'
}

export const getPaymentTypeIndex = (paymentType) => {
  const index = PAYMENT_TYPE_OPTIONS.findIndex(item => item.value === paymentType)
  return index >= 0 ? index : 0
}

export const getPaymentTypeValue = (index) => {
  return PAYMENT_TYPE_OPTIONS[Number(index)]?.value || 'prepaid'
}

export const isFreeStudent = (paymentType) => {
  return paymentType === 'free'
}
